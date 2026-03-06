-- User Activity Tracking Tables Migration
-- Created: 2026-02-18
-- Purpose: Track user sessions, login/logout times, and detailed activity

-- User activity sessions table
CREATE TABLE IF NOT EXISTS user_activity_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR NOT NULL,
  login_at TIMESTAMP NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMP NULL,
  last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50), -- mobile, desktop, tablet
  browser VARCHAR(100),
  os VARCHAR(100),
  duration_seconds INTEGER DEFAULT 0, -- calculated on logout
  page_views INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_activity_sessions_user_id ON user_activity_sessions(user_id);
CREATE INDEX idx_user_activity_sessions_session_id ON user_activity_sessions(session_id);
CREATE INDEX idx_user_activity_sessions_login_at ON user_activity_sessions(login_at DESC);
CREATE INDEX idx_user_activity_sessions_active ON user_activity_sessions(user_id, logout_at) WHERE logout_at IS NULL;

-- User activity actions log (detailed)
CREATE TABLE IF NOT EXISTS user_activity_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR,
  action_type VARCHAR(100) NOT NULL, -- page_view, button_click, booking_create, etc.
  entity_type VARCHAR(50), -- booking, salon, master, etc.
  entity_id VARCHAR,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_activity_actions_user_id ON user_activity_actions(user_id);
CREATE INDEX idx_user_activity_actions_session_id ON user_activity_actions(session_id);
CREATE INDEX idx_user_activity_actions_created_at ON user_activity_actions(created_at DESC);
CREATE INDEX idx_user_activity_actions_type ON user_activity_actions(action_type, created_at DESC);

-- Update users table with activity fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_session_time_seconds BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT NULL;

-- Verified salons support
ALTER TABLE salons ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_salons_verified ON salons(is_verified);

-- Create indexes on users table for admin queries
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(is_blocked);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at DESC NULLS LAST);

-- Comments
COMMENT ON TABLE user_activity_sessions IS 'Tracks user login sessions with device and timing information';
COMMENT ON TABLE user_activity_actions IS 'Detailed log of user actions within sessions';
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified';
COMMENT ON COLUMN users.phone_verified IS 'Whether phone number has been verified';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of most recent login';
COMMENT ON COLUMN users.last_activity_at IS 'Timestamp of most recent activity';
COMMENT ON COLUMN users.login_count IS 'Total number of successful logins';
COMMENT ON COLUMN users.total_session_time_seconds IS 'Total time spent in all sessions (seconds)';
COMMENT ON COLUMN users.is_blocked IS 'Whether user account is blocked by admin';
COMMENT ON COLUMN users.block_reason IS 'Reason provided by admin for blocking';
COMMENT ON COLUMN salons.is_verified IS 'Admin verification status for salon';
