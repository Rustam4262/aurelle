import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../lib/redis";
import { logger } from "../lib/logger";

// ─── Redis store factory ───────────────────────────────────────────────────────
//
// Returns a RedisStore when Redis is configured (REDIS_URL set) so that all
// PM2 workers share the same counters. Falls back to undefined (in-memory) when
// Redis is absent — safe for single-process deployments.
//
// sendCommand is evaluated lazily on every request, so it picks up the Redis
// client even if initializeRedis() runs after the limiters are constructed.
//
// Key format: aurelle:rl:<name>:<ip>
//
function makeStore(name: string): Options["store"] | undefined {
  if (!process.env.REDIS_URL) return undefined; // no Redis → in-memory (single process only)

  return new RedisStore({
    sendCommand: (...args: string[]) => {
      const client = getRedisClient();
      if (!client) {
        // Redis configured but not yet connected (startup race) or disconnected.
        // Throw so express-rate-limit falls back to its default behaviour.
        throw new Error(`Rate-limit Redis not ready (limiter: ${name})`);
      }
      // redis v4 sendCommand returns Promise<unknown>; cast is safe for INCR/PEXPIRE
      return client.sendCommand(args) as Promise<number>;
    },
    prefix: `aurelle:rl:${name}:`,
  });
}

// ─── Limiters ─────────────────────────────────────────────────────────────────

// Login: 10 failed attempts/min per IP
// skipSuccessfulRequests: true — only counts failed logins (4xx/5xx responses)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: makeStore("login"),
});

// Password reset / resend-verification: 5 requests/min per IP
export const resetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many reset attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("reset"),
});

// Registration: 5 accounts/min per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many registration attempts. Please try again in 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("register"),
});

// OAuth start routes: 20 attempts/15 min per IP
export const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many OAuth attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("oauth"),
});

// General API endpoints (soft limit)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("api"),
});

// Content creation (bookings, reviews): 10/min per IP
export const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests. Please wait before creating more." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  store: makeStore("create"),
});

// File uploads: 20 uploads/15 min per IP
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many file uploads. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("upload"),
});

// Global API gateway: 200 req/min per IP (mounted on /api)
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Too many requests from this IP. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/uploads") || req.path.startsWith("/assets"),
  store: makeStore("global"),
});

// Legacy alias (kept for any remaining callers)
export const authLimiter = loginLimiter;

logger.debug("Rate limiters initialized", {
  source: "rate-limiter",
  meta: { redisEnabled: !!process.env.REDIS_URL },
});
