-- HOTFIX: Add email_verified and phone_verified fields
-- Execute this IMMEDIATELY in Neon Console to fix "No users found" issue
-- Date: 2026-02-20

-- Add verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN users.email_verified IS 'Whether email has been verified';
COMMENT ON COLUMN users.phone_verified IS 'Whether phone number has been verified';

-- Verify the fields were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('email_verified', 'phone_verified');

-- Expected output: 2 rows showing email_verified and phone_verified columns
