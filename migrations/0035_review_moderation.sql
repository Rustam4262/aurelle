-- Admin review moderation: hide/unhide instead of deleting, with an audit trail.
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hidden_reason" text,
  ADD COLUMN IF NOT EXISTS "hidden_by" varchar,
  ADD COLUMN IF NOT EXISTS "hidden_at" timestamp;
