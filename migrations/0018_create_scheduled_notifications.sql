-- Migration: 0018_create_scheduled_notifications
-- Booking reminder queue with idempotency via dedupe_key

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR(255) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,       -- 'REMINDER_24H' | 'REMINDER_2H'
  channel VARCHAR(20) NOT NULL,    -- 'email' | 'sms' | 'push'
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | sent | failed | cancelled
  error TEXT,
  dedupe_key VARCHAR(255) NOT NULL,              -- '{bookingId}:{type}:{channel}'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT scheduled_notifications_dedupe_key_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_sn_status_time ON scheduled_notifications (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sn_booking ON scheduled_notifications (booking_id);
