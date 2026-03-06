import { Router } from "express";
import { db } from "../../db";
import { productEvents } from "@shared/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { requirePermission } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import { getRedisClient } from "../../lib/redis";

const router = Router();

// ─── Funnel Engine ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/analytics/funnel?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Counts funnel events from the `product_events` table:
 *   registrations     (event_name = 'registration_complete')
 *   bookingsStarted   (event_name = 'booking_started')
 *   bookingsCompleted (event_name = 'booking_completed')
 *
 * Results are cached in Redis for 60 seconds to avoid OLTP pressure.
 * Falls back to live query if Redis is unavailable.
 */
router.get("/funnel", requirePermission("analytics.read"), async (req, res) => {
  try {
    // Date range: default last 30 days
    const toDate   = (req.query.to   as string) || new Date().toISOString().slice(0, 10);
    const fromDate = (req.query.from as string) || new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

    const from = new Date(fromDate);
    const to   = new Date(toDate + "T23:59:59.999Z");

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: "Invalid from/to date (use YYYY-MM-DD)" });
    }

    // ── Redis cache ───────────────────────────────────────────────────────────
    const cacheKey = `aurelle:funnel:${fromDate}:${toDate}`;
    const redis = getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json({ ...JSON.parse(cached), cached: true });
        }
      } catch {
        // Redis miss — proceed with DB query
      }
    }

    // ── DB query: count by event_name in one pass ─────────────────────────────
    const rows = await db
      .select({
        eventName: productEvents.eventName,
        count: sql<number>`count(*)`,
      })
      .from(productEvents)
      .where(
        and(
          gte(productEvents.createdAt, from),
          lte(productEvents.createdAt, to),
          sql`${productEvents.eventName} IN ('registration_complete','booking_started','booking_completed')`,
        ),
      )
      .groupBy(productEvents.eventName);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.eventName] = Number(row.count);
    }

    const registrations     = counts["registration_complete"] ?? 0;
    const bookingsStarted   = counts["booking_started"]       ?? 0;
    const bookingsCompleted = counts["booking_completed"]      ?? 0;

    const startConversionPct = registrations > 0
      ? Number(((bookingsStarted / registrations) * 100).toFixed(1))
      : 0;
    const completeConversionPct = bookingsStarted > 0
      ? Number(((bookingsCompleted / bookingsStarted) * 100).toFixed(1))
      : 0;
    const overallConversionPct = registrations > 0
      ? Number(((bookingsCompleted / registrations) * 100).toFixed(1))
      : 0;

    const result = {
      from: fromDate,
      to: toDate,
      registrations,
      bookingsStarted,
      bookingsCompleted,
      conversionPct: {
        regToStart:    startConversionPct,
        startToComplete: completeConversionPct,
        overall:       overallConversionPct,
      },
      cached: false,
    };

    // ── Cache for 60s ─────────────────────────────────────────────────────────
    if (redis) {
      try {
        await redis.setEx(cacheKey, 60, JSON.stringify(result));
      } catch {
        // non-fatal
      }
    }

    return res.json(result);
  } catch (err) {
    logger.error("Funnel query error", err as Error, { source: "analytics-routes" });
    return res.status(500).json({ error: "Failed to compute funnel" });
  }
});

export default router;
