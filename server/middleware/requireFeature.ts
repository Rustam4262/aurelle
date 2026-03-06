/**
 * server/middleware/requireFeature.ts
 *
 * Feature-gating middleware for subscription-locked routes.
 *
 * Usage:
 *   router.get("/advanced-report", requireFeature("analytics.advanced"), handler);
 *
 * How it resolves the salonId:
 *   1. req.params.salonId
 *   2. req.query.salonId
 *   3. req.body.salonId
 *   4. session user's "current salon" (for owner-scoped routes)
 *
 * Returns 402 Payment Required if the salon's plan does not include the feature.
 * Returns 401 if no authenticated user is found.
 * Returns 400 if a salonId cannot be determined.
 */

import type { Request, Response, NextFunction } from "express";
import { hasFeature } from "../lib/subscriptions";
import { logger } from "../lib/logger";
import { db } from "../db";
import { salons } from "@shared/schema";
import { eq } from "drizzle-orm";

// ── Extend Request to cache resolved salonId for the request ─────────────────
declare global {
  namespace Express {
    interface Request {
      resolvedSalonId?: string;
    }
  }
}

/**
 * Resolve the salonId the request is acting on behalf of.
 * For salon-owner routes this is the salon owned by the authenticated user.
 */
async function resolveSalonId(req: Request): Promise<string | null> {
  // 1. Explicit param / query / body
  const explicit =
    (req.params.salonId as string | undefined) ??
    (req.query.salonId as string | undefined) ??
    (req.body?.salonId as string | undefined);

  if (explicit) return explicit;

  // 2. Session user — look up their salon as owner
  const sessionUser = (req.session as any)?.passport?.user;
  if (!sessionUser) return null;

  const userId: string = sessionUser.claims.sub;
  const [salon] = await db
    .select({ id: salons.id })
    .from(salons)
    .where(eq(salons.ownerId, userId))
    .limit(1);

  return salon?.id ?? null;
}

/**
 * Returns an Express middleware that gates the route behind a subscription feature key.
 *
 * @param featureKey  Dot-separated key matching `subscriptionPlans.featureKeys`, e.g. "analytics.funnel"
 */
export function requireFeature(featureKey: string) {
  return async function featureGate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const sessionUser = (req.session as any)?.passport?.user;
      if (!sessionUser) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const salonId = await resolveSalonId(req);
      if (!salonId) {
        res.status(400).json({ error: "Cannot determine salon for feature check" });
        return;
      }

      // Cache on request object so downstream handlers can read it cheaply
      req.resolvedSalonId = salonId;

      const allowed = await hasFeature(salonId, featureKey);
      if (allowed) {
        next();
        return;
      }

      logger.info("Feature gate blocked", {
        source: "requireFeature",
        meta: { featureKey, salonId, userId: sessionUser.claims.sub },
      });

      res.status(402).json({
        error: "Upgrade required",
        feature: featureKey,
        upgradeUrl: "/pricing",
        message:
          "Your current plan does not include this feature. Upgrade to unlock it.",
      });
    } catch (err) {
      logger.error(
        "requireFeature middleware error",
        err instanceof Error ? err : new Error(String(err)),
        { source: "requireFeature", meta: { featureKey } },
      );
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
