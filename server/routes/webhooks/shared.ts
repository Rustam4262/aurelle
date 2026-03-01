import type { Request, Response } from "express";
import { db } from "../../db";
import { payments, bookings, webhookEvents } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { PaymentProvider } from "../../payments/types";
import { logger } from "../../lib/logger";
import { broadcast, broadcastToUser } from "../../lib/websocket";

/**
 * Shared webhook handler: verifies signature, updates payment + booking status,
 * records a webhook_events audit row, and broadcasts WS events.
 */
export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  provider: PaymentProvider,
  providerName: string,
): Promise<void> {
  const receivedAt = new Date();

  // Insert audit row (ok=false initially; updated on success/error)
  let auditId: string | null = null;
  try {
    // Sanitize raw body: strip known secret fields
    const rawBody = req.body as Record<string, unknown>;
    const sanitized = { ...rawBody };
    for (const key of ["sign_string", "password", "secret", "key"]) {
      if (sanitized[key]) sanitized[key] = "***";
    }

    const [auditRow] = await db
      .insert(webhookEvents)
      .values({
        provider: providerName,
        receivedAt,
        ok: false,
        raw: sanitized,
      })
      .returning({ id: webhookEvents.id });
    auditId = auditRow?.id ?? null;
  } catch (auditErr) {
    logger.warn(`${providerName} webhook: failed to insert audit row`, {
      source: `webhooks-${providerName}`,
      meta: { error: String(auditErr) },
    });
  }

  const event = await provider.verifyWebhook(req);

  if (!event) {
    // Update audit row: ignored (not a terminal event or invalid signature)
    if (auditId) {
      void db
        .update(webhookEvents)
        .set({ processedAt: new Date(), ok: true, error: "ignored" })
        .where(eq(webhookEvents.id, auditId))
        .catch(() => {});
    }
    res.status(200).json({ ok: false, reason: "ignored" });
    return;
  }

  // Update audit row with orderId + eventType
  if (auditId) {
    void db
      .update(webhookEvents)
      .set({ orderId: event.orderId, eventType: event.status })
      .where(eq(webhookEvents.id, auditId))
      .catch(() => {});
  }

  try {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, event.orderId));
    if (!payment) {
      logger.warn(`${providerName} webhook: unknown orderId`, {
        source: `webhooks-${providerName}`,
        meta: { orderId: event.orderId },
      });
      if (auditId) {
        void db
          .update(webhookEvents)
          .set({ processedAt: new Date(), ok: false, error: "orderId not found" })
          .where(eq(webhookEvents.id, auditId))
          .catch(() => {});
      }
      res.status(200).json({ ok: false, reason: "not_found" });
      return;
    }

    // Determine error tracking fields
    const isFailed = event.status === "failed" || event.status === "cancelled";
    const errorMsg = isFailed ? `Payment ${event.status} by ${providerName}` : null;

    // Update payment record
    await db
      .update(payments)
      .set({
        status: event.status,
        externalId: event.externalId || payment.externalId,
        errorMessage: errorMsg,
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

    // Mark audit row as successful
    if (auditId) {
      void db
        .update(webhookEvents)
        .set({ processedAt: new Date(), ok: true })
        .where(eq(webhookEvents.id, auditId))
        .catch(() => {});
    }

    // WebSocket: notify all relevant parties
    const wsPayload = {
      orderId: event.orderId,
      status: event.status,
      paymentId: payment.id,
      bookingId: payment.bookingId,
    };
    broadcast("admin", "payment_status_changed", wsPayload);
    if (payment.salonId) broadcast(`salon_${payment.salonId}`, "payment_status_changed", wsPayload);
    if (payment.clientId) broadcastToUser(payment.clientId, "payment_status_changed", wsPayload);
    if (payment.masterId) broadcastToUser(payment.masterId, "payment_status_changed", wsPayload);

    logger.info(`${providerName} webhook processed`, {
      source: `webhooks-${providerName}`,
      meta: { orderId: event.orderId, status: event.status, paymentId: payment.id },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(
      `${providerName} webhook DB error`,
      err instanceof Error ? err : new Error(errMsg),
      { source: `webhooks-${providerName}` },
    );
    if (auditId) {
      void db
        .update(webhookEvents)
        .set({ processedAt: new Date(), ok: false, error: errMsg })
        .where(eq(webhookEvents.id, auditId))
        .catch(() => {});
    }
    res.status(500).json({ error: "Internal error" });
  }
}
