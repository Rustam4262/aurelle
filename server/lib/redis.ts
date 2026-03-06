/**
 * Redis client singleton.
 *
 * Rules:
 *  - Lazy: created only when REDIS_URL is set
 *  - Errors never crash the process — logged and _connected set to false
 *  - Automatic reconnection handled by the redis v4 client
 *  - Graceful shutdown: call disconnectRedis() before process.exit
 */

import { createClient } from "redis";
import { logger } from "./logger";
import { getRedisConfig } from "../config/redis";

type RedisClientType = ReturnType<typeof createClient>;

let _client: RedisClientType | null = null;
let _connected = false;

/**
 * Initialize the Redis client and connect.
 * Safe to call multiple times — no-op after first call.
 * Resolves even if connection fails; use isRedisConnected() to check state.
 */
export async function initializeRedis(): Promise<void> {
  if (_client !== null) return; // already initialized

  const cfg = getRedisConfig();
  if (!cfg) {
    logger.info("Redis not configured (REDIS_URL unset) — skipping", { source: "redis" });
    return;
  }

  _client = createClient({ url: cfg.url });

  _client.on("error", (err: Error) => {
    logger.error("Redis error", err, { source: "redis" });
    _connected = false;
  });

  _client.on("reconnecting", () => {
    logger.info("Redis reconnecting...", { source: "redis" });
  });

  _client.on("ready", () => {
    _connected = true;
    logger.info("Redis ready", { source: "redis" });
  });

  try {
    await _client.connect();
    _connected = true;
    logger.info(`Redis connected (${cfg.url.split("@").pop()})`, { source: "redis" });
  } catch (err) {
    logger.error("Redis initial connection failed — falling back to PgSession", err as Error, {
      source: "redis",
    });
    // Don't null out _client — redis v4 will keep retrying automatically.
    // But mark as not connected so getRedisClient() returns null for store creation.
    _connected = false;
    _client = null; // force pg fallback in setupAuth
  }
}

/** Returns the connected client, or null if Redis is unavailable. */
export function getRedisClient(): RedisClientType | null {
  return _connected ? _client : null;
}

export function isRedisConnected(): boolean {
  return _connected && _client !== null;
}

/** Close the connection (call on process shutdown). */
export async function disconnectRedis(): Promise<void> {
  if (_client) {
    try {
      await _client.quit();
      logger.info("Redis disconnected", { source: "redis" });
    } catch {
      // ignore errors during shutdown
    }
    _client = null;
    _connected = false;
  }
}
