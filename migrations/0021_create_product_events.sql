-- Product analytics events table
-- Intentionally no FK on user_id — events survive user deletion.
-- Sampling + rate limiting applied at application level (server/lib/analytics.ts).

CREATE TABLE IF NOT EXISTS product_events (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  VARCHAR(100) NOT NULL,
  user_id     VARCHAR,
  session_id  VARCHAR(128),
  properties  JSONB NOT NULL DEFAULT '{}',
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Range queries by event type (funnel reports, daily counts)
CREATE INDEX IF NOT EXISTS idx_pe_event_name_created
  ON product_events (event_name, created_at DESC);

-- Per-user event history (partial index — avoids indexing NULL rows)
CREATE INDEX IF NOT EXISTS idx_pe_user_created
  ON product_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- General time-range scans
CREATE INDEX IF NOT EXISTS idx_pe_created
  ON product_events (created_at DESC);
