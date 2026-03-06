import { Router, Request } from "express";
import { db } from "../../db";
import { platformFeeConfig, payments } from "@shared/schema";
import { eq, isNull, desc, and, gte, sql } from "drizzle-orm";
import { requirePermission, logAuditAction } from "../../middleware/admin";
import { logger } from "../../lib/logger";
import { z } from "zod";

const router = Router();

// Helper to get user ID from session
function getUserId(req: Request): string {
  return (req.session as any)?.passport?.user?.claims?.sub || "";
}

// Helper: get the current effective config for a given scope
async function getCurrentConfig(salonId: string | null) {
  if (salonId !== null) {
    const [row] = await db
      .select()
      .from(platformFeeConfig)
      .where(eq(platformFeeConfig.salonId, salonId))
      .orderBy(desc(platformFeeConfig.createdAt))
      .limit(1);
    return row ?? null;
  }
  const [row] = await db
    .select()
    .from(platformFeeConfig)
    .where(isNull(platformFeeConfig.salonId))
    .orderBy(desc(platformFeeConfig.createdAt))
    .limit(1);
  return row ?? null;
}

// ─── Fee Config ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/billing/fee-config
 * Returns current effective fee configs: global default + all per-salon overrides.
 */
router.get("/fee-config", requirePermission("analytics.read"), async (_req, res) => {
  try {
    const all = await db
      .select()
      .from(platformFeeConfig)
      .orderBy(desc(platformFeeConfig.createdAt));

    // Deduplicate: keep only the latest row per scope (latest by created_at DESC)
    const seen = new Set<string>();
    const current = all.filter((row) => {
      const key = row.salonId ?? "__global__";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const globalConfig = current.find((r) => r.salonId === null) ?? null;
    const salonOverrides = current.filter((r) => r.salonId !== null);

    res.json({
      global: globalConfig
        ? { feePercent: Number(globalConfig.feePercent), description: globalConfig.description, updatedAt: globalConfig.updatedAt }
        : { feePercent: 0, description: null, updatedAt: null },
      salonOverrides: salonOverrides.map((r) => ({
        salonId: r.salonId,
        feePercent: Number(r.feePercent),
        description: r.description,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err) {
    logger.error("Get fee config error", err as Error, { source: "billing-routes" });
    res.status(500).json({ error: "Failed to fetch fee config" });
  }
});

const feeConfigSchema = z.object({
  feePercent: z.number().min(0).max(100),
  description: z.string().optional(),
});

/**
 * PUT /api/admin/billing/fee-config
 * Set or update the global default platform fee.
 */
router.put("/fee-config", requirePermission("billing.write"), async (req, res) => {
  try {
    const parsed = feeConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const { feePercent, description } = parsed.data;
    const userId = getUserId(req);

    const existing = await getCurrentConfig(null);

    if (existing) {
      await db
        .update(platformFeeConfig)
        .set({ feePercent: String(feePercent), description: description ?? null, updatedAt: new Date() })
        .where(eq(platformFeeConfig.id, existing.id));
    } else {
      await db.insert(platformFeeConfig).values({
        salonId: null,
        feePercent: String(feePercent),
        description: description ?? null,
        createdBy: userId,
      });
    }

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "billing.fee_config.set_global",
      entityType: "platform_fee_config",
      entityId: "global",
      oldData: existing ? { feePercent: Number(existing.feePercent) } : null,
      newData: { feePercent },
      req,
    });

    logger.info("Global fee config updated", {
      source: "billing-routes",
      meta: { feePercent, userId },
    });

    res.json({ ok: true, feePercent });
  } catch (err) {
    logger.error("Set global fee config error", err as Error, { source: "billing-routes" });
    res.status(500).json({ error: "Failed to set fee config" });
  }
});

/**
 * PUT /api/admin/billing/fee-config/salon/:salonId
 * Set or update a per-salon fee override.
 */
router.put("/fee-config/salon/:salonId", requirePermission("billing.write"), async (req, res) => {
  try {
    const { salonId } = req.params;
    const parsed = feeConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
    }

    const { feePercent, description } = parsed.data;
    const userId = getUserId(req);

    const existing = await getCurrentConfig(salonId);

    if (existing) {
      await db
        .update(platformFeeConfig)
        .set({ feePercent: String(feePercent), description: description ?? null, updatedAt: new Date() })
        .where(eq(platformFeeConfig.id, existing.id));
    } else {
      await db.insert(platformFeeConfig).values({
        salonId,
        feePercent: String(feePercent),
        description: description ?? null,
        createdBy: userId,
      });
    }

    await logAuditAction({
      actorUserId: userId,
      actorRole: req.admin!.roleName,
      action: "billing.fee_config.set_salon",
      entityType: "platform_fee_config",
      entityId: salonId,
      oldData: existing ? { feePercent: Number(existing.feePercent) } : null,
      newData: { feePercent },
      req,
    });

    res.json({ ok: true, salonId, feePercent });
  } catch (err) {
    logger.error("Set salon fee config error", err as Error, { source: "billing-routes" });
    res.status(500).json({ error: "Failed to set salon fee config" });
  }
});

/**
 * DELETE /api/admin/billing/fee-config/salon/:salonId
 * Remove per-salon override — salon will fall back to global default.
 */
router.delete(
  "/fee-config/salon/:salonId",
  requirePermission("billing.write"),
  async (req, res) => {
    try {
      const { salonId } = req.params;
      const userId = getUserId(req);

      await db
        .delete(platformFeeConfig)
        .where(eq(platformFeeConfig.salonId, salonId));

      await logAuditAction({
        actorUserId: userId,
        actorRole: req.admin!.roleName,
        action: "billing.fee_config.delete_salon",
        entityType: "platform_fee_config",
        entityId: salonId,
        req,
      });

      res.json({ ok: true, salonId, message: "Override removed — salon will use global rate" });
    } catch (err) {
      logger.error("Delete salon fee config error", err as Error, { source: "billing-routes" });
      res.status(500).json({ error: "Failed to delete salon fee config" });
    }
  },
);

// ─── Revenue Summary ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/billing/revenue?range=30d
 * GMV / platform fees / net revenue summary for succeeded payments.
 * Supports ?range=7d|30d|90d|all (default: 30d).
 */
router.get("/revenue", requirePermission("analytics.read"), async (req, res) => {
  try {
    const rangeMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const range = req.query.range as string;
    const days = rangeMap[range];
    const cutoff = days ? new Date(Date.now() - days * 86_400_000) : null;

    const whereClause = and(
      sql`${payments.status} = 'succeeded'`,
      cutoff ? gte(payments.createdAt, cutoff) : undefined,
    );

    const [totals] = await db
      .select({
        count: sql<number>`count(*)`,
        gmv: sql<number>`coalesce(sum(${payments.grossAmountUzs}), 0)`,
        fees: sql<number>`coalesce(sum(${payments.platformFeeUzs}), 0)`,
        net: sql<number>`coalesce(sum(${payments.netAmountUzs}), 0)`,
        avgFeePercent: sql<number>`round(avg(${payments.feePercent})::numeric, 2)`,
      })
      .from(payments)
      .where(whereClause);

    // Also count pending / failed for context
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(
        sql`${payments.status} = 'pending'`,
        cutoff ? gte(payments.createdAt, cutoff) : undefined,
      ));

    const [failed] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(
        sql`${payments.status} IN ('failed','cancelled')`,
        cutoff ? gte(payments.createdAt, cutoff) : undefined,
      ));

    res.json({
      range: range || "all",
      succeeded: {
        count: Number(totals.count),
        gmvUzs: Number(totals.gmv),
        platformFeeUzs: Number(totals.fees),
        netUzs: Number(totals.net),
        avgFeePercent: Number(totals.avgFeePercent),
        takeRate: totals.gmv > 0
          ? Number(((totals.fees / totals.gmv) * 100).toFixed(2))
          : 0,
      },
      pending: { count: Number(pending.count) },
      failed: { count: Number(failed.count) },
    });
  } catch (err) {
    logger.error("Revenue summary error", err as Error, { source: "billing-routes" });
    res.status(500).json({ error: "Failed to fetch revenue summary" });
  }
});

// ─── GMV Materialized View ─────────────────────────────────────────────────────

/**
 * GET /api/admin/billing/gmv?range=7d|30d|90d
 *      /api/admin/billing/gmv?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Reads the `gmv_daily` materialized view (refreshed hourly by cron).
 * Returns a daily time-series array + period totals.
 * Falls back to an empty result (not 500) if the view hasn't been created yet.
 */
router.get("/gmv", requirePermission("analytics.read"), async (req, res) => {
  try {
    const rangeMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const range = req.query.range as string;
    const days = rangeMap[range];

    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (req.query.from && req.query.to) {
      const from = new Date(req.query.from as string);
      const to = new Date(req.query.to as string);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return res.status(400).json({ error: "Invalid from/to date format (use YYYY-MM-DD)" });
      }
      fromDate = from.toISOString().slice(0, 10);
      toDate = to.toISOString().slice(0, 10);
    } else if (days) {
      fromDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      toDate = new Date().toISOString().slice(0, 10);
    }

    // Check view exists before querying (created by migration 0023)
    const viewCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_matviews WHERE matviewname = 'gmv_daily'
      ) AS exists
    `);
    if (!viewCheck.rows[0]?.exists) {
      logger.info("gmv_daily view not yet created — returning empty", { source: "billing-routes" });
      return res.json({ range: range || "all", from: fromDate, to: toDate, daily: [], totals: null });
    }

    const rows = fromDate && toDate
      ? await db.execute(sql`
          SELECT day, succeeded_count, failed_count, pending_count, gmv_uzs, fee_uzs, net_uzs
          FROM gmv_daily
          WHERE day >= ${fromDate}::date AND day <= ${toDate}::date
          ORDER BY day
        `)
      : await db.execute(sql`
          SELECT day, succeeded_count, failed_count, pending_count, gmv_uzs, fee_uzs, net_uzs
          FROM gmv_daily
          ORDER BY day
        `);

    const data = rows.rows as Array<{
      day: string;
      succeeded_count: string | number;
      failed_count: string | number;
      pending_count: string | number;
      gmv_uzs: string | number;
      fee_uzs: string | number;
      net_uzs: string | number;
    }>;

    const daily = data.map((r) => {
      const gmvUzs = Number(r.gmv_uzs);
      const feeUzs = Number(r.fee_uzs);
      return {
        day: r.day,
        succeededCount: Number(r.succeeded_count),
        failedCount: Number(r.failed_count),
        pendingCount: Number(r.pending_count),
        gmvUzs,
        feeUzs,
        netUzs: Number(r.net_uzs),
        takeRatePct: gmvUzs > 0 ? Number(((feeUzs / gmvUzs) * 100).toFixed(2)) : 0,
      };
    });

    const totals = daily.reduce(
      (acc, r) => ({
        succeededCount: acc.succeededCount + r.succeededCount,
        failedCount: acc.failedCount + r.failedCount,
        pendingCount: acc.pendingCount + r.pendingCount,
        gmvUzs: acc.gmvUzs + r.gmvUzs,
        feeUzs: acc.feeUzs + r.feeUzs,
        netUzs: acc.netUzs + r.netUzs,
      }),
      { succeededCount: 0, failedCount: 0, pendingCount: 0, gmvUzs: 0, feeUzs: 0, netUzs: 0 },
    );

    res.json({
      range: range || "all",
      from: fromDate,
      to: toDate,
      daily,
      totals: {
        ...totals,
        takeRatePct: totals.gmvUzs > 0
          ? Number(((totals.feeUzs / totals.gmvUzs) * 100).toFixed(2))
          : 0,
      },
    });
  } catch (err) {
    logger.error("GMV view query error", err as Error, { source: "billing-routes" });
    res.status(500).json({ error: "Failed to fetch GMV data" });
  }
});

// ─── Payment Reconciliation ────────────────────────────────────────────────────

/**
 * GET /api/admin/billing/reconciliation
 *
 * Returns three classes of data integrity issues:
 *   1. `missingFee`   — succeeded payments where fee columns were never calculated
 *   2. `mathMismatch` — succeeded payments where net + fee ≠ gross (rounding bugs)
 *   3. `orphanWebhooks` — webhook_events (ok=true) with no matching payment record
 *
 * Requires admin auth + analytics.read.
 */
router.get("/reconciliation", requirePermission("analytics.read"), async (_req, res) => {
  try {
    // 1. Succeeded payments missing fee snapshot
    const missingFeeRows = await db.execute(sql`
      SELECT id, order_id, amount_uzs, status, created_at
      FROM payments
      WHERE status = 'succeeded'
        AND gross_amount_uzs IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // 2. Succeeded payments where net_amount_uzs + platform_fee_uzs ≠ gross_amount_uzs
    const mathMismatchRows = await db.execute(sql`
      SELECT
        id,
        order_id,
        gross_amount_uzs,
        platform_fee_uzs,
        net_amount_uzs,
        (net_amount_uzs + platform_fee_uzs)  AS computed_gross,
        (gross_amount_uzs - net_amount_uzs - platform_fee_uzs) AS discrepancy_uzs,
        created_at
      FROM payments
      WHERE status = 'succeeded'
        AND gross_amount_uzs IS NOT NULL
        AND net_amount_uzs IS NOT NULL
        AND platform_fee_uzs IS NOT NULL
        AND net_amount_uzs + platform_fee_uzs != gross_amount_uzs
      ORDER BY ABS(gross_amount_uzs - net_amount_uzs - platform_fee_uzs) DESC
      LIMIT 100
    `);

    // 3. Webhook events (ok=true) that have no matching payment
    const orphanWebhookRows = await db.execute(sql`
      SELECT we.id, we.provider, we.order_id, we.event_type, we.received_at, we.external_event_id
      FROM webhook_events we
      LEFT JOIN payments p ON we.order_id = p.order_id
      WHERE we.ok = true
        AND we.order_id IS NOT NULL
        AND p.id IS NULL
        AND we.error IS DISTINCT FROM 'ignored'
        AND we.error IS DISTINCT FROM 'duplicate'
      ORDER BY we.received_at DESC
      LIMIT 100
    `);

    const missingFee    = (missingFeeRows.rows    ?? []) as unknown[];
    const mathMismatch  = (mathMismatchRows.rows  ?? []) as unknown[];
    const orphanWebhooks= (orphanWebhookRows.rows ?? []) as unknown[];

    res.json({
      summary: {
        missingFeeCount:     missingFee.length,
        mathMismatchCount:   mathMismatch.length,
        orphanWebhookCount:  orphanWebhooks.length,
        hasIssues: missingFee.length + mathMismatch.length + orphanWebhooks.length > 0,
      },
      missingFee,
      mathMismatch,
      orphanWebhooks,
    });
  } catch (err) {
    logger.error("Reconciliation error", err as Error, { source: "billing-routes" });
    res.status(500).json({ error: "Failed to fetch reconciliation data" });
  }
});

export default router;
