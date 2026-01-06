-- Migration: Make master_id nullable in bookings table
-- This allows clients to book services without selecting a specific master

ALTER TABLE bookings
ALTER COLUMN master_id DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN bookings.master_id IS 'Optional - allows booking without specific master selection';
