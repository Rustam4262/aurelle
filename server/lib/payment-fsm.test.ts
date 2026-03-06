/**
 * Unit tests for the Payment State Machine.
 * Zero external dependencies — uses Node.js built-in assert module.
 *
 * Run: npx tsx server/lib/payment-fsm.test.ts
 * Or:  npm run test:fsm
 */

import assert from "node:assert/strict";
import { canTransition, PaymentTransitionError } from "./payment-fsm";

// ── Allowed transitions ────────────────────────────────────────────────────────

assert.ok(canTransition("pending", "succeeded"),  "pending → succeeded must be allowed");
assert.ok(canTransition("pending", "failed"),     "pending → failed must be allowed");
assert.ok(canTransition("pending", "cancelled"),  "pending → cancelled must be allowed");
assert.ok(canTransition("succeeded", "refunded"), "succeeded → refunded must be allowed");

// ── Blocked transitions ────────────────────────────────────────────────────────

assert.ok(!canTransition("failed",    "pending"),   "failed → pending must be BLOCKED (terminal)");
assert.ok(!canTransition("failed",    "succeeded"), "failed → succeeded must be BLOCKED (terminal)");
assert.ok(!canTransition("cancelled", "pending"),   "cancelled → pending must be BLOCKED (terminal)");
assert.ok(!canTransition("cancelled", "succeeded"), "cancelled → succeeded must be BLOCKED (terminal)");
assert.ok(!canTransition("succeeded", "pending"),   "succeeded → pending must be BLOCKED");
assert.ok(!canTransition("succeeded", "failed"),    "succeeded → failed must be BLOCKED");
assert.ok(!canTransition("refunded",  "pending"),   "refunded → pending must be BLOCKED (terminal)");
assert.ok(!canTransition("refunded",  "succeeded"), "refunded → succeeded must be BLOCKED (terminal)");

// ── Self-transitions blocked ───────────────────────────────────────────────────

assert.ok(!canTransition("pending",   "pending"),   "pending → pending must be BLOCKED");
assert.ok(!canTransition("succeeded", "succeeded"), "succeeded → succeeded must be BLOCKED");
assert.ok(!canTransition("failed",    "failed"),    "failed → failed must be BLOCKED");

// ── PaymentTransitionError shape ──────────────────────────────────────────────

const err = new PaymentTransitionError("failed", "succeeded");
assert.equal(err.name,    "PaymentTransitionError");
assert.equal(err.from,    "failed");
assert.equal(err.to,      "succeeded");
assert.match(err.message, /forbidden/i);

// ── canTransition is pure (no side effects) ───────────────────────────────────

// Calling it twice with same args returns same result
assert.equal(canTransition("pending", "succeeded"), canTransition("pending", "succeeded"));
assert.equal(canTransition("failed",  "pending"),   canTransition("failed",  "pending"));

console.log("✅  All payment FSM tests passed (16 assertions)");
