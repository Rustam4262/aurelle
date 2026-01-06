-- Migration: Create waitlist table
-- This allows clients to join waiting list when slots are full

CREATE TABLE IF NOT EXISTS waitlist (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR NOT NULL,
  salon_id VARCHAR NOT NULL,
  master_id VARCHAR,
  service_id VARCHAR NOT NULL,
  preferred_date VARCHAR(10),
  preferred_time_start VARCHAR(5),
  preferred_time_end VARCHAR(5),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  notified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_client ON waitlist(client_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_salon ON waitlist(salon_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Add comment to document the table
COMMENT ON TABLE waitlist IS 'Waiting list for fully booked time slots';
COMMENT ON COLUMN waitlist.status IS 'Status: waiting, notified, booked, expired';
