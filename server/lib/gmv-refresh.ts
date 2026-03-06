/**
 * GMV materialized view refresh.
 * Runs `REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_daily` — no table lock.
 * Called by the hourly cron job on the primary PM2 worker (instance 0).
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function refreshGmvDaily(): Promise<void> {
  const start = Date.now();
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_daily`);
    logger.info("[Cron] gmv_daily refreshed", {
      source: "gmv-refresh",
      meta: { durationMs: Date.now() - start },
    });
  } catch (err) {
    // Non-fatal — live revenue endpoint still works (falls back to raw payments table).
    logger.error("[Cron] gmv_daily refresh failed", err as Error, {
      source: "gmv-refresh",
    });
  }
}

/**
 * Start the hourly GMV refresh cron job.
 * Also runs once on startup to populate the view if it's empty.
 */
export function startGmvRefreshJob(): void {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  logger.info("[Cron] Starting GMV refresh job (runs every 60 min)");

  // Run immediately so view is populated before first dashboard load.
  refreshGmvDaily().catch((err) => {
    logger.error("[Cron] Initial GMV refresh failed", err as Error, {
      source: "gmv-refresh",
    });
  });

  setInterval(() => {
    refreshGmvDaily().catch((err) => {
      logger.error("[Cron] Scheduled GMV refresh failed", err as Error, {
        source: "gmv-refresh",
      });
    });
  }, INTERVAL_MS);
}
