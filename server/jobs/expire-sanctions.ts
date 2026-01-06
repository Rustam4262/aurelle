/**
 * Cron job: Auto-expire sanctions
 * Runs periodically to mark expired sanctions as "expired"
 */

import { db } from "../db";
import { sanctions } from "@shared/admin-schema";
import { eq, and, lte, or, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function expireSanctions() {
  try {
    const now = new Date();

    console.log(`[Cron] Checking for expired sanctions at ${now.toISOString()}`);

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
          lte(sanctions.endsAt, now)
        )
      )
      .returning();

    if (expiredSanctions.length > 0) {
      console.log(`[Cron] Expired ${expiredSanctions.length} sanctions:`);
      expiredSanctions.forEach((s) => {
        console.log(
          `  - ${s.targetType}:${s.targetId} (${s.sanctionType}) - expired at ${s.endsAt}`
        );
      });
    } else {
      console.log(`[Cron] No sanctions expired`);
    }

    return expiredSanctions.length;
  } catch (error) {
    console.error("[Cron] Error expiring sanctions:", error);
    throw error;
  }
}

/**
 * Start the cron job
 * Runs every 5 minutes
 */
export function startSanctionExpiryJob() {
  const INTERVAL = 5 * 60 * 1000; // 5 minutes

  console.log("[Cron] Starting sanction expiry job (runs every 5 minutes)");

  // Run immediately on startup
  expireSanctions().catch((error) => {
    console.error("[Cron] Initial sanction expiry failed:", error);
  });

  // Then run periodically
  setInterval(() => {
    expireSanctions().catch((error) => {
      console.error("[Cron] Scheduled sanction expiry failed:", error);
    });
  }, INTERVAL);
}
