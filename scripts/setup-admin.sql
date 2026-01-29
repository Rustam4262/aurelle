-- Admin Panel Setup Script for Production
-- Run this on production database to enable admin panel access

-- 1. Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_name ON admin_roles(name);

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  user_id VARCHAR NOT NULL,
  role_id VARCHAR NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);

-- 3. Create sanction_reason_codes table
CREATE TABLE IF NOT EXISTS sanction_reason_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sanction_reason_codes_code ON sanction_reason_codes(code);

-- 4. Create sanctions table
CREATE TABLE IF NOT EXISTS sanctions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  target_type VARCHAR(20) NOT NULL,
  target_id VARCHAR NOT NULL,
  sanction_type VARCHAR(30) NOT NULL,
  features JSONB,
  reason_code_id VARCHAR,
  reason_text TEXT NOT NULL,
  comment_to_user TEXT,
  internal_note TEXT,
  starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  revoked_at TIMESTAMP,
  revoked_by VARCHAR,
  revoke_reason TEXT,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sanctions_target ON sanctions(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_sanctions_status_ends ON sanctions(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_sanctions_created_by ON sanctions(created_by, created_at);

-- 5. Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  complainant_user_id VARCHAR NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id VARCHAR NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  attachments JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  assigned_admin_id VARCHAR,
  resolution_comment TEXT,
  decision VARCHAR(30),
  sanction_id VARCHAR,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status, created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_target ON complaints(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_admin_id, status);

-- 6. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  actor_user_id VARCHAR NOT NULL,
  actor_role VARCHAR(30) NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR,
  ip VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(64),
  old_data JSONB,
  new_data JSONB,
  meta JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);

-- 7. Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  type VARCHAR(20) NOT NULL DEFAULT 'support',
  user_id VARCHAR NOT NULL,
  assigned_admin_id VARCHAR,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by VARCHAR,
  close_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_assigned ON chat_threads(assigned_admin_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_message ON chat_threads(last_message_at);

-- 8. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  thread_id VARCHAR NOT NULL,
  sender_type VARCHAR(10) NOT NULL,
  sender_user_id VARCHAR NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  text TEXT,
  attachments JSONB,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_user_id, created_at);

-- 9. Create chat_message_reads table
CREATE TABLE IF NOT EXISTS chat_message_reads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  message_id VARCHAR NOT NULL,
  reader_user_id VARCHAR NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reads_reader ON chat_message_reads(reader_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message ON chat_message_reads(message_id);

-- 10. Create chat_templates table
CREATE TABLE IF NOT EXISTS chat_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_templates_category ON chat_templates(category);

-- ============ INSERT DEFAULT DATA ============

-- Insert super_admin role with all permissions
INSERT INTO admin_roles (id, name, display_name, description, permissions)
VALUES (
  'role_super_admin',
  'super_admin',
  'Super Administrator',
  'Full access to all admin features',
  '["*"]'
)
ON CONFLICT (name) DO NOTHING;

-- Insert moderator role
INSERT INTO admin_roles (id, name, display_name, description, permissions)
VALUES (
  'role_moderator',
  'moderator',
  'Moderator',
  'Can manage complaints and moderate content',
  '["complaints.read", "complaints.resolve", "sanctions.read", "sanctions.create", "chat.read", "chat.send", "users.read", "salons.read", "analytics.read"]'
)
ON CONFLICT (name) DO NOTHING;

-- Insert support role
INSERT INTO admin_roles (id, name, display_name, description, permissions)
VALUES (
  'role_support',
  'support',
  'Support Agent',
  'Can handle support chat and view basic info',
  '["chat.read", "chat.send", "chat.templates", "users.read", "salons.read"]'
)
ON CONFLICT (name) DO NOTHING;

-- Assign roziyev18r@gmail.com as super admin (user ID from database)
INSERT INTO admin_users (id, user_id, role_id)
VALUES (
  'admin_user_1',
  'local:1768552965554-xck8vtimj',
  'role_super_admin'
)
ON CONFLICT DO NOTHING;

-- Insert some default sanction reason codes
INSERT INTO sanction_reason_codes (code, title, description) VALUES
  ('spam', 'Spam', 'Sending spam or unsolicited messages'),
  ('fraud', 'Fraud', 'Fraudulent activity or scam attempts'),
  ('abuse', 'Abuse', 'Abusive behavior towards other users'),
  ('fake_profile', 'Fake Profile', 'Using fake information or impersonation'),
  ('policy_violation', 'Policy Violation', 'Violation of platform terms of service'),
  ('no_show', 'Repeated No-Shows', 'Repeatedly not showing up for appointments'),
  ('quality_issue', 'Quality Issues', 'Consistent quality complaints from customers')
ON CONFLICT (code) DO NOTHING;

-- Done!
SELECT 'Admin tables created successfully!' as status;
SELECT 'User roziyev18r@gmail.com is now a Super Admin' as info;
SELECT 'Access the admin panel at: https://aurelle.uz/admin' as url;
