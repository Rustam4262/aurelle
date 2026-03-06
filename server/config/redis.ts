/**
 * Redis configuration — single source of truth.
 *
 * All Redis env vars are read and validated here.
 * When REDIS_URL is absent, Redis is considered not configured and the session
 * store falls back to PostgreSQL (connect-pg-simple).
 */

export interface RedisConfig {
  /** Full Redis connection URL, e.g. redis://localhost:6379 or rediss://... for TLS */
  url: string;
  /** Prefix for all keys written by this app. Default: "aurelle:" */
  keyPrefix: string;
  /** Session TTL in seconds. Matches the express-session cookie maxAge (30 days). */
  sessionTtlSeconds: number;
}

export interface RedisConfigStatus {
  configured: boolean;
  /** Host extracted from the URL (no password) */
  host?: string;
  keyPrefix: string;
  sessionTtlSeconds: number;
  /** If configured=false, the human-readable reason */
  reason?: string;
}

export function getRedisConfig(): RedisConfig | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  return {
    url,
    keyPrefix: process.env.REDIS_KEY_PREFIX || "aurelle:",
    sessionTtlSeconds: 30 * 24 * 60 * 60, // 30 days — same as session cookie maxAge
  };
}

export function getRedisConfigStatus(): RedisConfigStatus {
  const cfg = getRedisConfig();
  const keyPrefix = process.env.REDIS_KEY_PREFIX || "aurelle:";
  const sessionTtlSeconds = 30 * 24 * 60 * 60;

  if (!cfg) {
    return {
      configured: false,
      keyPrefix,
      sessionTtlSeconds,
      reason: "REDIS_URL is not set — session store uses PostgreSQL",
    };
  }

  // Extract host from URL without exposing password
  let host: string | undefined;
  try {
    const u = new URL(cfg.url);
    host = u.hostname + (u.port ? `:${u.port}` : "");
  } catch {
    host = "<invalid url>";
  }

  return { configured: true, host, keyPrefix: cfg.keyPrefix, sessionTtlSeconds };
}
