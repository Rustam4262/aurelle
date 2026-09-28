/**
 * Unit tests for the pure reminder-scheduling math in reminders.ts.
 * Zero external dependencies — uses Node.js built-in assert module.
 *
 * Run: npx tsx server/lib/reminders.test.ts
 * Or:  npm run test:reminders
 */

import "dotenv/config";
import assert from "node:assert/strict";
import { computeReminderTimes, buildDedupeKey } from "./reminders";

// ── computeReminderTimes ─────────────────────────────────────────────────

// Booking is 3 days out — both the 24h and 2h reminders are in the future.
const farNow = new Date("2026-09-20T00:00:00+05:00");
const farReminders = computeReminderTimes("2026-09-23", "10:00", farNow);
assert.equal(farReminders.length, 2, "a booking 3 days out gets both reminders scheduled");
assert.equal(farReminders[0].type, "REMINDER_24H");
assert.equal(farReminders[1].type, "REMINDER_2H");
assert.equal(
  farReminders[0].scheduledAt.toISOString(),
  "2026-09-22T05:00:00.000Z",
  "24h reminder fires exactly 24h before the Tashkent-local visit time",
);
assert.equal(
  farReminders[1].scheduledAt.toISOString(),
  "2026-09-23T03:00:00.000Z",
  "2h reminder fires exactly 2h before the Tashkent-local visit time",
);

// Booking is 12 hours out — the 24h reminder would be in the past, so only
// the 2h reminder is scheduled. Never send a reminder retroactively.
const soonNow = new Date("2026-09-23T00:00:00+05:00");
const soonReminders = computeReminderTimes("2026-09-23", "12:00", soonNow);
assert.equal(soonReminders.length, 1, "a booking 12h out only gets the 2h reminder");
assert.equal(soonReminders[0].type, "REMINDER_2H");

// Booking is less than 2 hours out — neither reminder would be in the
// future, so nothing is scheduled at all (no backdated reminders).
const imminentNow = new Date("2026-09-23T09:30:00+05:00");
const imminentReminders = computeReminderTimes("2026-09-23", "10:00", imminentNow);
assert.equal(imminentReminders.length, 0, "a booking under 2h out gets no reminders scheduled");

// ── buildDedupeKey ───────────────────────────────────────────────────────

const bookingId = "b1";
const v0Email24h = buildDedupeKey(bookingId, 0, "REMINDER_24H", "email");
const v0Email2h = buildDedupeKey(bookingId, 0, "REMINDER_2H", "email");
const v1Email24h = buildDedupeKey(bookingId, 1, "REMINDER_24H", "email");

assert.notEqual(
  v0Email24h,
  v1Email24h,
  "the same booking/type/channel must get a different key after a reschedule bumps the version",
);
assert.notEqual(v0Email24h, v0Email2h, "24h and 2h reminders for the same booking never collide");
assert.equal(
  buildDedupeKey(bookingId, 0, "REMINDER_24H", "email"),
  v0Email24h,
  "the same (booking, version, type, channel) always produces the same key — required for onConflictDoNothing to dedupe retries/double-clicks",
);

console.log("reminders.test.ts: all assertions passed");
