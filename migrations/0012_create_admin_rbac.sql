-- Migration: Create admin RBAC tables
-- This implements role-based access control for admin panel

-- Admin Roles
CREATE TABLE IF NOT EXISTS admin_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin Users (mapping users to admin roles)
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);
CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);

-- Insert default roles
INSERT INTO admin_roles (name, display_name, description, permissions) VALUES
  ('super_admin', 'Super Administrator', 'Full system access with all permissions',
   '["*"]'::jsonb),
  ('admin', 'Administrator', 'General admin with most permissions except system config',
   '["users.read", "users.write", "users.block", "salons.read", "salons.write", "salons.verify", "masters.read", "masters.write", "masters.verify", "bookings.read", "bookings.write", "bookings.cancel", "services.read", "services.write", "reviews.read", "reviews.moderate", "complaints.read", "complaints.resolve", "sanctions.read", "sanctions.create", "chat.read", "chat.write", "analytics.read", "audit.read"]'::jsonb),
  ('moderator', 'Moderator', 'Content moderation and basic user support',
   '["users.read", "salons.read", "masters.read", "bookings.read", "services.read", "reviews.read", "reviews.moderate", "complaints.read", "complaints.resolve", "chat.read", "chat.write", "audit.read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON TABLE admin_roles IS 'Admin roles with granular permissions for RBAC';
COMMENT ON TABLE admin_users IS 'Mapping of users to admin roles';
