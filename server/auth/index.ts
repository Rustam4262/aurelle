import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { RedisStore } from "connect-redis";
import { pool } from "../db";
import { logger } from "../lib/logger";
import { initializeRedis, getRedisClient } from "../lib/redis";
import { getRedisConfigStatus } from "../config/redis";

const PgSession = connectPgSimple(session);

const DEV_FALLBACK_SECRET = "dev-insecure-secret-aurelle-do-not-use-in-production";
const MIN_SECRET_LENGTH = 64;

/**
 * Builds the session secrets array for express-session rotation support.
 *
 * Express-session accepts an array of secrets:
 *   - Index 0 is used to sign ALL new session cookies.
 *   - Remaining entries are accepted for verifying existing cookies (rotation window).
 *
 * Rotation procedure: set SESSION_SECRET_PREVIOUS = old SESSION_SECRET_CURRENT,
 * then set SESSION_SECRET_CURRENT = new secret. Users stay logged in during the window.
 * Remove SESSION_SECRET_PREVIOUS once all old cookies have naturally expired (30 days).
 *
 * See docs/SECURITY_SECRETS.md for the full rotation runbook.
 */
function getSessionSecrets(): string[] {
  const current = process.env.SESSION_SECRET_CURRENT;
  const previous = process.env.SESSION_SECRET_PREVIOUS;

  if (process.env.NODE_ENV === "production") {
    if (!current) {
      logger.error(
        "SESSION_SECRET_CURRENT is not set. Refusing to start in production. " +
          "Generate with: openssl rand -hex 64",
        { source: "auth" },
      );
      process.exit(1);
    }
    if (current.length < MIN_SECRET_LENGTH) {
      logger.error(
        `SESSION_SECRET_CURRENT is too short (${current.length} chars, min ${MIN_SECRET_LENGTH}). ` +
          "Refusing to start in production. Generate with: openssl rand -hex 64",
        { source: "auth" },
      );
      process.exit(1);
    }
  } else {
    // Development: warn loudly, fall back to an insecure dev secret
    if (!current) {
      logger.warn(
        "SESSION_SECRET_CURRENT is not set — using insecure dev fallback. DO NOT use in production.",
        { source: "auth" },
      );
      return [DEV_FALLBACK_SECRET];
    }
    if (current.length < MIN_SECRET_LENGTH) {
      logger.warn(
        `SESSION_SECRET_CURRENT is only ${current.length} chars (min ${MIN_SECRET_LENGTH}). Using as-is in dev.`,
        { source: "auth" },
      );
    }
  }

  const secrets: string[] = [current];
  if (previous) {
    secrets.push(previous);
  }
  return secrets;
}

// Simple authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check if user is authenticated via session
  if (req.session && req.session.passport?.user) {
    const user = req.session.passport.user;

    // Attach user to request
    (req as any).user = user;

    return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};

// Setup authentication with session support
export async function setupAuth(app: Express) {
  // Trust proxy — important for operation behind Nginx
  app.set("trust proxy", 1);

  const secrets = getSessionSecrets();

  // ── Session store ─────────────────────────────────────────────────────────
  // Try Redis first; fall back to PostgreSQL if REDIS_URL is not set or
  // if the initial Redis connection fails.

  await initializeRedis();
  const redisClient = getRedisClient();

  let store: session.Store;
  let storeType: string;

  if (redisClient) {
    const redisCfg = getRedisConfigStatus();
    store = new RedisStore({
      client: redisClient,
      prefix: redisCfg.keyPrefix + "sess:",
      ttl: redisCfg.sessionTtlSeconds,
      // disableTouch: false (default) — resets TTL on every request (pairs with rolling:true)
    });
    storeType = `Redis (${redisCfg.host}, prefix="${redisCfg.keyPrefix}sess:")`;
  } else {
    store = new PgSession({
      pool: pool,
      tableName: "sessions",
      createTableIfMissing: true,
    });
    storeType = "PostgreSQL (connect-pg-simple)";
  }

  // ── Session middleware ────────────────────────────────────────────────────
  app.use(
    session({
      store,
      secret: secrets,
      resave: false,
      saveUninitialized: false,
      rolling: true, // Reset cookie maxAge on every request
      cookie: {
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax",
      },
    }),
  );

  const rotationNote = secrets.length > 1 ? " (rotation: 2 secrets active)" : "";
  logger.info(`Auth system initialized — session store: ${storeType}${rotationNote}`, {
    source: "auth",
  });
}

// Placeholder for auth routes registration
export function registerAuthRoutes(app: Express) {
  // Auth routes are handled by localAuth.ts
  // This function is here for compatibility
}
