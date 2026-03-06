-- migrations/0024_webhook_idempotency.sql
-- Add external_event_id column to webhook_events for idempotency.
-- A partial unique index prevents double-processing the same provider event.

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS external_event_id VARCHAR(255);

-- Partial unique index: NULL values are excluded (old rows without an ID are fine).
-- Only non-NULL external_event_id values must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_ext_id_idx
  ON webhook_events (external_event_id)
  WHERE external_event_id IS NOT NULL;
