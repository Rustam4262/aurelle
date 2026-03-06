# Database Indexes — Performance Guide

## Applying the Migration

Indexes are created `CONCURRENTLY` — no table lock, safe to run on live production.

```bash
# On the production server:
psql $DATABASE_URL -f /var/www/aurelle/migrations/0019_performance_indexes.sql
```

Each `CREATE INDEX CONCURRENTLY IF NOT EXISTS` statement is idempotent and independent.
If one fails the others still apply.

---

## Index Inventory

### `users` table

| Index | Columns | Type | Purpose |
|---|---|---|---|
| `idx_users_created_at` | `created_at DESC` | B-tree | Dashboard range stats, growth chart `GROUP BY DATE` |
| `idx_users_is_blocked` | `is_blocked` WHERE true | Partial B-tree | Admin users status=blocked filter (indexes only minority rows) |
| `idx_users_email_verified` | `email_verified` | B-tree | Verification filter, action-center unverified count |
| `idx_users_phone_verified` | `phone_verified` | B-tree | Verification filter |
| `idx_users_last_login_at` | `last_login_at DESC NULLS LAST` | B-tree | Sort by last login in admin users list |
| `email` (unique) | `email` | B-tree | Login lookup — already exists via `.unique()` |
| `phone_number` (unique) | `phone_number` | B-tree | Phone auth lookup — already exists via `.unique()` |

### `bookings` table

| Index | Columns | Purpose |
|---|---|---|
| `idx_bookings_created_at` *(new)* | `created_at DESC` | Dashboard period stats and growth chart |
| `idx_bookings_date` | `booking_date` | Conflict checking, calendar view |
| `idx_bookings_status` | `status` | Status filter |
| `idx_bookings_master_date_status` | `(master_id, booking_date, status)` | Master schedule conflict check |
| `idx_bookings_salon_date_status` | `(salon_id, booking_date, status)` | Salon schedule conflict check |

### `salons` table

| Index | Columns | Purpose |
|---|---|---|
| `idx_salons_created_at` *(new)* | `created_at DESC` | Dashboard growth chart, period stats |
| `idx_salons_owner` | `owner_id` | Owner dashboard queries |
| `idx_salons_verified` | `is_verified` | Unverified salons count |
| `idx_salons_location` | `(latitude, longitude)` | Geo-search |

### `masters` table

| Index | Columns | Purpose |
|---|---|---|
| `idx_masters_created_at` *(new)* | `created_at DESC` | Dashboard period stats |
| `idx_masters_salon` | `salon_id` | Salon master list |
| `idx_masters_user` | `user_id` | User → master lookup (role derivation) |

### `audit_logs` table

| Index | Columns | Purpose |
|---|---|---|
| `idx_audit_logs_created_at` *(new)* | `created_at DESC` | Admin audit list ORDER BY |
| `idx_audit_logs_actor` | `(actor_id, created_at)` | Actor-specific audit lookup |
| `idx_audit_logs_entity` | `(entity_type, entity_id, created_at)` | Entity audit history |

### `user_activity_sessions` table

| Index | Columns | Purpose |
|---|---|---|
| `idx_user_activity_last_active` *(new)* | `last_activity_at DESC` | Online users count (last 10 min) |

### `payments` table (already fully indexed)

`idx_payments_created`, `idx_payments_status`, `idx_payments_booking`, etc. — all exist.

---

## Query Plan Verification (EXPLAIN ANALYZE)

After applying the migration, run these on the Neon console or via `psql`:

### Admin users list (no filters)
```sql
EXPLAIN ANALYZE
SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 0;
-- Should show: Index Scan using idx_users_created_at (not Seq Scan)
```

### Admin users list (blocked filter)
```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE is_blocked = true ORDER BY created_at DESC LIMIT 20;
-- Should show: Bitmap Heap Scan via idx_users_is_blocked
```

### Dashboard — users in last 30 days
```sql
EXPLAIN ANALYZE
SELECT count(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days';
-- Should show: Index Only Scan using idx_users_created_at
```

### Dashboard — bookings created today
```sql
EXPLAIN ANALYZE
SELECT count(*) FROM bookings WHERE created_at >= CURRENT_DATE;
-- Should show: Index Scan using idx_bookings_created_at
```

### Online users (dashboard widget)
```sql
EXPLAIN ANALYZE
SELECT count(*) FROM user_activity_sessions WHERE last_activity_at >= NOW() - INTERVAL '10 minutes';
-- Should show: Index Scan using idx_user_activity_last_active
```

---

## What Changed in `GET /api/admin/users`

The endpoint previously loaded **all users into Node.js memory**, then filtered in JavaScript:

```
Before: SELECT * FROM users  →  100k rows in RAM  →  JS filter/sort/slice  →  respond
After:  SELECT ... WHERE ... ORDER BY ... LIMIT 20 OFFSET 0  →  20 rows  →  respond
```

Query count per request:

| | Queries | Rows transferred |
|---|---|---|
| Before | 1 (full table) + role batch | 100k → RAM |
| After | 2 parallel (count + page) + role batch | 20 rows |

Filters pushed to SQL:
- **Search**: `ILIKE '%term%'` on email, first_name, last_name, phone_number
- **Status**: `WHERE is_blocked = true/false`
- **Verification**: `WHERE email_verified = true` etc.
- **Role**: SQL subqueries (`WHERE id IN (SELECT user_id FROM admin_users ...)`)
- **Sort**: `ORDER BY created_at DESC` (indexed)
- **Pagination**: `LIMIT pageSize OFFSET offset` (no JS slice)

---

## Partial Index note

`idx_users_is_blocked` is a **partial index** (`WHERE is_blocked = true`). This is intentional:
- Most users are not blocked, so indexing only blocked rows keeps the index tiny
- PostgreSQL uses it for `WHERE is_blocked = true` queries
- For `WHERE is_blocked = false` (active users), PostgreSQL correctly falls back to a sequential
  scan — or uses `idx_users_created_at` if sorting by `created_at`

---

## Future Indexes (when needed)

| When | Index |
|---|---|
| Search traffic > 10k req/s | `GIN` index on `to_tsvector('russian', email \|\| ' ' \|\| first_name \|\| ' ' \|\| last_name)` using `pg_trgm` extension |
| Reviews per salon slow | `idx_reviews_salon_created` on `(salon_id, created_at DESC)` |
| Payments dashboard slow | Already indexed. Monitor with `pg_stat_user_indexes`. |
