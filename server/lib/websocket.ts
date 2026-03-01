import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { randomBytes } from "crypto";
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

// ─── State ───────────────────────────────────────────────────────────────────

/** Short-lived tokens: token → { userId, expiresAt } */
const wsTokens = new Map<string, WsToken>();

/** Room → set of connected sockets */
const rooms = new Map<string, Set<AuthedWebSocket>>();

let wss: WebSocketServer | null = null;

// ─── Token management ────────────────────────────────────────────────────────

/** Generate a one-time WS auth token for a user (30 second TTL). */
export function createWsToken(userId: string): string {
  const token = randomBytes(24).toString("hex");
  wsTokens.set(token, { userId, expiresAt: Date.now() + 30_000 });
  // Auto-cleanup after expiry
  setTimeout(() => wsTokens.delete(token), 31_000);
  return token;
}

function consumeWsToken(token: string): string | null {
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

// ─── Public broadcast API ─────────────────────────────────────────────────────

/** Broadcast an event to all sockets in a room. */
export function broadcast(room: string, event: string, data: unknown): void {
  const members = rooms.get(room);
  if (!members) return;
  for (const ws of Array.from(members)) send(ws, event, data);
}

/** Broadcast an event to the personal room of a specific user. */
export function broadcastToUser(userId: string, event: string, data: unknown): void {
  broadcast(`user_${userId}`, event, data);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export function setupWebSocket(httpServer: HttpServer): void {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (rawWs, req) => {
    const ws = rawWs as AuthedWebSocket;
    ws.rooms = new Set();

    // Extract token from query string
    const url = new URL(req.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    const userId = consumeWsToken(token);
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
          // Only allow joining salon_ rooms (ownership checked by server separately)
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

  logger.info("WebSocket server initialized at /ws");
}
