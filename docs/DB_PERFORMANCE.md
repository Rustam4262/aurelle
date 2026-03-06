# DB Performance Guide — AURELLE

## Overview

This document covers:
1. N+1 query patterns found and fixed
2. Query optimisation patterns used in this codebase
3. How to run EXPLAIN ANALYZE to investigate slow queries
4. Indexes summary

---

## N+1 Fixes (2026-03 sprint)

### owner.routes.ts — Dashboard alerts (FIXED)

**Before (N+1):** For each salon owned by the user, two separate queries were fired:

```sql
-- repeated N times (once per salon):
SELECT * FROM services WHERE salon_id = $salonId;
SELECT * FROM masters  WHERE salon_id = $salonId;
```

With 5 salons → 10 extra queries per request.

**After (batched):** Two queries for all salons at once:

```sql
SELECT DISTINCT salon_id FROM services WHERE salon_id = ANY($salonIds);
SELECT DISTINCT salon_id FROM masters  WHERE salon_id = ANY($salonIds);
```

Then check membership in-memory with a `Set<string>`.

**Location:** [server/routes/owner.routes.ts](../server/routes/owner.routes.ts) — `GET /api/owner/dashboard/alerts`

---

### admin/users.routes.ts — User roles (already batched)

The user list endpoint uses `getBatchedUserRoles(userIds[])` which executes
exactly 3 queries (one per role table) regardless of the number of users.

```typescript
// 3 queries for any N users:
const [adminIds, ownerSalonIds, masterUserIds] = await Promise.all([
  db.select({ userId }).from(adminUsers).where(inArray(adminUsers.userId, ids)),
  db.select({ ownerId }).from(salons).where(inArray(salons.ownerId, ids)),
  db.select({ userId }).from(masters).where(inArray(masters.userId, ids)),
]);
```

---

## Query Patterns

### 1. Batch with `inArray` instead of per-row queries

```typescript
// ❌ N+1: one query per item
for (const user of users) {
  const profile = await db.select().from(profiles).where(eq(profiles.userId, user.id));
}

// ✅ Batch: one query for all items
const profiles = await db
  .select()
  .from(userProfiles)
  .where(inArray(userProfiles.userId, users.map(u => u.id)));

const profileMap = new Map(profiles.map(p => [p.userId, p]));
// Then: profileMap.get(userId)
```

### 2. JOIN instead of two queries

```typescript
// ❌ Two sequential queries
const salon = await db.select().from(salons).where(eq(salons.id, id));
const owner = await db.select().from(users).where(eq(users.id, salon[0].ownerId));

// ✅ One query with JOIN
const [salon] = await db
  .select({ salon: salons, ownerEmail: users.email })
  .from(salons)
  .innerJoin(users, eq(salons.ownerId, users.id))
  .where(eq(salons.id, id));
```

### 3. Parallel independent queries with `Promise.all`

```typescript
// ❌ Sequential (unnecessarily slow)
const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
const totalSalons = await db.select({ count: sql<number>`count(*)` }).from(salons);

// ✅ Parallel
const [totalUsers, totalSalons] = await Promise.all([
  db.select({ count: sql<number>`count(*)` }).from(users),
  db.select({ count: sql<number>`count(*)` }).from(salons),
]);
```

### 4. `COUNT(*)` instead of fetching all rows

```typescript
// ❌ Fetches all rows to count them
const rows = await db.select().from(bookings).where(eq(bookings.salonId, id));
const count = rows.length;

// ✅ Count at the DB level
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(bookings)
  .where(eq(bookings.salonId, id));
```

---

## EXPLAIN ANALYZE Examples

Run these against Neon via `psql $DATABASE_URL`:

### Slow query investigation

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT b.*, u.email
FROM bookings b
INNER JOIN users u ON u.id = b.client_id
WHERE b.salon_id = 'abc123'
  AND b.status = 'pending'
ORDER BY b.created_at DESC
LIMIT 20;
```

Look for:
- `Seq Scan` on large tables → add an index
- `Hash Join` vs `Nested Loop` — both can be fast, check row estimates
- `rows=1000 actual rows=1` → statistics stale, run `ANALYZE <table>`
- `Buffers: shared hit=0 read=5000` → cold cache, consider warming

### Check index usage on bookings

```sql
SELECT
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'bookings'
ORDER BY idx_scan DESC;
```

Indexes with `idx_scan = 0` after weeks of traffic are candidates for removal.

### Find the slowest queries (requires pg_stat_statements)

```sql
SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  left(query, 120) AS query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Indexes Summary

Key indexes created in migrations:

| Table | Index | Columns | Migration |
|-------|-------|---------|-----------|
| bookings | idx_bookings_salon | salon_id | 0019 |
| bookings | idx_bookings_client | client_id | 0019 |
| bookings | idx_bookings_master | master_id | 0019 |
| bookings | idx_bookings_date | scheduled_date | 0019 |
| salons | idx_salons_owner | owner_id | 0000 |
| salons | idx_salons_city | city | 0000 |
| salons | idx_salons_location | lat, lng | 0000 |
| salons | idx_salons_verified | is_verified | 0000 |
| masters | idx_masters_salon | salon_id | 0000 |
| masters | idx_masters_user | user_id | 0000 |
| audit_logs | idx_audit_logs_actor | actor_id, created_at | 001 |
| product_events | idx_pe_name_time | event_name, created_at | 0021 |
| webhook_events | webhook_events_ext_id_idx | external_event_id (partial) | 0024 |
| booking_drafts | idx_bd_user | user_id | 0025 |
| booking_drafts | idx_bd_expires | expires_at | 0025 |
| salon_subscriptions | idx_subs_trial_ends | trial_ends_at | 0026 |
| salon_subscriptions | idx_subs_status | status | 0026 |

See `docs/DB_INDEXES.md` for the complete annotated list.

---

## Monitoring Slow Requests

The `slowRequestLogger` middleware (added in sprint 5.1) automatically logs:
- `WARN` for requests > 500ms (configurable via `SLOW_WARN_MS` env var)
- `ERROR` for requests > 2000ms (configurable via `SLOW_ERROR_MS` env var)

Each log includes `requestId`, `method`, `path`, `status`, and `durationMs`.
Filter in your log aggregator with `source=slowRequestLogger`.

In Sentry, slow requests are tagged with `slow_request=error` for easy dashboarding.
