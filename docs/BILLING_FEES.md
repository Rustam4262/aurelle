# Platform Fee / Commission System — AURELLE

## Overview

AURELLE charges a platform fee (take rate) on each succeeded payment. The fee is:
- **Configured** by admins via `GET/PUT /api/admin/billing/fee-config`
- **Snapshotted** at payment creation — rate changes never affect historical records
- **Stored** as 4 columns on every payment: `gross_amount_uzs`, `fee_percent`, `platform_fee_uzs`, `net_amount_uzs`

---

## Fee Lookup Logic

```
calculateFee(grossAmountUzs, salonId)
  ├─ salonId given → look up platformFeeConfig WHERE salon_id = :salonId (latest row)
  │    ├─ Found (even 0%) → use it (honours partner deals)
  │    └─ Not found → fall through to global
  └─ Global → look up platformFeeConfig WHERE salon_id IS NULL (latest row)
       ├─ Found → use that rate
       └─ Not found → 0% (no config = no fee)
```

**DB error safety**: `calculateFee()` catches all exceptions and falls back to 0% rather than breaking the payment flow. The error is logged as a warning.

---

## Payment Record Fields

| Column | Type | Description |
|---|---|---|
| `amount_uzs` | INTEGER | What the customer pays (unchanged) |
| `gross_amount_uzs` | INTEGER | Same as `amount_uzs` — explicit alias for GMV reports |
| `fee_percent` | DECIMAL(5,2) | Platform fee rate snapshotted at creation |
| `platform_fee_uzs` | INTEGER | `round(gross × fee_percent / 100)` |
| `net_amount_uzs` | INTEGER | `gross − platform_fee` — what the salon receives |

**Existing payments** (before P3.2 migration) are backfilled with `fee_percent = 0`, `platform_fee_uzs = 0`, `net_amount_uzs = amount_uzs`.

---

## Admin API

All endpoints require admin authentication (`requireAdmin`). Fee mutation endpoints
additionally require the `billing.write` permission.

### `GET /api/admin/billing/fee-config`

Returns current effective configs (one per scope).

```json
{
  "global": {
    "feePercent": 10,
    "description": "Standard platform fee",
    "updatedAt": "2026-03-03T12:00:00Z"
  },
  "salonOverrides": [
    { "salonId": "abc-123", "feePercent": 5, "description": "Partner deal", "updatedAt": "..." }
  ]
}
```

### `PUT /api/admin/billing/fee-config`

Set or update the global default fee rate.

**Body:**
```json
{ "feePercent": 10, "description": "Standard 10% platform fee" }
```

- `feePercent`: 0–100 (decimal, e.g. `10.5` for 10.5%)
- `description`: optional audit note

### `PUT /api/admin/billing/fee-config/salon/:salonId`

Set or update a per-salon override. Overrides the global rate for this salon only.

**Body:** same as global — `{ "feePercent": 5, "description": "Partner deal" }`

### `DELETE /api/admin/billing/fee-config/salon/:salonId`

Remove per-salon override. The salon reverts to the global default.

### `GET /api/admin/billing/revenue?range=30d`

Revenue summary for succeeded payments. `range`: `7d` | `30d` | `90d` | omit for all-time.

```json
{
  "range": "30d",
  "succeeded": {
    "count": 142,
    "gmvUzs": 71000000,
    "platformFeeUzs": 7100000,
    "netUzs": 63900000,
    "avgFeePercent": 10,
    "takeRate": 10.0
  },
  "pending": { "count": 8 },
  "failed": { "count": 3 }
}
```

---

## Configuration Storage (`platform_fee_config`)

```sql
CREATE TABLE platform_fee_config (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    VARCHAR,               -- NULL = global; non-null = per-salon override
  fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_by  VARCHAR NOT NULL,      -- admin user ID
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Uniqueness**: partial unique indexes enforce one active row per scope:
- `idx_pfc_global` — at most one row `WHERE salon_id IS NULL`
- `idx_pfc_per_salon` — at most one row per distinct `salon_id`

The application uses SELECT-then-UPDATE/INSERT (not a database-level upsert) because
Drizzle's `onConflictDoUpdate` doesn't support partial index conflict targets cleanly.
Race conditions between concurrent admin updates are acceptable for this low-frequency config.

Migration: `migrations/0022_create_platform_fee_config.sql`

---

## Permissions

| Permission | Required for |
|---|---|
| `analytics.read` | `GET /fee-config`, `GET /revenue` |
| `billing.write` | `PUT /fee-config`, `PUT /fee-config/salon/:id`, `DELETE /fee-config/salon/:id` |

Grant `billing.write` to the superadmin role in the `admin_users` / role permissions table.
The `analytics.read` permission is already granted to all admin roles (used by dashboard).

---

## Revenue Queries

**GMV and take rate (last 30 days):**
```sql
SELECT
  COUNT(*)                                          AS payments,
  SUM(gross_amount_uzs)                             AS gmv_uzs,
  SUM(platform_fee_uzs)                             AS fees_uzs,
  SUM(net_amount_uzs)                               AS net_uzs,
  ROUND(SUM(platform_fee_uzs)::numeric
        / NULLIF(SUM(gross_amount_uzs), 0) * 100, 2) AS take_rate_pct
FROM payments
WHERE status = 'succeeded'
  AND created_at >= NOW() - INTERVAL '30 days';
```

**Per-salon revenue breakdown:**
```sql
SELECT
  salon_id,
  COUNT(*)                      AS payments,
  SUM(gross_amount_uzs) / 100   AS gmv_som,
  SUM(platform_fee_uzs) / 100   AS fees_som,
  SUM(net_amount_uzs)   / 100   AS net_som
FROM payments
WHERE status = 'succeeded'
GROUP BY salon_id
ORDER BY gmv_som DESC;
```

**Fee config history:**
```sql
SELECT salon_id, fee_percent, description, created_by, updated_at
FROM platform_fee_config
ORDER BY COALESCE(salon_id, ''), updated_at DESC;
```

---

## DoD Verification (P3.2)

- [x] `platform_fee_config` table + partial unique indexes (migration `0022`)
- [x] 4 fee columns added to `payments` table + backfill (migration `0022`)
- [x] `calculateFee()` in `server/lib/billing.ts` — salon-specific → global → 0% fallback
- [x] DB error in `calculateFee` returns 0% (never breaks payment flow)
- [x] `POST /api/payments/create` — calls `calculateFee()`, stores snapshot in payment record
- [x] Fee logged alongside payment creation (`feePercent`, `platformFeeUzs`, `netAmountUzs`)
- [x] `GET /api/admin/billing/fee-config` — current effective configs
- [x] `PUT /api/admin/billing/fee-config` — global rate CRUD
- [x] `PUT /api/admin/billing/fee-config/salon/:id` — per-salon override CRUD
- [x] `DELETE /api/admin/billing/fee-config/salon/:id` — remove override
- [x] `GET /api/admin/billing/revenue` — GMV/fee/net totals with `?range=` filter
- [x] All mutations write to audit_logs via `logAuditAction()`
- [x] `npx tsc --noEmit` — zero new TypeScript errors

### Manual test

```bash
# 1. Set global fee to 10%
curl -X PUT https://aurelle.uz/api/admin/billing/fee-config \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -d '{"feePercent": 10, "description": "Standard 10%"}'

# 2. Create a payment (client session)
curl -X POST https://aurelle.uz/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Cookie: <client-session>" \
  -d '{"bookingId": "xxx", "type": "full"}'

# 3. Verify fee was snapshotted
psql $DATABASE_URL -c "
  SELECT amount_uzs, gross_amount_uzs, fee_percent, platform_fee_uzs, net_amount_uzs
  FROM payments ORDER BY created_at DESC LIMIT 1;
"
# Expected: gross=amount, fee_percent=10, platform_fee=10%*gross, net=90%*gross
```
