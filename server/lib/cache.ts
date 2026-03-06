/**
 * Server-side cache — Redis when available, in-memory fallback otherwise.
 *
 * Rules:
 *  - withCache never throws: fetcher errors propagate; Redis errors are swallowed
 *  - In-memory store is keyed by full Redis key — behaviour is identical
 *  - invalidateCache supports prefix-wildcard deletion (prefix=true)
 *  - All keys are namespaced under KEY_PREFIX to avoid collisions with sessions/rate-limits
 */

import { getRedisClient } from "./redis";
import { logger } from "./logger";

const KEY_PREFIX = "aurelle:cache:";

// ─── In-memory fallback store ─────────────────────────────────────────────────

interface MemEntry {
  data: string; // JSON-serialised
  expiresAt: number; // Date.now() + ttlMs
}

const MEM: Map<string, MemEntry> = new Map();

function memGet(fullKey: string): string | null {
  const entry = MEM.get(fullKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    MEM.delete(fullKey);
    return null;
  }
  return entry.data;
}

function memSet(fullKey: string, data: string, ttlSecs: number): void {
  MEM.set(fullKey, { data, expiresAt: Date.now() + ttlSecs * 1000 });
}

function memDel(fullKey: string): void {
  MEM.delete(fullKey);
}

function memDelByPrefix(prefix: string): void {
  MEM.forEach((_, k) => {
    if (k.startsWith(prefix)) MEM.delete(k);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch-with-cache.
 *
 * @param key    Short cache key (e.g. "dash:stats:30d"). Will be prefixed with aurelle:cache:.
 * @param ttl    Time-to-live in seconds.
 * @param fetcher Function that performs the expensive operation and returns the data.
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const fullKey = KEY_PREFIX + key;
  const client = getRedisClient();

  if (client) {
    // ── Redis path ────────────────────────────────────────────────────────────
    try {
      const cached = await client.get(fullKey);
      if (cached !== null) {
        logger.debug(`cache_hit redis key=${key}`, { source: "cache" });
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      logger.warn("Cache GET failed — bypassing cache", {
        source: "cache",
        meta: { key, error: String(err) },
      });
    }

    // Cache miss — run fetcher
    const data = await fetcher();

    try {
      await client.set(fullKey, JSON.stringify(data), { EX: ttl });
    } catch (err) {
      logger.warn("Cache SET failed — result not cached", {
        source: "cache",
        meta: { key, error: String(err) },
      });
    }

    return data;
  }

  // ── In-memory path (no Redis) ─────────────────────────────────────────────
  const cached = memGet(fullKey);
  if (cached !== null) {
    logger.debug(`cache_hit mem key=${key}`, { source: "cache" });
    return JSON.parse(cached) as T;
  }

  const data = await fetcher();
  memSet(fullKey, JSON.stringify(data), ttl);
  return data;
}

/**
 * Invalidate cache entries.
 *
 * @param key    The short cache key, or a key prefix when prefix=true.
 * @param prefix When true, deletes all keys whose full Redis key starts with KEY_PREFIX+key.
 *               E.g. invalidateCache("dash:", true) removes every "aurelle:cache:dash:*" key.
 */
export async function invalidateCache(key: string, prefix = false): Promise<void> {
  const fullKey = KEY_PREFIX + key;
  const client = getRedisClient();

  if (client) {
    if (prefix) {
      // SCAN-based prefix deletion (non-blocking, paginates via cursor)
      const pattern = fullKey + "*";
      const toDelete: string[] = [];
      let cursor = 0;
      try {
        do {
          const result = await client.scan(cursor, { MATCH: pattern, COUNT: 200 });
          cursor = result.cursor;
          toDelete.push(...result.keys);
        } while (cursor !== 0);

        if (toDelete.length > 0) {
          await client.del(toDelete);
          logger.debug(`cache_invalidated pattern=${pattern} count=${toDelete.length}`, {
            source: "cache",
          });
        }
      } catch (err) {
        logger.warn("Cache invalidation failed", {
          source: "cache",
          meta: { pattern, error: String(err) },
        });
      }
    } else {
      try {
        await client.del(fullKey);
      } catch (err) {
        logger.warn("Cache DEL failed", { source: "cache", meta: { key, error: String(err) } });
      }
    }
    return;
  }

  // In-memory path
  if (prefix) {
    memDelByPrefix(fullKey);
  } else {
    memDel(fullKey);
  }
}

/**
 * Convenience: invalidate the entire dashboard cache subtree.
 * Call this fire-and-forget from any mutation that affects dashboard data.
 *
 * Usage: invalidateDashboardCache().catch(() => {});
 */
export function invalidateDashboardCache(): Promise<void> {
  return invalidateCache("dash:", true);
}
