-- Email verification tokens (P1.4)
-- Run manually on the server: psql $DATABASE_URL -f migrations/0020_email_verification_tokens.sql

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         VARCHAR NOT NULL,
  token           VARCHAR(64) NOT NULL UNIQUE,
  expires_at      TIMESTAMP NOT NULL,
  used_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user    ON email_verification_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_token   ON email_verification_tokens (token);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_tokens (expires_at);
