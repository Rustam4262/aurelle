ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
-- Legacy reset tokens were stored as bearer credentials. Require a new link.
UPDATE password_reset_tokens SET used_at = NOW() WHERE used_at IS NULL;
