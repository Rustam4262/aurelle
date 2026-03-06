# GMV Materialized View — AURELLE

## Overview

`gmv_daily` is a PostgreSQL materialized view that pre-aggregates payment data
by calendar day. It lets the financial dashboard run in microseconds instead of
scanning the full `payments` table on every request.

---

## Schema

```sql
-- Columns of gmv_daily
day             DATE        -- calendar day (UTC)
succeeded_count BIGINT      -- payments with status = 'succeeded'
failed_count    BIGINT      -- payments with status IN ('failed','cancelled')
pending_count   BIGINT      -- payments with status = 'pending'
gmv_uzs         BIGINT      -- gross payment volume (succeeded only), tiyin
fee_uzs         BIGINT      -- platform commission (succeeded only), tiyin
net_uzs         BIGINT      -- salon revenue = gmv − fee (succeeded only), tiyin
```

Unique index `gmv_daily_day_idx ON gmv_daily (day)` enables `REFRESH CONCURRENTLY`.

Migration: `migrations/0023_gmv_daily_view.sql`

---

## Refresh Strategy

| Parameter | Value |
|---|---|
| Method | `REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_daily` |
| Frequency | Every 60 minutes |
| Worker | PM2 instance 0 only (`NODE_APP_INSTANCE === "0"`) |
| Startup | Also runs once immediately on first boot |
| Table lock | **None** — CONCURRENTLY allows concurrent reads |
| Staleness | ≤ 60 min (acceptable for financial dashboards) |

### Why CONCURRENTLY?

A plain `REFRESH` takes an `ExclusiveLock` on the view, blocking reads for its
entire duration (can be seconds on large tables). `CONCURRENTLY` builds a new
snapshot in the background and swaps atomically at the end — readers are never
blocked. Requires a unique index (hence `gmv_daily_day_idx`).

### Cron location

`server/lib/gmv-refresh.ts` — exports `refreshGmvDaily()` and `startGmvRefreshJob()`.
`server/index.ts` — calls `startGmvRefreshJob()` inside the `isMainInstance` guard.

---

## API Endpoint

### `GET /api/admin/billing/gmv`

Requires admin auth + `analytics.read` permission.

#### Query parameters

| Parameter | Values | Description |
|---|---|---|
| `range` | `7d` \| `30d` \| `90d` | Relative window (last N days) |
| `from` + `to` | `YYYY-MM-DD` | Absolute custom range (overrides `range`) |
| *(omit all)* | — | All-time data from view |

#### Example

```bash
# Last 30 days
curl -H "Cookie: <admin-session>" \
  https://aurelle.uz/api/admin/billing/gmv?range=30d

# Custom range
curl -H "Cookie: <admin-session>" \
  "https://aurelle.uz/api/admin/billing/gmv?from=2026-02-01&to=2026-02-28"
```

#### Response

```json
{
  "range": "30d",
  "from": "2026-02-02",
  "to": "2026-03-03",
  "daily": [
    {
      "day": "2026-02-02",
      "succeededCount": 12,
      "failedCount": 1,
      "pendingCount": 0,
      "gmvUzs": 6000000,
      "feeUzs": 600000,
      "netUzs": 5400000,
      "takeRatePct": 10.0
    }
  ],
  "totals": {
    "succeededCount": 142,
    "failedCount": 8,
    "pendingCount": 3,
    "gmvUzs": 71000000,
    "feeUzs": 7100000,
    "netUzs": 63900000,
    "takeRatePct": 10.0
  }
}
```

**Note**: if the view hasn't been created yet (migration 0023 not applied),
the endpoint returns `{ daily: [], totals: null }` — never a 500 error.

---

## Manual Operations

### Force-refresh now (without waiting for cron)

```bash
psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW CONCURRENTLY gmv_daily;"
```

### Verify view state

```bash
# Row count and date range in the view
psql $DATABASE_URL -c "
  SELECT COUNT(*), MIN(day), MAX(day), SUM(gmv_uzs)/100 AS gmv_som
  FROM gmv_daily;
"

# Check last refresh time (PostgreSQL tracks it)
psql $DATABASE_URL -c "
  SELECT schemaname, matviewname, last_refresh
  FROM pg_stat_user_tables
  -- mat views appear in pg_matviews:
  ;
  SELECT matviewname, ispopulated
  FROM pg_matviews WHERE matviewname = 'gmv_daily';
"
```

### Drop and recreate (if migration needs re-run)

```bash
psql $DATABASE_URL -c "DROP MATERIALIZED VIEW IF EXISTS gmv_daily;"
psql $DATABASE_URL -f migrations/0023_gmv_daily_view.sql
```

---

## DoD Verification (P3.3)

- [x] `gmv_daily` materialized view created (migration `0023`)
- [x] `gmv_daily_day_idx` unique index — enables `REFRESH CONCURRENTLY`
- [x] `refreshGmvDaily()` runs `REFRESH CONCURRENTLY`, logs duration, never throws
- [x] `startGmvRefreshJob()` — runs once on startup, then every 60 min
- [x] Cron guarded by `isMainInstance` — single worker only in PM2 cluster
- [x] `GET /api/admin/billing/gmv` — daily series + totals + takeRatePct per row
- [x] Graceful fallback if view not yet created (returns empty, not 500)
- [x] `?range=7d|30d|90d` and `?from=&to=` custom range both work
- [x] `npx tsc --noEmit` — zero new TypeScript errors
