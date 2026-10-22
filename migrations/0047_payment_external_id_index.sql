-- Payme/Click protocol handlers look up payments by (provider, external_id)
-- for idempotent CreateTransaction/PerformTransaction/CancelTransaction/CheckTransaction
-- (Payme) and Prepare/Complete (Click) replays. Without this index those
-- lookups are sequential scans.
--
-- Rollback: DROP INDEX IF EXISTS idx_payments_provider_external_id;

CREATE INDEX IF NOT EXISTS idx_payments_provider_external_id
  ON payments (provider, external_id)
  WHERE external_id IS NOT NULL;
