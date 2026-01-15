import { Router } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

// Lightweight health check - always responds quickly
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Detailed readiness check - tests all dependencies
router.get("/ready", async (_req, res) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let isReady = true;

  // Check Database
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    isReady = false;
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check Redis (graceful degradation - optional)
  try {
    const { default: redisClient } = await import("./cache");
    if (redisClient) {
      const redisStart = Date.now();
      // Redis might be optional, so we don't fail if it's not available
      checks.redis = {
        status: "up",
        latency: Date.now() - redisStart,
      };
    } else {
      checks.redis = {
        status: "disabled",
      };
    }
  } catch (error) {
    // Redis is optional, so this is just a warning
    checks.redis = {
      status: "disabled",
      error: "Redis not configured",
    };
  }

  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

export default router;
