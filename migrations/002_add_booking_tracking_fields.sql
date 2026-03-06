-- Migration: Add booking tracking fields
-- Date: 2026-01-16
-- Phase: 2

-- Add new columns to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS modified_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]'::jsonb;

-- Add new columns to services table for tracking popularity
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS booking_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_booked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_services_booking_count ON services(booking_count);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);

-- Update booking_count for existing services (optional - backfill data)
UPDATE services s
SET booking_count = (
  SELECT COUNT(*)
  FROM bookings b
  WHERE b.service_id = s.id
  AND b.status IN ('confirmed', 'completed')
)
WHERE EXISTS (
  SELECT 1 FROM bookings b WHERE b.service_id = s.id
);

-- Update last_booked_at for existing services (optional - backfill data)
UPDATE services s
SET last_booked_at = (
  SELECT MAX(b.booking_date)
  FROM bookings b
  WHERE b.service_id = s.id
  AND b.status IN ('confirmed', 'completed')
)
WHERE EXISTS (
  SELECT 1 FROM bookings b WHERE b.service_id = s.id
);
