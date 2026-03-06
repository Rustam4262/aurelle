import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { randomBytes } from "crypto";
import { createClient } from "redis";
import { getRedisClient } from "./redis";
import { getRedisConfig } from "../config/redis";
import { logger } from "./logger";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthedWebSocket extends WebSocket {
  userId?: string;
  rooms: Set<string>;
}

interface WsToken {
  userId: string;
  expiresAt: number;
}

interface BroadcastMessage {
  room: string;
  event: string;
  data: unknown;
}

// ─── State ───────────────────────────────────────────────────────────────────

/** In-memory token fallback (used when Redis is not configured) */
const wsTokens = new Map<string, WsToken>();

/** Room → set of connected sockets (local to this worker) */
const rooms = new Map<string, Set<AuthedWebSocket>>();

let wss: WebSocketServer | null = null;

/**
 * Dedicated subscriber client for Redis pub/sub.
 * A subscribed connection cannot issue regular commands, so it must be separate
 * from the shared getRedisClient() connection.
 */
let wsSubscriber: ReturnType<typeof createClient> | null = null;

// ─── Token management ────────────────────────────────────────────────────────

const WS_TOKEN_PREFIX = "aurelle:wstoken:";
const WS_TOKEN_TTL_SECS = 31;

/**
 * Generate a one-time WS auth token for a user (30-second TTL).
 *
 * Stored in Redis when available so that any cluster worker can validate the
 * token regardless of which worker handled the HTTP token-request.
 * Falls back to in-memory Map when Redis is not configured.
 */
export async function createWsToken(userId: string): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const client = getRedisClient();

  if (client) {
    await client.set(`${WS_TOKEN_PREFIX}${token}`, userId, { EX: WS_TOKEN_TTL_SECS });
  } else {
    wsTokens.set(token, { userId, expiresAt: Date.now() + 30_000 });
    setTimeout(() => wsTokens.delete(token), 31_000);
  }

  return token;
}

async function consumeWsToken(token: string): Promise<string | null> {
  const client = getRedisClient();

  if (client) {
    // getDel is atomic: get + delete in one round-trip (one-time use guaranteed)
    const userId = await client.getDel(`${WS_TOKEN_PREFIX}${token}`);
    return userId ?? null;
  }

  // In-memory fallback
  const entry = wsTokens.get(token);
  if (!entry) return null;
  wsTokens.delete(token); // one-time use
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

// ─── Room helpers ─────────────────────────────────────────────────────────────

function joinRoom(ws: AuthedWebSocket, room: string) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  rooms.get(room)!.add(ws);
  ws.rooms.add(room);
}

function leaveAllRooms(ws: AuthedWebSocket) {
  for (const room of Array.from(ws.rooms)) {
    rooms.get(room)?.delete(ws);
    if (rooms.get(room)?.size === 0) rooms.delete(room);
  }
  ws.rooms.clear();
}

function send(ws: WebSocket, event: string, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
  }
}

// ─── Local broadcast (this worker only) ──────────────────────────────────────

function broadcastLocal(room: string, event: string, data: unknown): void {
  const members = rooms.get(room);
  if (!members) return;
  for (const ws of Array.from(members)) send(ws, event, data);
}

// ─── Redis pub/sub (cross-worker) ─────────────────────────────────────────────

const WS_BROADCAST_CHANNEL = "aurelle:ws:broadcast";

async function setupRedisPubSub(): Promise<void> {
  const config = getRedisConfig();
  if (!config) return; // Redis not configured — broadcasts are worker-local only

  try {
    // Subscriber needs its own dedicated connection (subscribe mode is exclusive)
    wsSubscriber = createClient({ url: config.url });

    wsSubscriber.on("error", (err) => {
      logger.warn("WS Redis subscriber error", {
        source: "websocket",
        meta: { error: String(err) },
      });
    });

    await wsSubscriber.connect();

    await wsSubscriber.subscribe(WS_BROADCAST_CHANNEL, (message) => {
      try {
        const { room, event, data } = JSON.parse(message) as BroadcastMessage;
        broadcastLocal(room, event, data);
      } catch {
        // Ignore malformed pub/sub messages
      }
    });

    logger.info("WS Redis pub/sub subscriber connected", { source: "websocket" });
  } catch (err) {
    logger.warn("WS Redis pub/sub unavailable — broadcasts are worker-local", {
      source: "websocket",
      meta: { error: String(err) },
    });
    wsSubscriber = null;
  }
}

// ─── Public broadcast API ─────────────────────────────────────────────────────

/**
 * Broadcast an event to all sockets in a room.
 *
 * With Redis: publishes to the aurelle:ws:broadcast channel — every cluster
 * worker receives the message and delivers it to its local room members.
 * Without Redis: delivers only to sockets connected to this worker.
 */
export function broadcast(room: string, event: string, data: unknown): void {
  const client = getRedisClient();

  if (client) {
    const msg = JSON.stringify({ room, event, data });
    client.publish(WS_BROADCAST_CHANNEL, msg).catch((err) => {
      logger.warn("WS broadcast publish failed — delivering locally", {
        source: "websocket",
        meta: { room, error: String(err) },
      });
      broadcastLocal(room, event, data);
    });
  } else {
    broadcastLocal(room, event, data);
  }
}

/** Broadcast an event to the personal room of a specific user. */
export function broadcastToUser(userId: string, event: string, data: unknown): void {
  broadcast(`user_${userId}`, event, data);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export async function setupWebSocket(httpServer: HttpServer): Promise<void> {
  // Set up Redis pub/sub before accepting WS connections
  await setupRedisPubSub();

  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", async (rawWs, req) => {
    const ws = rawWs as AuthedWebSocket;
    ws.rooms = new Set();

    // Extract token from query string
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    let userId: string | null;
    try {
      userId = await consumeWsToken(token);
    } catch (err) {
      logger.error("WS token validation error", err as Error, { source: "websocket" });
      ws.close(4001, "Token validation failed");
      return;
    }

    if (!userId) {
      ws.close(4001, "Invalid or expired token");
      return;
    }

    ws.userId = userId;

    // Every authenticated user joins their personal room
    joinRoom(ws, `user_${userId}`);

    logger.debug("WS client connected", { meta: { userId } });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { event?: string; room?: string };
        // Client can join named rooms by sending { event: "join", room: "salon_123" }
        if (msg.event === "join" && msg.room) {
          // Only allow joining salon_ and admin rooms
          if (/^(salon_|admin)/.test(msg.room)) {
            joinRoom(ws, msg.room);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      leaveAllRooms(ws);
      logger.debug("WS client disconnected", { meta: { userId } });
    });

    ws.on("error", (err) => {
      logger.error("WS error", err, { source: "websocket", meta: { userId } });
    });

    // Confirm connection
    send(ws, "connected", { userId });
  });

  logger.info("WebSocket server initialized at /ws", { source: "websocket" });
}
