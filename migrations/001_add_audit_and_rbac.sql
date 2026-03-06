-- Migration: Add audit_logs and owner_permissions tables
-- Date: 2026-01-16

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  salon_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  result VARCHAR(20) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_salon ON audit_logs(salon_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Create owner_permissions table
CREATE TABLE IF NOT EXISTS owner_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id VARCHAR(255) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by VARCHAR(255),
  UNIQUE(owner_id, permission)
);

-- Create indexes for owner_permissions
CREATE INDEX IF NOT EXISTS idx_owner_permissions_owner ON owner_permissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_permissions_permission ON owner_permissions(permission);

-- Grant default permissions to existing owners
INSERT INTO owner_permissions (owner_id, permission, granted_by)
SELECT DISTINCT owner_id, permission, 'system'
FROM (
  SELECT owner_id FROM salons WHERE owner_id IS NOT NULL
) owners
CROSS JOIN (
  VALUES
    ('owner.read_dashboard'),
    ('owner.read_bookings'),
    ('owner.manage_bookings'),
    ('owner.read_services'),
    ('owner.manage_services'),
    ('owner.read_masters'),
    ('owner.manage_masters'),
    ('owner.read_salons'),
    ('owner.manage_salons'),
    ('owner.read_calendar'),
    ('owner.manage_calendar'),
    ('owner.read_analytics')
) AS perms(permission)
ON CONFLICT (owner_id, permission) DO NOTHING;
