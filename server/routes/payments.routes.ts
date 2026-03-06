import { Router } from "express";
import { db } from "../db";
import { payments, bookings, salons, masters, webhookEvents } from "@shared/schema";
import { adminUsers } from "@shared/admin-schema";
import { eq, inArray, and, gte, sql, desc, isNotNull, count, SQL } from "drizzle-orm";
import { isAuthenticated } from "../auth";
import { getPaymentProvider } from "../payments";
import { logger } from "../lib/logger";
import { z } from "zod";
import { randomUUID } from "crypto";
import { calculateFee } from "../lib/billing";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseWindowHours(w: string | undefined): number {
  if (w === "7d") return 7 * 24;
  if (w === "30d") return 30 * 24;
  return 24; // default: 24h
}

function cutoffFromHours(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/** Determines scoped WHERE fragment for payments queries based on auth role. */
async function getPaymentScope(
  req: any,
  salonIdOverride?: string,
): Promise<{
  // null = no filter (admin sees all)
  whereClause: SQL<unknown> | null;
  salonIds: string[] | null; // owner's salon IDs (for display)
  enabled: boolean;
}> {
  const userId: string = req.user.claims.sub;
  const enabled = !!process.env.PAYMENT_PROVIDER;

  // ── Admin ──────────────────────────────────────────────────────────────────
  const [adminRow] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId));
  if (adminRow) {
    return { whereClause: null, salonIds: null, enabled };
  }

  // ── Owner ──────────────────────────────────────────────────────────────────
  const ownerSalons = await db
    .select({ id: salons.id })
    .from(salons)
    .where(eq(salons.ownerId, userId));
  if (ownerSalons.length > 0) {
    const ownerSalonIds = ownerSalons.map((s) => s.id);
    // Honor ?salonId= filter if it belongs to owner
    if (salonIdOverride && ownerSalonIds.includes(salonIdOverride)) {
      return {
        whereClause: eq(payments.salonId, salonIdOverride),
        salonIds: ownerSalonIds,
        enabled,
      };
    }
    return {
      whereClause: inArray(payments.salonId, ownerSalonIds),
      salonIds: ownerSalonIds,
      enabled,
    };
  }

  // ── Master ─────────────────────────────────────────────────────────────────
  const [masterRow] = await db
    .select({ id: masters.id })
    .from(masters)
    .where(eq(masters.userId, userId));
  if (masterRow) {
    return {
      whereClause: eq(payments.masterId, masterRow.id),
      salonIds: null,
      enabled,
    };
  }

  // ── Client (default) ───────────────────────────────────────────────────────
  return {
    whereClause: eq(payments.clientId, userId),
    salonIds: null,
    enabled,
  };
}

// ─── Create payment ──────────────────────────────────────────────────────────

const createSchema = z.object({
  bookingId: z.string().min(1),
  type: z.enum(["full", "deposit"]),
});

/**
 * POST /api/payments/create
 * Creates a payment record and returns the provider checkout URL.
 */
router.post("/create", isAuthenticated, async (req: any, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "bookingId and type are required" });
  }

  const { bookingId, type } = parsed.data;
  const userId = req.user.claims.sub;

  const provider = getPaymentProvider();
  if (!provider) {
    return res.status(503).json({ error: "Payment provider not configured" });
  }

  try {
    // Fetch booking to get amount and verify ownership
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    if (booking.clientId !== userId) {
      return res.status(403).json({ error: "Not your booking" });
    }

    const salon = await db.query.salons?.findFirst?.({ where: (s: any, { eq }: any) => eq(s.id, booking.salonId) });
    const paymentEnabled = (salon as any)?.paymentEnabled ?? false;
    if (!paymentEnabled) {
      return res.status(422).json({ error: "Payments not enabled for this salon" });
    }

    const totalPrice = booking.priceSnapshot ?? 0;
    const depositPercent = (salon as any)?.depositPercent ?? 0;
    const amountUzs =
      type === "deposit" && depositPercent > 0
        ? Math.round((totalPrice * depositPercent) / 100)
        : totalPrice;

    if (amountUzs <= 0) {
      return res.status(422).json({ error: "Invalid payment amount" });
    }

    // Calculate and snapshot platform fee (fire-safe: returns 0% on config errors)
    const fee = await calculateFee(amountUzs, booking.salonId);

    const orderId = randomUUID();
    const returnUrl = `${process.env.APP_URL ?? "https://aurelle.uz"}/client`;

    const { paymentUrl, externalId } = await provider.createPayment({
      orderId,
      amountUzs,
      description: `Бронирование #${bookingId}`,
      returnUrl,
    });

    // Persist payment record (with scoping columns from booking)
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId,
        provider: process.env.PAYMENT_PROVIDER ?? "payme",
        externalId: externalId || null,
        orderId,
        amountUzs,
        // Fee snapshot — locked in at creation so rate changes don't affect history
        grossAmountUzs: fee.grossAmountUzs,
        feePercent: String(fee.feePercent),
        platformFeeUzs: fee.platformFeeUzs,
        netAmountUzs: fee.netAmountUzs,
        type,
        status: "pending",
        salonId: booking.salonId ?? null,
        masterId: booking.masterId ?? null,
        clientId: booking.clientId ?? null,
      })
      .returning();

    logger.info("Payment created", {
      source: "payments",
      meta: {
        orderId,
        bookingId,
        amountUzs,
        type,
        userId,
        feePercent: fee.feePercent,
        platformFeeUzs: fee.platformFeeUzs,
        netAmountUzs: fee.netAmountUzs,
      },
    });

    return res.json({ paymentUrl, orderId, paymentId: payment.id });
  } catch (err) {
    logger.error("Create payment error", err instanceof Error ? err : new Error(String(err)), {
      source: "payments",
    });
    return res.status(500).json({ error: "Failed to create payment" });
  }
});

// ─── Health summary ───────────────────────────────────────────────────────────

/**
 * GET /api/payments/health?window=24h|7d|30d
 * Returns aggregated payment health metrics scoped to the authenticated user's role.
 */
router.get("/health", isAuthenticated, async (req: any, res) => {
  try {
    const windowHours = parseWindowHours(req.query.window as string | undefined);
    const cutoff = cutoffFromHours(windowHours);
    const { whereClause, salonIds, enabled } = await getPaymentScope(req, req.query.salonId as string | undefined);

    // Base time filter
    const timeFilter = gte(payments.createdAt, cutoff);
    const scopeFilter = whereClause ? and(timeFilter, whereClause) : timeFilter;

    // Counts by status
    const statusRows = await db
      .select({
        status: payments.status,
        cnt: count(),
        grossSum: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'succeeded' THEN ${payments.amountUzs} ELSE 0 END), 0)`,
      })
      .from(payments)
      .where(scopeFilter)
      .groupBy(payments.status);

    const counts = { succeeded: 0, failed: 0, pending: 0, cancelled: 0 };
    let gross = 0;
    for (const row of statusRows) {
      const s = (row.status ?? "pending") as keyof typeof counts;
      if (s in counts) counts[s] = Number(row.cnt);
      if (s === "succeeded") gross = Number(row.grossSum);
    }
    const total = counts.succeeded + counts.failed + counts.pending + counts.cancelled;
    const successRate = total > 0 ? counts.succeeded / total : 0;

    // Webhook errors in window
    const [weRow] = await db
      .select({ cnt: count() })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.ok, false), gte(webhookEvents.receivedAt, cutoff)));
    const webhookErrors = Number(weRow?.cnt ?? 0);

    // By provider
    const providerRows = await db
      .select({
        provider: payments.provider,
        status: payments.status,
        cnt: count(),
        gross: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'succeeded' THEN ${payments.amountUzs} ELSE 0 END), 0)`,
      })
      .from(payments)
      .where(scopeFilter)
      .groupBy(payments.provider, payments.status);

    const byProvider: Record<string, { succeeded: number; failed: number; pending: number; gross: number }> = {};
    for (const row of providerRows) {
      const p = row.provider ?? "unknown";
      if (!byProvider[p]) byProvider[p] = { succeeded: 0, failed: 0, pending: 0, gross: 0 };
      const s = (row.status ?? "pending") as "succeeded" | "failed" | "pending";
      if (s in byProvider[p]) byProvider[p][s] = Number(row.cnt);
      if (s === "succeeded") byProvider[p].gross = Number(row.gross);
    }

    // Top error messages (from failed payments)
    const errorRows = await db
      .select({
        message: payments.errorMessage,
        cnt: count(),
      })
      .from(payments)
      .where(
        and(
          scopeFilter,
          eq(payments.status, "failed"),
          isNotNull(payments.errorMessage),
        ),
      )
      .groupBy(payments.errorMessage)
      .orderBy(desc(count()))
      .limit(5);

    const topErrors = errorRows.map((r) => ({
      message: r.message ?? "",
      count: Number(r.cnt),
    }));

    return res.json({
      windowHours,
      counts,
      gross,
      successRate,
      webhookErrors,
      byProvider,
      topErrors,
      enabled,
      salonIds,
    });
  } catch (err) {
    logger.error("Payment health error", err instanceof Error ? err : new Error(String(err)), {
      source: "payments",
    });
    return res.status(500).json({ error: "Failed to fetch payment health" });
  }
});

// ─── Health timeseries ────────────────────────────────────────────────────────

/**
 * GET /api/payments/health/timeseries?window=24h|7d|30d&bucket=hour|day
 */
router.get("/health/timeseries", isAuthenticated, async (req: any, res) => {
  try {
    const windowHours = parseWindowHours(req.query.window as string | undefined);
    const cutoff = cutoffFromHours(windowHours);
    const rawBucket = req.query.bucket as string | undefined;
    // auto-select bucket if not specified
    const bucket = rawBucket === "hour" || rawBucket === "day"
      ? rawBucket
      : windowHours <= 24 ? "hour" : "day";

    const { whereClause } = await getPaymentScope(req, req.query.salonId as string | undefined);
    const timeFilter = gte(payments.createdAt, cutoff);
    const scopeFilter = whereClause ? and(timeFilter, whereClause) : timeFilter;

    const rows = await db
      .select({
        bucket: sql<string>`DATE_TRUNC(${bucket}, ${payments.createdAt})`,
        status: payments.status,
        cnt: count(),
        gross: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'succeeded' THEN ${payments.amountUzs} ELSE 0 END), 0)`,
      })
      .from(payments)
      .where(scopeFilter)
      .groupBy(sql`DATE_TRUNC(${bucket}, ${payments.createdAt})`, payments.status)
      .orderBy(sql`DATE_TRUNC(${bucket}, ${payments.createdAt})`);

    // Pivot: bucket → { succeeded, failed, pending, gross }
    const bucketMap: Record<string, { bucket: string; succeeded: number; failed: number; pending: number; gross: number }> = {};
    for (const row of rows) {
      const b = String(row.bucket);
      if (!bucketMap[b]) bucketMap[b] = { bucket: b, succeeded: 0, failed: 0, pending: 0, gross: 0 };
      const s = (row.status ?? "pending") as "succeeded" | "failed" | "pending";
      if (s in bucketMap[b]) bucketMap[b][s] = Number(row.cnt);
      if (s === "succeeded") bucketMap[b].gross = Number(row.gross);
    }

    return res.json({ timeseries: Object.values(bucketMap), bucket, windowHours });
  } catch (err) {
    logger.error("Payment timeseries error", err instanceof Error ? err : new Error(String(err)), {
      source: "payments",
    });
    return res.status(500).json({ error: "Failed to fetch payment timeseries" });
  }
});

// ─── Health recent ────────────────────────────────────────────────────────────

/**
 * GET /api/payments/health/recent?limit=20
 */
router.get("/health/recent", isAuthenticated, async (req: any, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const { whereClause } = await getPaymentScope(req, req.query.salonId as string | undefined);

    const rows = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        provider: payments.provider,
        status: payments.status,
        amountUzs: payments.amountUzs,
        type: payments.type,
        errorMessage: payments.errorMessage,
        createdAt: payments.createdAt,
        bookingId: payments.bookingId,
        salonId: payments.salonId,
      })
      .from(payments)
      .where(whereClause ?? undefined)
      .orderBy(desc(payments.createdAt))
      .limit(limit);

    return res.json({ payments: rows });
  } catch (err) {
    logger.error("Payment recent error", err instanceof Error ? err : new Error(String(err)), {
      source: "payments",
    });
    return res.status(500).json({ error: "Failed to fetch recent payments" });
  }
});

// ─── Get single payment ───────────────────────────────────────────────────────

/**
 * GET /api/payments/:orderId
 * Returns payment status for the authenticated client.
 */
router.get("/:orderId", isAuthenticated, async (req: any, res) => {
  const { orderId } = req.params;
  const userId = req.user.claims.sub;

  try {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Verify booking belongs to this user
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, payment.bookingId));
    if (!booking || booking.clientId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json({
      orderId: payment.orderId,
      status: payment.status,
      amountUzs: payment.amountUzs,
      type: payment.type,
      provider: payment.provider,
      createdAt: payment.createdAt,
    });
  } catch (err) {
    logger.error("Get payment error", err instanceof Error ? err : new Error(String(err)), {
      source: "payments",
    });
    return res.status(500).json({ error: "Failed to get payment" });
  }
});

export default router;
