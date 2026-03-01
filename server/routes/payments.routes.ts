import { Router } from "express";
import { db } from "../db";
import { payments, bookings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../auth";
import { getPaymentProvider } from "../payments";
import { logger } from "../lib/logger";
import { z } from "zod";
import { randomUUID } from "crypto";

const router = Router();

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

    const orderId = randomUUID();
    const returnUrl = `${process.env.APP_URL ?? "https://aurelle.uz"}/client`;

    const { paymentUrl, externalId } = await provider.createPayment({
      orderId,
      amountUzs,
      description: `Бронирование #${bookingId}`,
      returnUrl,
    });

    // Persist payment record
    const [payment] = await db
      .insert(payments)
      .values({
        bookingId,
        provider: process.env.PAYMENT_PROVIDER ?? "payme",
        externalId: externalId || null,
        orderId,
        amountUzs,
        type,
        status: "pending",
      })
      .returning();

    logger.info("Payment created", {
      source: "payments",
      meta: { orderId, bookingId, amountUzs, type, userId },
    });

    return res.json({ paymentUrl, orderId, paymentId: payment.id });
  } catch (err) {
    logger.error("Create payment error", err instanceof Error ? err : new Error(String(err)), {
      source: "payments",
    });
    return res.status(500).json({ error: "Failed to create payment" });
  }
});

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
