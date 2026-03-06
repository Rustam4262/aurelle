/**
 * Platform billing — fee calculation.
 *
 * Fee lookup order:
 *  1. Latest salon-specific config (platformFeeConfig WHERE salon_id = :id)
 *  2. Latest global default config  (platformFeeConfig WHERE salon_id IS NULL)
 *  3. 0% if no config exists
 *
 * Both values are snapshots: they are persisted to the payment record at creation
 * time so that future rate changes do not affect historical payment data.
 */

import { db } from "../db";
import { platformFeeConfig } from "@shared/schema";
import { eq, isNull, desc } from "drizzle-orm";
import { logger } from "./logger";

export interface FeeBreakdown {
  /** Amount the customer pays (= amountUzs) */
  grossAmountUzs: number;
  /** Platform fee rate applied, snapshotted from config at payment creation */
  feePercent: number;
  /** Platform's cut: round(gross × feePercent / 100) */
  platformFeeUzs: number;
  /** Amount the salon receives: gross − platformFee */
  netAmountUzs: number;
}

/**
 * Calculate the platform fee for a given gross amount and salon.
 *
 * If a salon-specific override exists, it is used; otherwise the global default
 * applies. A salon override of 0% is honoured as "no fee" (not overridden by global).
 *
 * Never throws — logs warnings and returns 0% on DB errors.
 */
export async function calculateFee(
  grossAmountUzs: number,
  salonId?: string | null,
): Promise<FeeBreakdown> {
  let feePercent = 0;

  try {
    let foundSalonSpecific = false;

    if (salonId) {
      // Try salon-specific config first
      const [salonRow] = await db
        .select()
        .from(platformFeeConfig)
        .where(eq(platformFeeConfig.salonId, salonId))
        .orderBy(desc(platformFeeConfig.createdAt))
        .limit(1);

      if (salonRow) {
        feePercent = Number(salonRow.feePercent);
        foundSalonSpecific = true;
      }
    }

    if (!foundSalonSpecific) {
      // Fall back to global default
      const [globalRow] = await db
        .select()
        .from(platformFeeConfig)
        .where(isNull(platformFeeConfig.salonId))
        .orderBy(desc(platformFeeConfig.createdAt))
        .limit(1);

      feePercent = Number(globalRow?.feePercent ?? 0);
    }
  } catch (err) {
    logger.warn("calculateFee: config lookup failed — applying 0%", {
      source: "billing",
      meta: { salonId, error: String(err) },
    });
    feePercent = 0;
  }

  const platformFeeUzs = Math.round((grossAmountUzs * feePercent) / 100);
  const netAmountUzs = grossAmountUzs - platformFeeUzs;

  return { grossAmountUzs, feePercent, platformFeeUzs, netAmountUzs };
}
