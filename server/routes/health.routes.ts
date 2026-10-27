import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getEmailConfigStatus } from "../config/email";
import { verifyTransport } from "../email";
import { getSmsConfigStatus } from "../config/sms";
import { getRedisConfigStatus } from "../config/redis";
import { isRedisConnected } from "../lib/redis";
import * as Sentry from "@sentry/node";

const router = Router();

/**
 * Ping — ultra-lightweight liveness probe.
 * No DB query. Safe to poll every 30 seconds from uptime monitors.
 * Returns 200 {"status":"ok"} always (process is alive if you get a response).
 */
router.get("/health/ping", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

/**
 * Health Check Endpoint
 * Returns readiness and deployment version, without internal system details.
 * Returns 503 if the database is unreachable.
 */
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbHealthy = await checkDatabase();

    // Determine overall status
    const status = dbHealthy ? "healthy" : "unhealthy";

    const healthData = {
      status,
      version: process.env.APP_VERSION || "1.0.0",
    };

    // Return 503 if unhealthy, 200 if healthy
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error("Health check failed", error);

    res.status(503).json({
      status: "unhealthy",
      version: process.env.APP_VERSION || "1.0.0",
    });
  }
});

/**
 * Email Health Check
 * Returns only SMTP availability; connection/configuration details stay private.
 */
router.get("/health/email", async (req, res) => {
  const cfg = getEmailConfigStatus();

  if (!cfg.enabled) {
    return res.status(200).json({
      status: "disabled",
    });
  }

  const smtpVerified = await verifyTransport();
  const status = smtpVerified ? "ok" : "degraded";
  return res.status(smtpVerified ? 200 : 503).json({
    status,
  });
});

/**
 * SMS Health Check
 * Returns Twilio config status. Credentials validated at startup via getSmsConfig().
 * Live API verify not done here (avoids Twilio API calls on every health check).
 */
router.get("/health/sms", (req, res) => {
  const cfg = getSmsConfigStatus();
  return res.status(cfg.enabled ? 200 : 200).json({
    status: cfg.enabled ? "ok" : "disabled",
  });
});

/**
 * Redis Health Check
 * Returns Redis connection status. Never exposes the connection URL/password.
 */
router.get("/health/redis", (_req, res) => {
  const cfg = getRedisConfigStatus();
  if (!cfg.configured) {
    return res.status(200).json({
      status: "disabled",
    });
  }
  const connected = isRedisConnected();
  return res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "degraded",
  });
});

/**
 * Sentry Health Check
 * Returns Sentry config status. Never exposes the DSN value.
 */
router.get("/health/sentry", (_req, res) => {
  const dsnPresent = !!process.env.SENTRY_DSN;
  return res.status(200).json({
    status: dsnPresent ? "configured" : "disabled",
  });
});

/**
 * Sentry Test Endpoint (protected by SENTRY_DEBUG_TOKEN or SEED_TOKEN)
 * Throws a test error so you can verify events appear in the Sentry dashboard.
 * Usage: curl -H "x-debug-token: <token>" https://aurelle.uz/api/debug/sentry-test
 */
router.get("/debug/sentry-test", (req, res) => {
  const token = req.headers["x-debug-token"] as string | undefined;
  const expected = process.env.SENTRY_DEBUG_TOKEN || process.env.SEED_TOKEN;

  if (!expected || token !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const error = new Error("Sentry test error — triggered via /api/debug/sentry-test");
  Sentry.captureException(error);
  throw error;
});

/**
 * Check database connection
 */
async function checkDatabase(): Promise<boolean> {
  try {
    // Execute simple query
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    logger.error("Database health check failed", error);
    return false;
  }
}

export default router;
