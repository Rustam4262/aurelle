-- Reliable reminders after reschedule: the old dedupeKey format
-- ({bookingId}:{type}:{channel}) collided across reschedules because it never
-- changed, so onConflictDoNothing silently dropped the new reminder rows
-- after a cancel+reinsert. Versioning the key (and the row itself) fixes this
-- without touching existing terminal rows.
--
-- Rollback: ALTER TABLE "bookings" DROP COLUMN IF EXISTS "notification_version";
--           ALTER TABLE "scheduled_notifications" DROP COLUMN IF EXISTS "version",
--             DROP COLUMN IF EXISTS "attempts", DROP COLUMN IF EXISTS "next_attempt_at";
--           ALTER TABLE "scheduled_notifications" DROP CONSTRAINT IF EXISTS "chk_scheduled_notifications_status";
--           ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "chk_scheduled_notifications_status"
--             CHECK ("status" IN ('pending', 'sent', 'failed', 'cancelled'));
-- Safe to roll back: both are purely additive with defaults, no data is reshaped.

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "notification_version" integer NOT NULL DEFAULT 0;

ALTER TABLE "scheduled_notifications"
  ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamptz;

-- The worker now atomically claims a row (pending -> processing) before
-- sending, so a second instance polling at the same moment can't send the
-- same reminder twice. Widen the existing status CHECK to allow that value.
ALTER TABLE "scheduled_notifications" DROP CONSTRAINT IF EXISTS "chk_scheduled_notifications_status";
ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "chk_scheduled_notifications_status"
  CHECK ("status" IN ('pending', 'processing', 'sent', 'failed', 'cancelled'));
