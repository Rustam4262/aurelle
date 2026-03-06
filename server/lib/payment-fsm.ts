/**
 * Payment State Machine
 *
 * Enforces strict allowed transitions. Any code that needs to change payment
 * status MUST call `transitionPayment()` instead of raw db.update().
 *
 * Allowed transitions:
 *   pending   → succeeded | failed | cancelled
 *   succeeded → refunded
 *   failed    → (terminal)
 *   cancelled → (terminal)
 *   refunded  → (terminal)
 */

import { db } from "../db";
import { payments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled" | "refunded";

export interface TransitionExtra {
  externalId?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

// ── Transition table ───────────────────────────────────────────────────────────

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  pending:   ["succeeded", "failed", "cancelled"],
  succeeded: ["refunded"],
  failed:    [],   // terminal
  cancelled: [],   // terminal
  refunded:  [],   // terminal
};

// ── Guard ──────────────────────────────────────────────────────────────────────

export class PaymentTransitionError extends Error {
  readonly from: PaymentStatus;
  readonly to: PaymentStatus;

  constructor(from: PaymentStatus, to: PaymentStatus) {
    super(`Forbidden payment transition: ${from} → ${to}`);
    this.name = "PaymentTransitionError";
    this.from = from;
    this.to = to;
  }
}

/** Returns true if the transition is explicitly allowed. */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return (TRANSITIONS[from] as readonly PaymentStatus[]).includes(to);
}

// ── Transition executor ────────────────────────────────────────────────────────

/**
 * Apply a guarded payment status transition.
 *
 * Reads the current status from DB, validates against the allowed transition
 * table, writes the new status atomically, and logs both the success and any
 * violation attempts.
 *
 * @throws PaymentTransitionError if the transition is not allowed
 * @throws Error if the payment record is not found
 */
export async function transitionPayment(
  paymentId: string,
  newStatus: PaymentStatus,
  extra?: TransitionExtra,
): Promise<void> {
  const [payment] = await db
    .select({ id: payments.id, status: payments.status })
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const currentStatus = payment.status as PaymentStatus;

  if (!canTransition(currentStatus, newStatus)) {
    logger.warn("Payment transition BLOCKED", {
      source: "payment-fsm",
      meta: { paymentId, from: currentStatus, to: newStatus },
    });
    throw new PaymentTransitionError(currentStatus, newStatus);
  }

  await db
    .update(payments)
    .set({
      status: newStatus,
      ...(extra?.externalId != null     && { externalId: extra.externalId }),
      ...(extra?.errorCode !== undefined && { errorCode: extra.errorCode }),
      ...(extra?.errorMessage !== undefined && { errorMessage: extra.errorMessage }),
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId));

  logger.info("Payment transitioned", {
    source: "payment-fsm",
    meta: { paymentId, from: currentStatus, to: newStatus },
  });
}
