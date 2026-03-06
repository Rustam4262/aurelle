/**
 * Cron job: Clean up expired booking drafts.
 * Runs every hour. Deletes rows where expires_at < NOW().
 */

import { db } from "../db";
import { bookingDrafts } from "@shared/schema";
import { lt } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function cleanupExpiredDrafts(): Promise<number> {
  try {
    const deleted = await db
      .delete(bookingDrafts)
      .where(lt(bookingDrafts.expiresAt, new Date()))
      .returning({ id: bookingDrafts.id });

    if (deleted.length > 0) {
      logger.info(`[Cron] Deleted ${deleted.length} expired booking drafts`, {
        source: "cleanup-drafts",
      });
    }
    return deleted.length;
  } catch (err) {
    logger.error("[Cron] Failed to cleanup booking drafts", err as Error, {
      source: "cleanup-drafts",
    });
    return 0;
  }
}

export function startDraftCleanupJob(): void {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  logger.info("[Cron] Starting booking draft cleanup job (runs every 60 min)");

  // Run once on startup to clear any leftovers from a previous server session
  cleanupExpiredDrafts().catch(() => {});

  setInterval(() => {
    cleanupExpiredDrafts().catch(() => {});
  }, INTERVAL_MS);
}
