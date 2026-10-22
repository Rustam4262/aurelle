import crypto from "crypto";
import { db } from "../db";
import { payments, bookings, webhookEvents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { broadcast, broadcastToUser } from "../lib/websocket";
import { transitionPayment, PaymentTransitionError } from "../lib/payment-fsm";
import { timingSafeEqualStrings } from "../lib/timing-safe";

/**
 * Click (click.uz) merchant webhook — Prepare/Complete two-step protocol.
 *
 * Action codes (per Click's merchant API, NOT the generic 1/2 the previous
 * implementation assumed): 0 = Prepare, 1 = Complete. There is no action=2.
 *
 * Signature:
 *   Prepare:  MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 *   Complete: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 *
 * Every response (success or failure) must be the same shape Click expects —
 * {click_trans_id, merchant_trans_id, merchant_prepare_id, error, error_note} —
 * never the generic {ok, reason} shape used for the old, protocol-agnostic
 * handler. Click retries indefinitely on anything it can't parse as success.
 */

interface ClickBody {
  click_trans_id?: string | number;
  service_id?: string | number;
  merchant_trans_id?: string;
  merchant_prepare_id?: string | number;
  amount?: string | number;
  action?: string | number;
  sign_time?: string;
  sign_string?: string;
  error?: string | number;
  error_note?: string;
}

type ClickMeta = { preparedId: number; clickTransId: string; preparedAt: number };

const ERROR_CODES = {
  SUCCESS: 0,
  SIGN_FAILED: -1,
  INVALID_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  INTERNAL_ERROR: -7,
  BAD_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

function respond(
  res: import("express").Response,
  body: ClickBody,
  error: number,
  errorNote: string,
  extra?: { merchant_prepare_id?: number },
) {
  res.status(200).json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_prepare_id: extra?.merchant_prepare_id,
    error,
    error_note: errorNote,
  });
}

async function auditRow(body: ClickBody, eventType: string) {
  const sanitized: Record<string, unknown> = { ...body };
  delete sanitized.sign_string;
  try {
    const [row] = await db
      .insert(webhookEvents)
      .values({
        provider: "click",
        eventType,
        orderId: body.merchant_trans_id ?? null,
        ok: false,
        raw: sanitized,
      })
      .returning({ id: webhookEvents.id });
    return row?.id ?? null;
  } catch (err) {
    logger.warn("Click webhook: failed to insert audit row", {
      source: "webhooks-click",
      meta: { error: String(err) },
    });
    return null;
  }
}

async function closeAudit(auditId: string | null, ok: boolean, error?: string) {
  if (!auditId) return;
  void db
    .update(webhookEvents)
    .set({ processedAt: new Date(), ok, error: error ?? null })
    .where(eq(webhookEvents.id, auditId))
    .catch(() => {});
}

function verifySignature(body: ClickBody, secretKey: string, includePrepareId: boolean): boolean {
  const parts = [
    String(body.click_trans_id ?? ""),
    String(body.service_id ?? ""),
    secretKey,
    String(body.merchant_trans_id ?? ""),
    ...(includePrepareId ? [String(body.merchant_prepare_id ?? "")] : []),
    String(body.amount ?? ""),
    String(body.action ?? ""),
    String(body.sign_time ?? ""),
  ];
  const expected = crypto.createHash("md5").update(parts.join("")).digest("hex");
  return timingSafeEqualStrings(String(body.sign_string ?? ""), expected);
}

function syncBookingPaymentStatus(bookingId: string, status: "paid" | "pending") {
  return db.update(bookings).set({ paymentStatus: status }).where(eq(bookings.id, bookingId));
}

function broadcastPaymentEvent(
  payment: {
    id: string;
    bookingId: string;
    salonId: string | null;
    masterId: string | null;
    clientId: string | null;
  },
  status: string,
) {
  const wsPayload = {
    orderId: payment.id,
    status,
    paymentId: payment.id,
    bookingId: payment.bookingId,
  };
  broadcast("admin", "payment_status_changed", wsPayload);
  if (payment.salonId) broadcast(`salon_${payment.salonId}`, "payment_status_changed", wsPayload);
  if (payment.clientId) broadcastToUser(payment.clientId, "payment_status_changed", wsPayload);
  if (payment.masterId) broadcastToUser(payment.masterId, "payment_status_changed", wsPayload);
}

export async function handleClickWebhook(
  body: ClickBody,
  res: import("express").Response,
): Promise<void> {
  const serviceId = process.env.CLICK_SERVICE_ID;
  const secretKey = process.env.CLICK_SECRET_KEY;
  if (!serviceId || !secretKey) {
    respond(res, body, ERROR_CODES.INTERNAL_ERROR, "Provider not configured");
    return;
  }

  if (
    body.click_trans_id === undefined ||
    body.service_id === undefined ||
    !body.merchant_trans_id ||
    body.amount === undefined ||
    body.action === undefined ||
    !body.sign_time ||
    !body.sign_string
  ) {
    respond(res, body, ERROR_CODES.BAD_REQUEST, "Missing required fields");
    return;
  }

  const action = String(body.action);
  if (action !== "0" && action !== "1") {
    respond(res, body, ERROR_CODES.ACTION_NOT_FOUND, "Action not found");
    return;
  }

  const auditId = await auditRow(body, action === "0" ? "prepare" : "complete");

  if (!verifySignature(body, secretKey, action === "1")) {
    logger.warn("Click webhook: signature mismatch", { source: "webhooks-click" });
    await closeAudit(auditId, false, "sign_check_failed");
    respond(res, body, ERROR_CODES.SIGN_FAILED, "SIGN CHECK FAILED");
    return;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, body.merchant_trans_id));
  if (!payment) {
    await closeAudit(auditId, false, "order_not_found");
    respond(res, body, ERROR_CODES.ORDER_NOT_FOUND, "Order not found");
    return;
  }

  if (Number(body.amount) !== payment.amountUzs) {
    logger.warn("Click webhook: amount mismatch", {
      source: "webhooks-click",
      meta: { orderId: payment.orderId, expected: payment.amountUzs, received: body.amount },
    });
    await closeAudit(auditId, false, "amount_mismatch");
    respond(res, body, ERROR_CODES.INVALID_AMOUNT, "Incorrect parameter amount");
    return;
  }

  const clickTransId = String(body.click_trans_id);
  const metadata = (payment.metadata ?? {}) as { click?: ClickMeta };

  // ── Prepare ────────────────────────────────────────────────────────────────
  if (action === "0") {
    if (payment.status === "succeeded") {
      await closeAudit(auditId, true, "already_paid");
      respond(res, body, ERROR_CODES.ALREADY_PAID, "Already paid");
      return;
    }
    if (payment.status !== "pending") {
      await closeAudit(auditId, false, "not_payable");
      respond(res, body, ERROR_CODES.TRANSACTION_CANCELLED, "Order is not payable");
      return;
    }

    // Idempotent replay: the same Click transaction retrying Prepare gets the
    // same merchant_prepare_id back instead of a freshly generated one.
    const preparedId =
      metadata.click?.clickTransId === clickTransId
        ? metadata.click.preparedId
        : Math.floor(Math.random() * 1_000_000_000);

    if (metadata.click?.clickTransId !== clickTransId) {
      await db
        .update(payments)
        .set({
          metadata: { ...metadata, click: { preparedId, clickTransId, preparedAt: Date.now() } },
        })
        .where(eq(payments.id, payment.id));
    }

    await closeAudit(auditId, true);
    respond(res, body, ERROR_CODES.SUCCESS, "Success", { merchant_prepare_id: preparedId });
    return;
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  const prepared = metadata.click;
  if (
    !prepared ||
    prepared.clickTransId !== clickTransId ||
    prepared.preparedId !== Number(body.merchant_prepare_id)
  ) {
    await closeAudit(auditId, false, "no_matching_prepare");
    respond(res, body, ERROR_CODES.TRANSACTION_NOT_FOUND, "Transaction does not exist");
    return;
  }

  if (payment.status === "succeeded") {
    // Idempotent replay of a previously-completed transaction.
    await closeAudit(auditId, true, "duplicate");
    respond(res, body, ERROR_CODES.SUCCESS, "Success", {
      merchant_prepare_id: prepared.preparedId,
    });
    return;
  }

  const clickReportsFailure = Number(body.error ?? 0) !== 0;

  try {
    if (clickReportsFailure) {
      await transitionPayment(payment.id, "failed", {
        externalId: clickTransId,
        errorCode: String(body.error),
        errorMessage: body.error_note ?? "Click reported failure",
      });
      await syncBookingPaymentStatus(payment.bookingId, "pending");
      broadcastPaymentEvent(payment, "failed");
    } else {
      await transitionPayment(payment.id, "succeeded", { externalId: clickTransId });
      await syncBookingPaymentStatus(payment.bookingId, "paid");
      broadcastPaymentEvent(payment, "succeeded");
    }
  } catch (err) {
    if (err instanceof PaymentTransitionError) {
      logger.warn("Click webhook: FSM transition blocked", {
        source: "webhooks-click",
        meta: { orderId: payment.orderId, from: err.from, to: err.to },
      });
      await closeAudit(auditId, false, `invalid_transition:${err.from}->${err.to}`);
      respond(res, body, ERROR_CODES.TRANSACTION_CANCELLED, "Invalid transaction state");
      return;
    }
    logger.error(
      "Click webhook processing error",
      err instanceof Error ? err : new Error(String(err)),
      {
        source: "webhooks-click",
      },
    );
    await closeAudit(auditId, false, String(err));
    respond(res, body, ERROR_CODES.INTERNAL_ERROR, "Internal error");
    return;
  }

  await closeAudit(auditId, true);
  respond(res, body, ERROR_CODES.SUCCESS, "Success", { merchant_prepare_id: prepared.preparedId });
}
