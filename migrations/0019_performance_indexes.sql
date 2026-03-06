-- Performance indexes for AURELLE (P1.2)
-- All created CONCURRENTLY — no table lock, safe to run on live production.
-- Run manually on the server: psql $DATABASE_URL -f migrations/0019_performance_indexes.sql
-- Each statement is independent; failures don't roll back the others.

-- ── users ──────────────────────────────────────────────────────────────────
-- created_at: dashboard range queries (gte/lt), growth chart GROUP BY DATE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
  ON users (created_at DESC);

-- is_blocked: admin users list status filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_blocked
  ON users (is_blocked)
  WHERE is_blocked = true;    -- partial index: only indexes the minority (blocked) rows

-- email_verified / phone_verified: verification filter, action-center count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified
  ON users (email_verified);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_verified
  ON users (phone_verified);

-- last_login_at: sortable column in admin users list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login_at
  ON users (last_login_at DESC NULLS LAST);

-- ── bookings ───────────────────────────────────────────────────────────────
-- created_at: dashboard period stats (gte/lt), growth chart GROUP BY DATE
-- (existing idx_bookings_date covers booking_date, not created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at
  ON bookings (created_at DESC);

-- ── salons ─────────────────────────────────────────────────────────────────
-- created_at: dashboard growth chart, period stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salons_created_at
  ON salons (created_at DESC);

-- ── masters ────────────────────────────────────────────────────────────────
-- created_at: dashboard period stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_masters_created_at
  ON masters (created_at DESC);

-- ── audit_logs ─────────────────────────────────────────────────────────────
-- created_at standalone: used in ORDER BY on the audit list page
-- (idx_audit_logs_actor already covers (actor_id, created_at) for actor lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- ── user_activity_sessions ─────────────────────────────────────────────────
-- last_activity_at: online users query (gte last 10 min)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_last_active
  ON user_activity_sessions (last_activity_at DESC);
