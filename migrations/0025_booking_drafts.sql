-- migrations/0025_booking_drafts.sql
-- Booking drafts table: stores in-progress booking state per user.
-- Auto-expires after 24 hours; cron job cleans up expired rows.

CREATE TABLE IF NOT EXISTS booking_drafts (
  id             VARCHAR       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        VARCHAR       NOT NULL,
  salon_id       VARCHAR,
  service_id     VARCHAR,
  master_id      VARCHAR,
  scheduled_date VARCHAR(10),                   -- YYYY-MM-DD
  scheduled_time VARCHAR(10),                   -- HH:MM
  properties     JSONB         NOT NULL DEFAULT '{}',
  expires_at     TIMESTAMPTZ   NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- One draft per user (latest wins); cron cleanup uses expires_at
CREATE INDEX IF NOT EXISTS idx_bd_user    ON booking_drafts (user_id);
CREATE INDEX IF NOT EXISTS idx_bd_expires ON booking_drafts (expires_at);
