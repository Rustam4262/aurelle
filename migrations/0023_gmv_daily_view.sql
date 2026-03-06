-- migrations/0023_gmv_daily_view.sql
-- Materialized view: daily GMV/fee/net aggregates across all payments.
-- Refreshed hourly by the cron job (CONCURRENTLY — no table lock).

CREATE MATERIALIZED VIEW IF NOT EXISTS gmv_daily AS
SELECT
  created_at::date                                                                      AS day,
  COUNT(*) FILTER (WHERE status = 'succeeded')                                          AS succeeded_count,
  COUNT(*) FILTER (WHERE status IN ('failed', 'cancelled'))                             AS failed_count,
  COUNT(*) FILTER (WHERE status = 'pending')                                            AS pending_count,
  COALESCE(SUM(gross_amount_uzs)  FILTER (WHERE status = 'succeeded'), 0)::bigint       AS gmv_uzs,
  COALESCE(SUM(platform_fee_uzs)  FILTER (WHERE status = 'succeeded'), 0)::bigint       AS fee_uzs,
  COALESCE(SUM(net_amount_uzs)    FILTER (WHERE status = 'succeeded'), 0)::bigint       AS net_uzs
FROM payments
GROUP BY created_at::date
WITH DATA;

-- Required for REFRESH CONCURRENTLY (uniqueness guarantee per row)
CREATE UNIQUE INDEX IF NOT EXISTS gmv_daily_day_idx ON gmv_daily (day);
