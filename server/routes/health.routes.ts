import { Router } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getEmailConfigStatus } from "../config/email";
import { verifyTransport } from "../email";

const router = Router();

/**
 * Health Check Endpoint
 * Returns application health status and system information
 */
router.get("/health", async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connection
    const dbHealthy = await checkDatabase();

    // Get system info
    const systemInfo = getSystemInfo();

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine overall status
    const status = dbHealthy ? "healthy" : "unhealthy";

    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      database: {
        status: dbHealthy ? "connected" : "disconnected",
      },
      system: systemInfo,
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    // Return 503 if unhealthy, 200 if healthy
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error("Health check failed", error);

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      responseTime: `${Date.now() - startTime}ms`,
    });
  }
});

/**
 * Email Health Check
 * Returns SMTP config status + live verify (60s cached). Never exposes password.
 */
router.get("/health/email", async (req, res) => {
  const cfg = getEmailConfigStatus();

  if (!cfg.enabled) {
    return res.status(200).json({
      status: "disabled",
      ...cfg,
      smtpVerified: false,
    });
  }

  const smtpVerified = await verifyTransport();
  const status = smtpVerified ? "ok" : "degraded";
  return res.status(smtpVerified ? 200 : 503).json({
    status,
    ...cfg,
    smtpVerified,
  });
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

/**
 * Get system information
 */
function getSystemInfo() {
  const memUsage = process.memoryUsage();

  return {
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    },
    cpu: {
      usage: process.cpuUsage(),
    },
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid,
  };
}

export default router;
