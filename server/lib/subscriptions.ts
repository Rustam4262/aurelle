/**
 * server/lib/subscriptions.ts
 *
 * Subscription lifecycle helpers:
 *   - startTrial(salonId)         — auto-called when a salon is first created
 *   - getSubscription(salonId)    — load current plan + status
 *   - hasFeature(salonId, key)    — check if salon's plan includes a feature key
 *   - startLifecycleCron()        — hourly cron: expire trials, downgrade past_due
 */

import { db } from "../db";
import { salonSubscriptions, subscriptionPlans } from "@shared/schema";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { logger } from "./logger";

// ── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export interface SubscriptionInfo {
  salonId: string;
  planSlug: string;
  planName: { en: string; ru: string; uz: string };
  status: SubscriptionStatus;
  featureKeys: string[];
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

// ── Internal: load plan feature keys ─────────────────────────────────────────

async function getPlanFeatureKeys(planId: string): Promise<string[]> {
  const [plan] = await db
    .select({ featureKeys: subscriptionPlans.featureKeys })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId));
  return (plan?.featureKeys as string[] | undefined) ?? [];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called when a salon is first created.
 * Looks up the "starter" plan and creates a 14-day trial subscription.
 * If the salon already has a subscription, this is a no-op.
 */
export async function startTrial(salonId: string): Promise<void> {
  // Resolve the "starter" plan (or first active plan with trial_days > 0)
  const [plan] = await db
    .select({ id: subscriptionPlans.id, trialDays: subscriptionPlans.trialDays })
    .from(subscriptionPlans)
    .where(
      and(
        eq(subscriptionPlans.slug, "starter"),
        eq(subscriptionPlans.isActive, true),
      ),
    )
    .limit(1);

  if (!plan) {
    logger.warn("startTrial: no 'starter' plan found — skipping", {
      source: "subscriptions",
      meta: { salonId },
    });
    return;
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + plan.trialDays * 86_400_000);

  await db
    .insert(salonSubscriptions)
    .values({
      salonId,
      planId: plan.id,
      status: "trialing",
      trialStartsAt: now,
      trialEndsAt,
    })
    .onConflictDoNothing(); // salon already has subscription — skip

  logger.info("Trial started", {
    source: "subscriptions",
    meta: { salonId, trialDays: plan.trialDays, trialEndsAt: trialEndsAt.toISOString() },
  });
}

/**
 * Load the current subscription info for a salon.
 * Returns null if the salon has no subscription row yet (treat as "free").
 */
export async function getSubscription(salonId: string): Promise<SubscriptionInfo | null> {
  const [row] = await db
    .select({
      salonId: salonSubscriptions.salonId,
      planId: salonSubscriptions.planId,
      status: salonSubscriptions.status,
      trialEndsAt: salonSubscriptions.trialEndsAt,
      currentPeriodEnd: salonSubscriptions.currentPeriodEnd,
      planSlug: subscriptionPlans.slug,
      planName: subscriptionPlans.name,
      featureKeys: subscriptionPlans.featureKeys,
    })
    .from(salonSubscriptions)
    .innerJoin(subscriptionPlans, eq(salonSubscriptions.planId, subscriptionPlans.id))
    .where(eq(salonSubscriptions.salonId, salonId))
    .limit(1);

  if (!row) return null;

  return {
    salonId: row.salonId,
    planSlug: row.planSlug,
    planName: row.planName as { en: string; ru: string; uz: string },
    status: row.status as SubscriptionStatus,
    featureKeys: (row.featureKeys as string[] | undefined) ?? [],
    trialEndsAt: row.trialEndsAt ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
  };
}

/**
 * Returns true if the salon's active/trial plan includes the given feature key.
 * "expired" and "cancelled" subscriptions are treated as "free" (no features).
 */
export async function hasFeature(salonId: string, featureKey: string): Promise<boolean> {
  const sub = await getSubscription(salonId);
  if (!sub) return false;
  if (sub.status === "expired" || sub.status === "cancelled") return false;
  return sub.featureKeys.includes(featureKey);
}

// ── Lifecycle cron ────────────────────────────────────────────────────────────

/**
 * Expire trials that have passed trialEndsAt.
 * Downgrade from "trialing" to "expired".
 */
async function expireTrials(): Promise<number> {
  const now = new Date();
  const result = await db
    .update(salonSubscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(salonSubscriptions.status, "trialing"),
        lte(salonSubscriptions.trialEndsAt, now),
      ),
    )
    .returning({ salonId: salonSubscriptions.salonId });

  return result.length;
}

/**
 * Expire active subscriptions where currentPeriodEnd has passed.
 * Transitions "active" → "expired" (the payment provider should prevent this
 * in normal operation, but this is a safety net).
 */
async function expirePeriods(): Promise<number> {
  const now = new Date();
  const result = await db
    .update(salonSubscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        inArray(salonSubscriptions.status, ["active", "past_due"]),
        lte(salonSubscriptions.currentPeriodEnd, now),
      ),
    )
    .returning({ salonId: salonSubscriptions.salonId });

  return result.length;
}

/**
 * Run one lifecycle tick.
 * Called by startLifecycleCron() every hour.
 */
export async function runLifecycleTick(): Promise<void> {
  const [expiredTrials, expiredPeriods] = await Promise.all([
    expireTrials(),
    expirePeriods(),
  ]);

  if (expiredTrials > 0 || expiredPeriods > 0) {
    logger.info("[Cron] Subscription lifecycle tick", {
      source: "subscriptions",
      meta: { expiredTrials, expiredPeriods },
    });
  }
}

/**
 * Start the hourly subscription lifecycle cron.
 * Must be called inside the `isMainInstance` guard.
 */
export function startLifecycleCron(): void {
  // Run once at startup
  runLifecycleTick().catch((err: unknown) => {
    logger.error(
      "Subscription lifecycle startup run failed",
      err instanceof Error ? err : new Error(String(err)),
      { source: "subscriptions" },
    );
  });

  // Then every hour
  setInterval(() => {
    runLifecycleTick().catch((err: unknown) => {
      logger.error(
        "Subscription lifecycle tick failed",
        err instanceof Error ? err : new Error(String(err)),
        { source: "subscriptions" },
      );
    });
  }, 60 * 60 * 1000);

  logger.info("[Cron] Subscription lifecycle cron started (1h interval)", {
    source: "subscriptions",
  });
}
