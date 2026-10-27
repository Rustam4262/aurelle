import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { randomBytes } from "crypto";
import { createClient } from "redis";
import { getRedisClient } from "./redis";
import { getRedisConfig } from "../config/redis";
import { logger } from "./logger";
import { mayJoinRoom } from "./ws-room-policy";
import { roomAccess } from "./ws-room-access";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthedWebSocket extends WebSocket {
  userId?: string;
  authVersion?: number;
  rooms: Set<string>;
}

interface WsToken {
  userId: string;
  authVersion: number;
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
  const [account] = await db
    .select({ authVersion: users.authVersion, blocked: users.isBlocked })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!account || account.blocked) throw new Error("Account unavailable");
  const identity: WsToken = {
    userId,
    authVersion: account.authVersion,
    expiresAt: Date.now() + 30_000,
  };
  const token = randomBytes(24).toString("hex");
  const client = getRedisClient();

  if (client) {
    await client.set(`${WS_TOKEN_PREFIX}${token}`, JSON.stringify(identity), {
      EX: WS_TOKEN_TTL_SECS,
    });
  } else {
    wsTokens.set(token, identity);
    setTimeout(() => wsTokens.delete(token), 31_000);
  }

  return token;
}

async function consumeWsToken(token: string): Promise<WsToken | null> {
  const client = getRedisClient();

  if (client) {
    // getDel is atomic: get + delete in one round-trip (one-time use guaranteed)
    const raw = await client.getDel(`${WS_TOKEN_PREFIX}${token}`);
    if (!raw) return null;
    try {
      const identity = JSON.parse(raw) as WsToken;
      if (
        !identity.userId ||
        !Number.isInteger(identity.authVersion) ||
        !Number.isFinite(identity.expiresAt) ||
        Date.now() > identity.expiresAt
      )
        return null;
      return identity;
    } catch {
      return null;
    }
  }

  // In-memory fallback
  const entry = wsTokens.get(token);
  if (!entry) return null;
  wsTokens.delete(token); // one-time use
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

async function validSocketIdentity(userId: string, authVersion: number | undefined) {
  const [account] = await db
    .select({ version: users.authVersion, blocked: users.isBlocked })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return !!account && !account.blocked && account.version === authVersion;
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
  for (const ws of Array.from(members)) {
    void (async () => {
      if (!(await validSocketIdentity(ws.userId ?? "", ws.authVersion))) {
        ws.close(4001, "Session revoked");
        return;
      }
      if (room === "admin" || room.startsWith("salon_")) {
        // Recheck at delivery, so revoking a role/ownership also affects sockets
        // that were already connected.
        void mayJoinRoom(ws.userId ?? "", room, roomAccess)
          .then((allowed) => {
            if (allowed && ws.rooms.has(room)) send(ws, event, data);
            else {
              members.delete(ws);
              ws.rooms.delete(room);
            }
          })
          .catch(() => {
            members.delete(ws);
            ws.rooms.delete(room);
          });
      } else {
        send(ws, event, data);
      }
    })().catch(() => ws.close(4001, "Authorization unavailable"));
  }
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

  const socketServer = new WebSocketServer({ noServer: true, path: "/ws" });
  wss = socketServer;

  // Leave other upgrade paths to their handlers, including Vite's HMR server.
  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url?.split("?")[0] !== "/ws") return;
    socketServer.handleUpgrade(req, socket, head, (ws) => {
      socketServer.emit("connection", ws, req);
    });
  });

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

    let identity: WsToken | null;
    try {
      identity = await consumeWsToken(token);
      if (identity && !(await validSocketIdentity(identity.userId, identity.authVersion)))
        identity = null;
    } catch (err) {
      logger.error("WS token validation error", err as Error, { source: "websocket" });
      ws.close(4001, "Token validation failed");
      return;
    }

    if (!identity) {
      ws.close(4001, "Invalid or expired token");
      return;
    }

    const userId = identity.userId;
    ws.userId = userId;
    ws.authVersion = identity.authVersion;

    // Every authenticated user joins their personal room
    joinRoom(ws, `user_${userId}`);

    logger.debug("WS client connected", { meta: { userId } });

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { event?: string; room?: string };
        if (msg.event === "join" && msg.room) {
          if (
            (await mayJoinRoom(userId, msg.room, roomAccess)) &&
            ws.readyState === WebSocket.OPEN
          ) {
            joinRoom(ws, msg.room);
          }
        }
      } catch {
        // Malformed input or failed permission lookup must never grant access.
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
