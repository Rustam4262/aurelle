# Product Analytics Events — AURELLE

## Overview

Product events capture user intent and conversion data without relying on third-party
services. Events are stored in the `product_events` table (PostgreSQL / Neon) and can
be queried directly for funnel analysis, cohort reports, and A/B test measurements.

---

## Architecture

```
HTTP handler
  └─ trackEvent({ eventName, userId, req, properties })
       └─ setImmediate (non-blocking)
            ├─ isSampled?   — drop high-frequency events probabilistically
            ├─ isRateLimited? — drop bursts from same user
            └─ queue.push(event)
                 └─ setTimeout 2s → db.insert(productEvents).values(batch[0..100])
```

**Key properties:**
- **Non-blocking** — `trackEvent()` returns before any I/O. Response time is unaffected.
- **Fire-and-forget** — DB write failures are logged and silently dropped. App stability > event completeness.
- **Batched** — up to 100 events per INSERT, flushed every 2 seconds.
- **Cluster-safe** — each PM2 worker queues and flushes independently. No inter-worker coordination needed.

---

## Events Catalogue

### `registration_complete`

Fired when a user successfully registers via email/password.

| Field | Value |
|---|---|
| Source | `server/localAuth.ts` (inside `session.save` callback) |
| `userId` | New user's ID |
| `properties` | `{}` |
| Sampling | 100% |
| Rate limit | 3 / minute / user |

---

### `booking_started`

Fired when a client successfully creates a booking (status: `pending`).

| Field | Value |
|---|---|
| Source | `server/routes/client.routes.ts` → `POST /api/bookings` |
| `userId` | Authenticated client's user ID |
| `properties` | `{ salonId, serviceId, masterId \| null, bookingId }` |
| Sampling | 100% |
| Rate limit | 10 / minute / user |

---

### `booking_completed`

Fired when a salon owner bulk-updates bookings to `confirmed` or `completed`.
One event per booking in the batch.

| Field | Value |
|---|---|
| Source | `server/routes/owner.routes.ts` → bulk status update |
| `userId` | `null` (owner action — client's userId not readily available) |
| `properties` | `{ bookingId, salonId, clientId, status }` |
| Sampling | 100% |
| Rate limit | 10 / minute / user (owner) |

**Note:** `clientId` is the client profile ID (not user ID). To find the client's user ID,
join `product_events.properties->>'clientId'` with `user_profiles.id`.

---

### `search_performed`

Fired on every call to `GET /api/salons/` (the public salon list / map view).

| Field | Value |
|---|---|
| Source | `server/routes/salons.routes.ts` → `GET /` |
| `userId` | Authenticated user's ID, or `null` for anonymous visitors |
| `properties` | `{ city \| null, resultCount }` |
| Sampling | **25%** — only 1 in 4 searches recorded |
| Rate limit | 20 / minute / user |

---

## Anti-Spam Protection

### Rate limiting

Per-user, per-event rolling window (1 minute). Implemented in `server/lib/analytics.ts`
as an in-memory Map per PM2 worker. Best-effort — does not coordinate across workers.

| Event | Max / minute / user |
|---|---|
| `search_performed` | 20 |
| `booking_started` | 10 |
| `booking_completed` | 10 |
| `registration_complete` | 3 |
| Any other | 30 |

Anonymous events (no `userId`) bypass rate limiting.

### Sampling

`search_performed` is sampled at 25% to reduce storage while preserving statistical
accuracy. All other events are recorded at 100%.

To change a sampling rate, edit `SAMPLING` in `server/lib/analytics.ts`:

```typescript
const SAMPLING: Record<string, number> = {
  search_performed: 0.25, // 25% — adjust as needed
};
```

### Queue cap

The in-memory write queue is capped at 500 events. If the queue is full (e.g. DB outage),
the oldest event is dropped to make room for the newest. This prevents unbounded memory
growth during prolonged DB failures.

---

## Database

### Table: `product_events`

```sql
CREATE TABLE product_events (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  VARCHAR(100) NOT NULL,
  user_id     VARCHAR,             -- no FK — survives user deletion
  session_id  VARCHAR(128),        -- HTTP session ID
  properties  JSONB NOT NULL DEFAULT '{}',
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Migration: `migrations/0021_create_product_events.sql`

### Useful queries

**Daily signups (last 30 days):**
```sql
SELECT DATE(created_at) AS day, COUNT(*) AS signups
FROM product_events
WHERE event_name = 'registration_complete'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day;
```

**Conversion funnel (last 7 days):**
```sql
SELECT
  SUM(CASE WHEN event_name = 'search_performed'    THEN 1 END) AS searches,
  SUM(CASE WHEN event_name = 'booking_started'     THEN 1 END) AS bookings_started,
  SUM(CASE WHEN event_name = 'booking_completed'   THEN 1 END) AS bookings_completed
FROM product_events
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Top cities searched:**
```sql
SELECT properties->>'city' AS city, COUNT(*) AS searches
FROM product_events
WHERE event_name = 'search_performed'
  AND properties->>'city' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY city
ORDER BY searches DESC
LIMIT 10;
```

**Search → booking conversion rate per user:**
```sql
WITH searches AS (
  SELECT user_id, COUNT(*) AS n
  FROM product_events
  WHERE event_name = 'search_performed' AND user_id IS NOT NULL
    AND created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
),
bookings AS (
  SELECT user_id, COUNT(*) AS n
  FROM product_events
  WHERE event_name = 'booking_started' AND user_id IS NOT NULL
    AND created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT
  ROUND(COUNT(b.user_id)::numeric / COUNT(s.user_id) * 100, 1) AS conversion_pct
FROM searches s
LEFT JOIN bookings b USING (user_id);
```

---

## Adding a New Event

1. Choose a snake_case event name (e.g. `profile_updated`)
2. Call `trackEvent()` in the appropriate route handler:

```typescript
import { trackEvent } from "../lib/analytics";

// inside handler, just before or after res.json():
trackEvent({
  eventName: "profile_updated",
  userId: req.user.claims.sub,
  req,
  properties: { changedFields: ["phone", "avatar"] },
});
```

3. Optionally add a custom rate limit or sampling entry in `server/lib/analytics.ts`
4. Document the event in this file

---

## DoD Verification (P3.1)

- [x] `product_events` table + 3 indexes in `migrations/0021_create_product_events.sql`
- [x] `trackEvent()` in `server/lib/analytics.ts` — non-blocking, batched, never throws
- [x] Rate limiting (in-memory, per-worker) — configurable per event type
- [x] Sampling — `search_performed` at 25%, all others 100%
- [x] Queue cap — 500 events max, oldest dropped under pressure
- [x] `registration_complete` — `localAuth.ts` registration handler
- [x] `booking_started` — `client.routes.ts` POST /api/bookings
- [x] `booking_completed` — `owner.routes.ts` bulk status update (confirmed/completed)
- [x] `search_performed` — `salons.routes.ts` GET /api/salons/
- [x] `npx tsc --noEmit` — zero new TypeScript errors

### Manual verification

```bash
# Register a new user, then check DB:
psql $DATABASE_URL -c "
  SELECT event_name, user_id, properties, created_at
  FROM product_events
  ORDER BY created_at DESC
  LIMIT 5;
"

# Expected output:
#  event_name            | user_id       | properties | created_at
#  registration_complete | local:1234... | {}         | 2026-03-03 ...
```
