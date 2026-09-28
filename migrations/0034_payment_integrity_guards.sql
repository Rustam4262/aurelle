CREATE UNIQUE INDEX IF NOT EXISTS uidx_payments_booking_type_active
ON payments (booking_id, type)
WHERE status IN ('pending', 'succeeded');
