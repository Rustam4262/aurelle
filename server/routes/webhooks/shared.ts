import type { Request, Response } from "express";
import { db } from "../../db";
import { payments, bookings } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { PaymentProvider } from "../../payments/types";
import { logger } from "../../lib/logger";
import { sql } from "drizzle-orm";

/**
 * Shared webhook handler: verifies signature, updates payment + booking status.
 */
export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  provider: PaymentProvider,
  providerName: string,
): Promise<void> {
  const event = await provider.verifyWebhook(req);

  if (!event) {
    // Return 200 so provider doesn't keep retrying unrecognised events
    res.status(200).json({ ok: false, reason: "ignored" });
    return;
  }

  try {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, event.orderId));
    if (!payment) {
      logger.warn(`${providerName} webhook: unknown orderId`, {
        source: `webhooks-${providerName}`,
        meta: { orderId: event.orderId },
      });
      res.status(200).json({ ok: false, reason: "not_found" });
      return;
    }

    // Update payment record
    await db
      .update(payments)
      .set({
        status: event.status,
        externalId: event.externalId || payment.externalId,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Sync booking payment status
    const bookingPaymentStatus =
      event.status === "succeeded"
        ? "paid"
        : event.status === "cancelled" || event.status === "failed"
          ? "not_required"
          : "pending";

    await db
      .update(bookings)
      .set({ paymentStatus: bookingPaymentStatus })
      .where(eq(bookings.id, payment.bookingId));

    logger.info(`${providerName} webhook processed`, {
      source: `webhooks-${providerName}`,
      meta: { orderId: event.orderId, status: event.status, paymentId: payment.id },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error(
      `${providerName} webhook DB error`,
      err instanceof Error ? err : new Error(String(err)),
      { source: `webhooks-${providerName}` },
    );
    res.status(500).json({ error: "Internal error" });
  }
}
