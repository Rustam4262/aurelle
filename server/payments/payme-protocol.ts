import { db } from "../db";
import { payments, bookings, webhookEvents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { broadcast, broadcastToUser } from "../lib/websocket";
import { transitionPayment, PaymentTransitionError } from "../lib/payment-fsm";
import { timingSafeEqualStrings } from "../lib/timing-safe";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Payme (paycom.uz) merchant webhook — full JSON-RPC 2.0 protocol.
 *
 * This is a stateful transaction protocol, not a one-shot status callback:
 * Payme calls CheckPerformTransaction before showing its own payment screen,
 * then CreateTransaction (idempotent — it retries this), then PerformTransaction
 * (also idempotently retried) once the user pays, and CancelTransaction for a
 * refund or a payment that never completed. CheckTransaction is Payme's own
 * reconciliation call. None of this fits the generic {ok} webhook shape used
 * for Click-style single-callback providers — hence a dedicated handler.
 *
 * GetStatement (bulk reconciliation report) is NOT implemented — it is used
 * for Payme's back-office statement export, not for a transaction to
 * complete, and is lower priority than the five methods below.
 */

type PaymeState = 1 | 2 | -1 | -2;

interface PaymeMeta {
  state: PaymeState;
  createTime: number;
  performTime: number;
  cancelTime: number;
  reason: number | null;
}

const PAYME_ERROR = {
  PARSE_ERROR: -32700,
  METHOD_NOT_FOUND: -32601,
  INSUFFICIENT_PRIVILEGE: -32504,
  INVALID_AMOUNT: -31001,
  TRANSACTION_NOT_FOUND: -31003,
  CANNOT_PERFORM: -31008,
  ORDER_NOT_FOUND: -31050,
} as const;

const TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // Payme's standard 12h create→perform window

type JsonRpcId = string | number | null;

function errorResponse(id: JsonRpcId, code: number, message: string) {
  return { error: { code, message: { ru: message, en: message, uz: message } }, id };
}

function resultResponse(id: JsonRpcId, result: Record<string, unknown>) {
  return { result, id };
}

function metaOf(payment: { metadata: unknown }): PaymeMeta | null {
  const m = (payment.metadata as { payme?: PaymeMeta } | null)?.payme;
  return m ?? null;
}

async function saveMeta(
  paymentId: string,
  existingMetadata: unknown,
  meta: PaymeMeta,
  dbClient: DbClient = db,
) {
  const base = (existingMetadata as Record<string, unknown> | null) ?? {};
  await dbClient
    .update(payments)
    .set({ metadata: { ...base, payme: meta } })
    .where(eq(payments.id, paymentId));
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

async function auditRow(method: string, body: unknown, orderId: string | null) {
  const sanitized = { ...(body as Record<string, unknown>) };
  try {
    const [row] = await db
      .insert(webhookEvents)
      .values({ provider: "payme", eventType: method, orderId, ok: false, raw: sanitized })
      .returning({ id: webhookEvents.id });
    return row?.id ?? null;
  } catch (err) {
    logger.warn("Payme webhook: failed to insert audit row", {
      source: "webhooks-payme",
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

// ─── Method handlers ────────────────────────────────────────────────────────

async function checkPerformTransaction(
  id: JsonRpcId,
  params: { amount?: number; account?: { order_id?: string } },
) {
  const orderId = params.account?.order_id;
  if (!orderId) return errorResponse(id, PAYME_ERROR.ORDER_NOT_FOUND, "Order not found");

  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (!payment) return errorResponse(id, PAYME_ERROR.ORDER_NOT_FOUND, "Order not found");
  if (payment.status !== "pending")
    return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Order is not payable");
  if (Number(params.amount) !== payment.amountUzs * 100) {
    return errorResponse(id, PAYME_ERROR.INVALID_AMOUNT, "Incorrect amount");
  }
  return resultResponse(id, { allow: true });
}

async function createTransaction(
  id: JsonRpcId,
  params: { id?: string; time?: number; amount?: number; account?: { order_id?: string } },
) {
  const paymeTxId = params.id;
  const orderId = params.account?.order_id;
  if (!paymeTxId || !orderId)
    return errorResponse(id, PAYME_ERROR.ORDER_NOT_FOUND, "Order not found");

  // Idempotent replay: Payme retries CreateTransaction with the same id.
  const [existing] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.provider, "payme"), eq(payments.externalId, paymeTxId)));
  if (existing) {
    if (existing.orderId !== orderId || Number(params.amount) !== existing.amountUzs * 100) {
      return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Transaction parameters do not match");
    }
    const meta = metaOf(existing);
    if (!meta) return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Transaction state is corrupt");
    return resultResponse(id, {
      create_time: meta.createTime,
      transaction: existing.id,
      state: meta.state,
    });
  }

  const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
  if (!payment) return errorResponse(id, PAYME_ERROR.ORDER_NOT_FOUND, "Order not found");
  if (payment.externalId) {
    // This order already has a different Payme transaction attached.
    return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Order already has a transaction");
  }
  if (payment.status !== "pending")
    return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Order is not payable");
  if (Number(params.amount) !== payment.amountUzs * 100) {
    return errorResponse(id, PAYME_ERROR.INVALID_AMOUNT, "Incorrect amount");
  }
  const createdAgoMs = Date.now() - (payment.createdAt?.getTime() ?? Date.now());
  if (createdAgoMs > TRANSACTION_TIMEOUT_MS) {
    return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Transaction time has expired");
  }

  const createTime = params.time ?? Date.now();
  const meta: PaymeMeta = { state: 1, createTime, performTime: 0, cancelTime: 0, reason: null };
  await db
    .update(payments)
    .set({
      externalId: paymeTxId,
      metadata: { ...((payment.metadata as object) ?? {}), payme: meta },
    })
    .where(eq(payments.id, payment.id));

  return resultResponse(id, { create_time: createTime, transaction: payment.id, state: 1 });
}

async function performTransaction(id: JsonRpcId, params: { id?: string }) {
  const paymeTxId = params.id;
  if (!paymeTxId)
    return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.provider, "payme"), eq(payments.externalId, paymeTxId)));
  if (!payment)
    return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");
  const meta = metaOf(payment);
  if (!meta) return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

  if (meta.state === 2) {
    // Idempotent replay of an already-performed transaction.
    return resultResponse(id, {
      transaction: payment.id,
      perform_time: meta.performTime,
      state: 2,
    });
  }
  if (meta.state !== 1) {
    return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Unable to perform operation");
  }

  if (Date.now() - meta.createTime > TRANSACTION_TIMEOUT_MS) {
    const cancelled: PaymeMeta = { ...meta, state: -1, cancelTime: Date.now(), reason: 4 };
    try {
      await db.transaction(async (tx) => {
        await saveMeta(payment.id, payment.metadata, cancelled, tx);
        await transitionPayment(
          payment.id,
          "cancelled",
          { errorMessage: "Expired before PerformTransaction" },
          tx,
        );
      });
    } catch {
      /* already in a terminal state — fine */
    }
    return errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Transaction time has expired");
  }

  const performTime = Date.now();
  const performed: PaymeMeta = { ...meta, state: 2, performTime };
  try {
    await db.transaction(async (tx) => {
      await saveMeta(payment.id, payment.metadata, performed, tx);
      await transitionPayment(payment.id, "succeeded", { externalId: paymeTxId }, tx);
      await tx
        .update(bookings)
        .set({ paymentStatus: "paid" })
        .where(eq(bookings.id, payment.bookingId));
    });
  } catch (err) {
    if (err instanceof PaymentTransitionError) {
      // A concurrent retry already drove this payment to its final state —
      // the metadata write is idempotent, so just report success again.
      return resultResponse(id, { transaction: payment.id, perform_time: performTime, state: 2 });
    }
    throw err;
  }
  broadcastPaymentEvent(payment, "succeeded");

  return resultResponse(id, { transaction: payment.id, perform_time: performTime, state: 2 });
}

async function cancelTransaction(id: JsonRpcId, params: { id?: string; reason?: number }) {
  const paymeTxId = params.id;
  if (!paymeTxId)
    return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.provider, "payme"), eq(payments.externalId, paymeTxId)));
  if (!payment)
    return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");
  const meta = metaOf(payment);
  if (!meta) return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

  if (meta.state === -1 || meta.state === -2) {
    // Idempotent replay.
    return resultResponse(id, {
      transaction: payment.id,
      cancel_time: meta.cancelTime,
      state: meta.state,
    });
  }

  const newState: PaymeState = meta.state === 2 ? -2 : -1;
  const cancelTime = Date.now();
  const cancelled: PaymeMeta = {
    ...meta,
    state: newState,
    cancelTime,
    reason: params.reason ?? null,
  };

  await db.transaction(async (tx) => {
    await saveMeta(payment.id, payment.metadata, cancelled, tx);
    try {
      await transitionPayment(
        payment.id,
        newState === -2 ? "refunded" : "cancelled",
        { errorMessage: `Cancelled via Payme, reason ${params.reason ?? "unknown"}` },
        tx,
      );
    } catch (err) {
      if (!(err instanceof PaymentTransitionError)) throw err;
    }
    await tx
      .update(bookings)
      .set({ paymentStatus: newState === -2 ? "refunded" : "pending" })
      .where(eq(bookings.id, payment.bookingId));
  });
  broadcastPaymentEvent(payment, newState === -2 ? "refunded" : "cancelled");

  return resultResponse(id, { transaction: payment.id, cancel_time: cancelTime, state: newState });
}

async function checkTransaction(id: JsonRpcId, params: { id?: string }) {
  const paymeTxId = params.id;
  if (!paymeTxId)
    return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.provider, "payme"), eq(payments.externalId, paymeTxId)));
  const meta = payment ? metaOf(payment) : null;
  if (!payment || !meta)
    return errorResponse(id, PAYME_ERROR.TRANSACTION_NOT_FOUND, "Transaction not found");

  return resultResponse(id, {
    create_time: meta.createTime,
    perform_time: meta.performTime,
    cancel_time: meta.cancelTime,
    transaction: payment.id,
    state: meta.state,
    reason: meta.reason,
  });
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function handlePaymeWebhook(
  authHeader: string | undefined,
  body: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const secretKey = process.env.PAYME_SECRET_KEY;
  const rpc = body as { method?: string; params?: Record<string, unknown>; id?: JsonRpcId };
  const id = rpc?.id ?? null;

  if (!secretKey) {
    return {
      status: 200,
      json: errorResponse(id, PAYME_ERROR.INSUFFICIENT_PRIVILEGE, "Provider not configured"),
    };
  }

  if (!authHeader?.startsWith("Basic ")) {
    return {
      status: 200,
      json: errorResponse(
        id,
        PAYME_ERROR.INSUFFICIENT_PRIVILEGE,
        "Insufficient privilege to perform this method.",
      ),
    };
  }
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  const sepIndex = decoded.indexOf(":");
  const login = sepIndex === -1 ? decoded : decoded.slice(0, sepIndex);
  const password = sepIndex === -1 ? "" : decoded.slice(sepIndex + 1);
  if (!timingSafeEqualStrings(login, "Paycom") || !timingSafeEqualStrings(password, secretKey)) {
    logger.warn("Payme webhook: invalid credentials", { source: "webhooks-payme" });
    return {
      status: 200,
      json: errorResponse(
        id,
        PAYME_ERROR.INSUFFICIENT_PRIVILEGE,
        "Insufficient privilege to perform this method.",
      ),
    };
  }

  if (!rpc || typeof rpc !== "object" || !rpc.method) {
    return { status: 200, json: errorResponse(id, PAYME_ERROR.PARSE_ERROR, "Parse error") };
  }

  const params = rpc.params ?? {};
  const orderIdForAudit = (params as { account?: { order_id?: string } }).account?.order_id ?? null;
  const auditId = await auditRow(rpc.method, body, orderIdForAudit);

  let response: Record<string, unknown>;
  try {
    switch (rpc.method) {
      case "CheckPerformTransaction":
        response = await checkPerformTransaction(id, params);
        break;
      case "CreateTransaction":
        response = await createTransaction(id, params);
        break;
      case "PerformTransaction":
        response = await performTransaction(id, params);
        break;
      case "CancelTransaction":
        response = await cancelTransaction(id, params);
        break;
      case "CheckTransaction":
        response = await checkTransaction(id, params);
        break;
      default:
        response = errorResponse(id, PAYME_ERROR.METHOD_NOT_FOUND, "Method not found");
    }
  } catch (err) {
    logger.error(
      "Payme webhook processing error",
      err instanceof Error ? err : new Error(String(err)),
      {
        source: "webhooks-payme",
        meta: { method: rpc.method },
      },
    );
    await closeAudit(auditId, false, String(err));
    return { status: 200, json: errorResponse(id, PAYME_ERROR.CANNOT_PERFORM, "Internal error") };
  }

  await closeAudit(auditId, !("error" in response));
  return { status: 200, json: response };
}
