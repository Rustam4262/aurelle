# Server-side Caching — AURELLE

## Overview

Dashboard endpoints were executing **32+ SQL queries on every page refresh**. A two-tier
caching layer (Redis primary, in-memory fallback) reduces that to zero queries on cache hits
and keeps the admin panel snappy even on Neon's free-tier cold connections.

---

## Architecture

```
server/lib/cache.ts
  ├─ withCache(key, ttl, fetcher)     ← main entry point
  ├─ invalidateCache(key, prefix?)    ← targeted or prefix-wildcard deletion
  └─ invalidateDashboardCache()       ← convenience: invalidates all dash:* keys

Redis (when REDIS_URL set)
  └─ GET / SET EX / SCAN-DEL
In-memory Map (no REDIS_URL)
  └─ memGet / memSet / memDelByPrefix (TTL checked on read)
```

All keys are namespaced: `aurelle:cache:<shortKey>`

Redis errors are swallowed — the cache is best-effort. Fetcher errors always propagate.

---

## Cached Endpoints

| Route | Cache key | TTL |
|---|---|---|
| `GET /api/admin/dashboard` | `dash:stats:{range}` | 60 s |
| `GET /api/admin/dashboard/action-center` | `dash:action-center` | 60 s |
| `GET /api/admin/dashboard/online` | `dash:online` | 30 s |
| `GET /api/admin/dashboard/user-growth` | `dash:growth:{range}:{series}` | 300 s |
| `GET /api/admin/dashboard/funnel` | `dash:funnel:{range}` | 300 s |
| `GET /api/admin/dashboard/trends` | `dash:trends:{days}` | 300 s |
| `GET /api/admin/dashboard/platform-health` | `dash:platform-health` | 60 s |

`GET /api/admin/dashboard/activity` — **not cached** (real-time feed).

---

## Cache Invalidation

Invalidation fires **fire-and-forget** (`.catch(() => {})`) on mutations that affect
dashboard counts. The entire `dash:*` subtree is dropped so every stale variant is cleared.

| Mutation | File |
|---|---|
| Booking created | `server/routes/client.routes.ts` |
| Booking cancelled | `server/routes/client.routes.ts` |
| Salon verified / unverified | `server/routes/admin/salons.routes.ts` |
| Complaint resolved / rejected | `server/routes/admin/complaints.routes.ts` |
| Sanction created / revoked | `server/routes/admin/sanctions.routes.ts` |

Adding a new mutation that affects dashboard counts:
```typescript
import { invalidateDashboardCache } from "../lib/cache";
// inside the handler, before res.json():
invalidateDashboardCache().catch(() => {});
```

---

## API

### `withCache<T>(key, ttl, fetcher)`

```typescript
const result = await withCache("dash:stats:30d", 60, async () => {
  // expensive DB work here
  return { total: 123 };
});
```

- `key` — short key string (no prefix needed)
- `ttl` — seconds until the cached value expires
- `fetcher` — async function that returns the data to cache

### `invalidateCache(key, prefix?)`

```typescript
await invalidateCache("dash:stats:30d");          // exact key
await invalidateCache("dash:", true);             // all dash:* keys
```

### `invalidateDashboardCache()`

Shorthand for `invalidateCache("dash:", true)`. Returns a `Promise<void>` — use
`.catch(() => {})` to keep it fire-and-forget.

---

## Redis Key Format

```
aurelle:cache:dash:stats:30d
aurelle:cache:dash:action-center
aurelle:cache:dash:growth:7d:salons
aurelle:cache:dash:online
...
```

To inspect live cache keys:
```bash
redis-cli -u $REDIS_URL keys 'aurelle:cache:dash:*'
```

To manually bust the dashboard cache:
```bash
redis-cli -u $REDIS_URL --scan --pattern 'aurelle:cache:dash:*' | xargs redis-cli -u $REDIS_URL del
```

---

## In-memory Fallback

When `REDIS_URL` is not set, an in-memory `Map<string, {data, expiresAt}>` is used.
TTL is enforced lazily on read (expired entries are deleted and treated as a miss).

**Limitations of in-memory cache:**
- Not shared across PM2 workers — each worker caches independently
- Lost on process restart
- No eviction policy (unbounded growth in theory, but dashboard keys are few)

For production with PM2 cluster mode, set `REDIS_URL` so all workers share the same cache.

---

## Environment

| Variable | Required | Notes |
|---|---|---|
| `REDIS_URL` | No | Shared with session store and rate limiters. Without it → in-memory. |

No additional env vars needed for caching.

---

## DoD Verification (P2.3)

- [x] `withCache` + `invalidateCache` + `invalidateDashboardCache` in `server/lib/cache.ts`
- [x] All 7 dashboard endpoints wrapped (activity excluded — real-time)
- [x] Invalidation wired into booking, salon, complaint, sanction mutations
- [x] Redis path: GET → miss → fetcher → SET EX; hit returns early
- [x] In-memory path: identical logic with `Map` + TTL check
- [x] Redis errors swallowed; fetcher errors propagate normally
- [x] `npx tsc --noEmit` — zero new TypeScript errors

### Manual test

```bash
# First request — cache miss, queries DB
curl -s -H "Cookie: ..." https://aurelle.uz/api/admin/dashboard | jq .stats.users.total
# Returns: 42 (DB queried)

# Second request within 60s — cache hit
curl -s -H "Cookie: ..." https://aurelle.uz/api/admin/dashboard | jq .stats.users.total
# Returns: 42 (from Redis, no DB query)

# Verify key exists
redis-cli -u $REDIS_URL ttl 'aurelle:cache:dash:stats:30d'
# Returns: 37 (seconds remaining)

# Create a booking, then re-check
# After booking is created, invalidateDashboardCache() fires
redis-cli -u $REDIS_URL ttl 'aurelle:cache:dash:stats:30d'
# Returns: -2 (key deleted)
```
