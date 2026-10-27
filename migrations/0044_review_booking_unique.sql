-- Existing duplicates must be resolved explicitly; never delete reviews here.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_booking_unique ON reviews (booking_id);
