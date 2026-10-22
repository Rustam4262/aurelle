-- Freelance masters' phone numbers are shown publicly on /master/:slug with
-- no opt-out. Add a per-master toggle, defaulting to the current (visible)
-- behavior so nothing changes for anyone unless they explicitly turn it off.
--
-- Rollback: ALTER TABLE masters DROP COLUMN IF EXISTS phone_public;

ALTER TABLE masters ADD COLUMN IF NOT EXISTS phone_public boolean NOT NULL DEFAULT true;
