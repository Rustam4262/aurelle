-- migrations/0023_gmv_daily_view.sql
-- GMV daily materialized view.
-- Aggregates payment totals by day for the financial dashboard.
-- REFRESH CONCURRENTLY requires a UNIQUE index (no table lock).

DROP MATERIALIZED VIEW IF EXISTS gmv_daily;

CREATE MATERIALIZED VIEW gmv_daily AS
SELECT
  date_trunc('day', created_at)::date                               AS day,
  COUNT(*) FILTER (WHERE status = 'succeeded')                      AS succeeded_count,
  COUNT(*) FILTER (WHERE status IN ('failed', 'cancelled'))         AS failed_count,
  COUNT(*) FILTER (WHERE status = 'pending')                        AS pending_count,
  COALESCE(SUM(amount_uzs) FILTER (WHERE status = 'succeeded'), 0)  AS gmv_uzs
FROM payments
GROUP BY 1
ORDER BY 1
WITH DATA;

-- Required for REFRESH CONCURRENTLY (no exclusive table lock)
CREATE UNIQUE INDEX IF NOT EXISTS gmv_daily_day_idx ON gmv_daily (day);
