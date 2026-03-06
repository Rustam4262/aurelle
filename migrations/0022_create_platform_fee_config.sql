-- Platform fee configuration table.
-- Append-only: calculateFee() always picks ORDER BY created_at DESC LIMIT 1 per scope.
-- Uniqueness per scope (global / per-salon) enforced by partial unique indexes.

CREATE TABLE IF NOT EXISTS platform_fee_config (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    VARCHAR,               -- NULL = global default; non-null = per-salon override
  fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_by  VARCHAR NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- At most one active global config row
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfc_global
  ON platform_fee_config ((salon_id IS NULL))
  WHERE salon_id IS NULL;

-- At most one active config row per salon
CREATE UNIQUE INDEX IF NOT EXISTS idx_pfc_per_salon
  ON platform_fee_config (salon_id)
  WHERE salon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pfc_created ON platform_fee_config (created_at DESC);

-- Add fee snapshot columns to payments table.
-- Nullable: existing payments records will have NULL until recalculated.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gross_amount_uzs INTEGER,
  ADD COLUMN IF NOT EXISTS fee_percent       DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS platform_fee_uzs  INTEGER,
  ADD COLUMN IF NOT EXISTS net_amount_uzs    INTEGER;

-- Backfill existing succeeded payments with 0% fee (unknown historical rate).
UPDATE payments
SET
  gross_amount_uzs = amount_uzs,
  fee_percent      = 0,
  platform_fee_uzs = 0,
  net_amount_uzs   = amount_uzs
WHERE gross_amount_uzs IS NULL;
