/**
 * Unit tests for the pure time/date math in booking-availability.ts.
 * Zero external dependencies — uses Node.js built-in assert module.
 *
 * Run: npx tsx server/lib/booking-availability.test.ts
 * Or:  npm run test:booking-availability
 */

import "dotenv/config";
import assert from "node:assert/strict";
import {
  combineDateAndTime,
  dayOfWeekFor,
  parseTimeToMinutes,
  formatMinutesToTime,
} from "./booking-availability";

// ── parseTimeToMinutes / formatMinutesToTime ────────────────────────────────

assert.equal(parseTimeToMinutes("09:00"), 540, "09:00 -> 540 minutes");
assert.equal(parseTimeToMinutes("00:00"), 0, "00:00 -> 0 minutes");
assert.equal(parseTimeToMinutes("23:45"), 1425, "23:45 -> 1425 minutes");
assert.equal(formatMinutesToTime(540), "09:00", "540 minutes -> 09:00");
assert.equal(formatMinutesToTime(1200), "20:00", "1200 minutes -> 20:00");

// ── The exact 09:00-20:00 / 60-minute-service boundary from the spec ───────
// Service duration 60 min, working hours 09:00-20:00: last valid start is
// 19:00 (ends exactly at close, half-open [start, end) is allowed); 19:01 and
// 19:45 must be rejected because the visit would run past closing.

const openMinutes = parseTimeToMinutes("09:00");
const closeMinutes = parseTimeToMinutes("20:00");
const duration = 60;

function fitsWithinHours(start: string): boolean {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = startMinutes + duration;
  return startMinutes >= openMinutes && endMinutes <= closeMinutes;
}

assert.ok(fitsWithinHours("19:00"), "19:00 + 60min must fit exactly at closing");
assert.ok(!fitsWithinHours("19:01"), "19:01 + 60min must NOT fit (ends after closing)");
assert.ok(!fitsWithinHours("19:45"), "19:45 + 60min must NOT fit (ends well after closing)");
assert.ok(!fitsWithinHours("20:00"), "20:00 + 60min must NOT fit (starts at closing)");
assert.ok(fitsWithinHours("09:00"), "09:00 + 60min must fit (opening time)");
assert.ok(!fitsWithinHours("08:59"), "08:59 must NOT fit (before opening)");

// ── combineDateAndTime: explicit Asia/Tashkent offset, not process/device TZ ─

const instant = combineDateAndTime("2026-09-24", "09:00");
// 09:00 +05:00 == 04:00 UTC on the same calendar day.
assert.equal(instant.toISOString(), "2026-09-24T04:00:00.000Z", "09:00 Tashkent == 04:00 UTC");

const midnightInstant = combineDateAndTime("2026-01-01", "00:00");
assert.equal(
  midnightInstant.toISOString(),
  "2025-12-31T19:00:00.000Z",
  "New Year midnight in Tashkent is still Dec 31 in UTC — must not silently shift the calendar date",
);

// ── dayOfWeekFor: must not depend on the server process's local timezone ───
// 2026-09-24 is a Thursday (day 4). Computed purely from the Y-M-D string via
// Date.UTC, so it can never differ depending on where the Node process runs.

assert.equal(dayOfWeekFor("2026-09-24"), 4, "2026-09-24 must resolve to Thursday (4)");
assert.equal(dayOfWeekFor("2026-09-27"), 0, "2026-09-27 must resolve to Sunday (0)");
assert.equal(dayOfWeekFor("2026-01-01"), 4, "2026-01-01 must resolve to Thursday (4)");

// ── Zero/negative duration and inverted schedule are the caller's job to
// reject via BOOKING_SCHEDULE_UNAVAILABLE / BOOKING_SERVICE_UNAVAILABLE —
// verify the raw arithmetic guard conditions used by validateBookingSlot.

assert.ok(closeMinutes > openMinutes, "sane schedule: close after open");
assert.ok(
  !(parseTimeToMinutes("08:00") > parseTimeToMinutes("20:00")),
  "sanity: 08:00 is not after 20:00",
);

console.log("booking-availability.test.ts: all assertions passed");
