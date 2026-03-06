import type { Request, Response } from "express";
import { db } from "../../db";
import { payments, bookings, webhookEvents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { PaymentProvider } from "../../payments/types";
import { logger } from "../../lib/logger";
import { broadcast, broadcastToUser } from "../../lib/websocket";
import { transitionPayment, PaymentTransitionError, type PaymentStatus } from "../../lib/payment-fsm";

/**
 * Shared webhook handler:
 * 1. Inserts an audit row (ok=false initially).
 * 2. Verifies the provider signature → gets { orderId, status, externalId }.
 * 3. IDEMPOTENCY: if this externalId was already processed successfully → return 200.
 * 4. Applies STATE MACHINE transition via transitionPayment() — no invalid transitions.
 * 5. Syncs booking.paymentStatus and broadcasts WebSocket events.
 * 6. Marks the audit row ok=true and stores externalEventId for future dedup.
 */
export async function handlePaymentWebhook(
  req: Request,
  res: Response,
  provider: PaymentProvider,
  providerName: string,
): Promise<void> {
  const receivedAt = new Date();

  // ── 1. Insert audit row ───────────────────────────────────────────────────────
  let auditId: string | null = null;
  try {
    const rawBody = req.body as Record<string, unknown>;
    const sanitized = { ...rawBody };
    for (const key of ["sign_string", "password", "secret", "key"]) {
      if (sanitized[key]) sanitized[key] = "***";
    }
    const [auditRow] = await db
      .insert(webhookEvents)
      .values({ provider: providerName, receivedAt, ok: false, raw: sanitized })
      .returning({ id: webhookEvents.id });
    auditId = auditRow?.id ?? null;
  } catch (auditErr) {
    logger.warn(`${providerName} webhook: failed to insert audit row`, {
      source: `webhooks-${providerName}`,
      meta: { error: String(auditErr) },
    });
  }

  // ── 2. Verify provider signature ──────────────────────────────────────────────
  const event = await provider.verifyWebhook(req);

  if (!event) {
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

  // Stamp audit row with orderId + eventType for searchability
  if (auditId) {
    void db
      .update(webhookEvents)
      .set({ orderId: event.orderId, eventType: event.status })
      .where(eq(webhookEvents.id, auditId))
      .catch(() => {});
  }

  // ── 3. Idempotency check ──────────────────────────────────────────────────────
  // If a completed audit row already exists for this provider event ID → duplicate.
  if (event.externalId) {
    const [existing] = await db
      .select({ id: webhookEvents.id })
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.externalEventId, event.externalId),
          eq(webhookEvents.ok, true),
        ),
      )
      .limit(1);

    if (existing) {
      logger.info(`${providerName} webhook duplicate — already processed`, {
        source: `webhooks-${providerName}`,
        meta: { orderId: event.orderId, externalId: event.externalId },
      });
      if (auditId) {
        void db
          .update(webhookEvents)
          .set({
            processedAt: new Date(),
            ok: true,
            error: "duplicate",
            externalEventId: event.externalId,
          })
          .where(eq(webhookEvents.id, auditId))
          .catch(() => {});
      }
      res.status(200).json({ ok: true, reason: "duplicate" });
      return;
    }
  }

  // ── 4. Process payment via state machine ──────────────────────────────────────
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

    const isFailed = event.status === "failed" || event.status === "cancelled";
    const errorMsg = isFailed ? `Payment ${event.status} by ${providerName}` : null;

    // State machine transition — throws PaymentTransitionError for invalid moves
    await transitionPayment(payment.id, event.status as PaymentStatus, {
      externalId: event.externalId || payment.externalId || undefined,
      errorMessage: errorMsg,
    });

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

    // Mark audit row successful + store idempotency key
    if (auditId) {
      void db
        .update(webhookEvents)
        .set({
          processedAt: new Date(),
          ok: true,
          externalEventId: event.externalId || null,
        })
        .where(eq(webhookEvents.id, auditId))
        .catch(() => {});
    }

    // WebSocket notifications
    const wsPayload = {
      orderId: event.orderId,
      status: event.status,
      paymentId: payment.id,
      bookingId: payment.bookingId,
    };
    broadcast("admin", "payment_status_changed", wsPayload);
    if (payment.salonId)  broadcast(`salon_${payment.salonId}`, "payment_status_changed", wsPayload);
    if (payment.clientId) broadcastToUser(payment.clientId, "payment_status_changed", wsPayload);
    if (payment.masterId) broadcastToUser(payment.masterId, "payment_status_changed", wsPayload);

    logger.info(`${providerName} webhook processed`, {
      source: `webhooks-${providerName}`,
      meta: { orderId: event.orderId, status: event.status, paymentId: payment.id },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    // Invalid FSM transition → log violation, don't let provider retry forever
    if (err instanceof PaymentTransitionError) {
      logger.warn(`${providerName} webhook: FSM transition blocked`, {
        source: `webhooks-${providerName}`,
        meta: { orderId: event.orderId, from: err.from, to: err.to },
      });
      if (auditId) {
        void db
          .update(webhookEvents)
          .set({
            processedAt: new Date(),
            ok: false,
            error: `invalid_transition:${err.from}→${err.to}`,
          })
          .where(eq(webhookEvents.id, auditId))
          .catch(() => {});
      }
      // 200 so the provider stops retrying a permanently invalid state
      res.status(200).json({ ok: false, reason: "invalid_transition" });
      return;
    }

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
