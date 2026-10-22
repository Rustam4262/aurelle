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
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// Lets a caller run the transition inside its own already-open transaction
// (e.g. together with the bookings.paymentStatus update it implies), instead
// of always committing in isolation.
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ── Types ──────────────────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled" | "refunded";

export interface TransitionExtra {
  externalId?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}

// ── Transition table ───────────────────────────────────────────────────────────

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  pending: ["succeeded", "failed", "cancelled"],
  succeeded: ["refunded"],
  failed: [], // terminal
  cancelled: [], // terminal
  refunded: [], // terminal
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
 * Pass `dbClient` (an open transaction) to make this part of a larger atomic
 * write — e.g. together with the bookings.paymentStatus update every caller
 * otherwise performs as a separate, non-atomic statement right after. Without
 * it, this still runs in its own transaction exactly as before.
 *
 * @throws PaymentTransitionError if the transition is not allowed
 * @throws Error if the payment record is not found
 */
export async function transitionPayment(
  paymentId: string,
  newStatus: PaymentStatus,
  extra?: TransitionExtra,
  dbClient?: DbClient,
): Promise<void> {
  // FOR UPDATE serializes concurrent callers (e.g. a provider's retried
  // webhook arriving twice) on this row, so only one of them observes the
  // pre-transition status and performs the write. The lock is only held for
  // the life of a transaction, so a client-supplied one must already be in
  // a transaction — only the no-argument case needs its own wrapper here.
  const run = async (tx: DbClient) => {
    const [payment] = await tx
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for("update");

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

    await tx
      .update(payments)
      .set({
        status: newStatus,
        ...(extra?.externalId != null && { externalId: extra.externalId }),
        ...(extra?.errorCode !== undefined && { errorCode: extra.errorCode }),
        ...(extra?.errorMessage !== undefined && { errorMessage: extra.errorMessage }),
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, paymentId), eq(payments.status, currentStatus)));

    logger.info("Payment transitioned", {
      source: "payment-fsm",
      meta: { paymentId, from: currentStatus, to: newStatus },
    });
  };

  if (dbClient) {
    await run(dbClient);
  } else {
    await db.transaction(run);
  }
}
