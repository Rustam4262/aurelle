/**
 * Cron job: Auto-expire sanctions
 * Runs periodically to mark expired sanctions as "expired"
 */

import { db } from "../db";
import { sanctions } from "@shared/admin-schema";
import { eq, and, lte, or, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function expireSanctions() {
  try {
    const now = new Date();

    logger.info(`[Cron] Checking for expired sanctions at ${now.toISOString()}`);

    // Check if sanctions table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sanctions'
      );
    `);

    const tableExists = tableCheck.rows[0]?.exists;
    if (!tableExists) {
      // Table doesn't exist yet - skip silently (admin module not deployed)
      return 0;
    }

    // Find all active sanctions with ends_at in the past
    const expiredSanctions = await db
      .update(sanctions)
      .set({
        status: "expired",
        updatedAt: now,
      })
      .where(
        and(
          eq(sanctions.status, "active"),
          isNotNull(sanctions.endsAt),
          lte(sanctions.endsAt, now),
        ),
      )
      .returning();

    if (expiredSanctions.length > 0) {
      logger.info(`[Cron] Expired ${expiredSanctions.length} sanctions:`);
      expiredSanctions.forEach((s) => {
        logger.info(
          `  - ${s.targetType}:${s.targetId} (${s.sanctionType}) - expired at ${s.endsAt}`,
        );
      });
    }

    return expiredSanctions.length;
  } catch (error) {
    logger.error("[Cron] Error expiring sanctions", error);
    throw error;
  }
}

/**
 * Start the cron job
 * Runs every 5 minutes
 */
export function startSanctionExpiryJob() {
  const INTERVAL = 5 * 60 * 1000; // 5 minutes

  logger.info("[Cron] Starting sanction expiry job (runs every 5 minutes)");

  // Run immediately on startup
  expireSanctions().catch((error) => {
    logger.error("[Cron] Initial sanction expiry failed", error);
  });

  // Then run periodically
  setInterval(() => {
    expireSanctions().catch((error) => {
      logger.error("[Cron] Scheduled sanction expiry failed", error);
    });
  }, INTERVAL);
}
