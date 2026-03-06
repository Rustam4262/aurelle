-- migrations/0027_payments_fee_columns.sql
-- Add fee/net columns to payments table.
-- Existing rows will have NULL (no retroactive calculation needed).

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gross_amount_uzs INTEGER,
  ADD COLUMN IF NOT EXISTS platform_fee_uzs  INTEGER,
  ADD COLUMN IF NOT EXISTS net_amount_uzs    INTEGER;

-- Back-fill existing rows: gross = amount_uzs, fee = 0, net = amount_uzs
UPDATE payments
SET
  gross_amount_uzs = amount_uzs,
  platform_fee_uzs = 0,
  net_amount_uzs   = amount_uzs
WHERE gross_amount_uzs IS NULL;
