-- Migration: Create audit logs table
-- This implements complete tracking of all admin actions

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE audit_logs IS 'Полный аудит всех действий администраторов';
COMMENT ON COLUMN audit_logs.action IS 'Действие: user.block, salon.verify, booking.cancel, etc.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Тип сущности: user, salon, booking, master, etc.';
COMMENT ON COLUMN audit_logs.old_data IS 'JSON с предыдущим состоянием (для изменений)';
COMMENT ON COLUMN audit_logs.new_data IS 'JSON с новым состоянием (для изменений)';
COMMENT ON COLUMN audit_logs.meta IS 'JSON с дополнительными данными (параметры, контекст)';
