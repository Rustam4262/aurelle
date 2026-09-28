-- Existing services remain unclassified; do not infer audience from names.
BEGIN;
ALTER TABLE services ADD COLUMN IF NOT EXISTS audience varchar(10);
ALTER TABLE solo_master_services ADD COLUMN IF NOT EXISTS audience varchar(10);
ALTER TABLE services ADD CONSTRAINT chk_services_audience CHECK (audience IN ('women', 'men', 'unisex'));
ALTER TABLE solo_master_services ADD CONSTRAINT chk_solo_services_audience CHECK (audience IN ('women', 'men', 'unisex'));
CREATE INDEX IF NOT EXISTS idx_services_audience_active ON services (salon_id, audience) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_solo_services_audience_active ON solo_master_services (master_id, audience) WHERE is_active = true;
COMMIT;
-- Rollback after reverting application code:
-- ALTER TABLE services DROP COLUMN audience;
-- ALTER TABLE solo_master_services DROP COLUMN audience;
