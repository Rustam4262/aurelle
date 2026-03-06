# Rate Limiting — AURELLE

## Overview

All rate limiters use **Redis as the shared store** when `REDIS_URL` is set. Without Redis, each process keeps its own in-memory counter — acceptable for single-process deployments, but wrong under PM2 cluster mode (N workers × limit = actual limit).

---

## Limiter Inventory

| Export | Route(s) | Window | Max | `skipSuccessful` | Key prefix |
|---|---|---|---|---|---|
| `loginLimiter` | `POST /api/auth/login` | 1 min | 10 | **true** (counts only failed) | `aurelle:rl:login:` |
| `resetLimiter` | `POST /api/auth/request-password-reset`, `POST /api/auth/resend-verification` | 1 min | 5 | false | `aurelle:rl:reset:` |
| `registerLimiter` | `POST /api/auth/register` | 1 min | 5 | false | `aurelle:rl:register:` |
| `oauthLimiter` | OAuth start routes (Google, Yandex, GitHub) | 15 min | 20 | false | `aurelle:rl:oauth:` |
| `apiLimiter` | General API | 1 min | 100 | false | `aurelle:rl:api:` |
| `createLimiter` | `POST /api/*/bookings`, reviews, etc. | 1 min | 10 | false | `aurelle:rl:create:` |
| `uploadLimiter` | File upload routes | 15 min | 20 | false | `aurelle:rl:upload:` |
| `globalLimiter` | All `/api/*` | 1 min | 200 | false | `aurelle:rl:global:` |

Key format: `aurelle:rl:<name>:<ip-address>`

---

## Architecture

```
server/middleware/rateLimiter.ts
  └─ makeStore(name)                      ← factory
       ├─ REDIS_URL absent → undefined    → in-memory (express-rate-limit default)
       └─ REDIS_URL present → RedisStore  → shared across all PM2 workers
            └─ sendCommand: lazy via getRedisClient()
```

### Why lazy `sendCommand`?

`rateLimiter.ts` is imported at module-load time, before `initializeRedis()` runs in `setupAuth()`. Using a lazy `sendCommand` that calls `getRedisClient()` at request time ensures the Redis client is available by the time the first request arrives.

### Failure mode

If Redis drops after startup, `sendCommand` throws and `express-rate-limit` calls `next(error)` — causing a 500 for that request. This is intentional: Redis downtime is a P1 incident and should not silently disable rate limiting. Monitor with `GET /api/health/redis`.

---

## Cluster Correctness

With PM2 cluster (`instances: 4`) and **no Redis**:

```
Worker 1 counter: 3/10
Worker 2 counter: 2/10
Worker 3 counter: 4/10
Worker 4 counter: 1/10
         total: 10 attempts, none blocked
```

With **Redis**:

```
All workers → Redis key "aurelle:rl:login:<ip>" = 10
                                                → 429 Too Many Requests ✓
```

---

## Key Expiry

`rate-limit-redis` uses Redis `PEXPIRE` to set per-key TTL equal to `windowMs`. Keys auto-expire — no cleanup job needed.

To inspect active rate-limit keys:
```bash
redis-cli -u $REDIS_URL keys 'aurelle:rl:*'
# e.g.:
# aurelle:rl:login:192.168.1.100
# aurelle:rl:global:10.0.0.5
```

To manually reset a blocked IP (e.g., 192.168.1.100 in loginLimiter):
```bash
redis-cli -u $REDIS_URL del "aurelle:rl:login:192.168.1.100"
```

---

## Environment

| Variable | Required | Notes |
|---|---|---|
| `REDIS_URL` | No | Shared with session store (P2.1). When absent → in-memory per-worker |

No extra env vars — rate limiters use the same Redis connection as the session store.

---

## DoD Verification (P2.2)

- [x] `REDIS_URL` absent → in-memory (no change for single-process)
- [x] `REDIS_URL` set → all 8 limiters use `RedisStore` with distinct key prefixes
- [x] `loginLimiter` preserves `skipSuccessfulRequests: true`
- [x] Lazy `sendCommand` — Redis connected before any request hits the limiter
- [x] Keys expire automatically via `PEXPIRE` (no cleanup job)
- [x] Manual reset possible via `redis-cli del`
- [x] Cluster correctness: N workers share one counter per IP

### Manual test (N workers)

```bash
# Start 4 workers
pm2 start ecosystem.config.js

# Send 11 login requests with wrong password (same IP, different workers)
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://aurelle.uz/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# First 10: 401 (auth failed, counted)
# 11th: 429 (rate limited) ✓

# Check the Redis key
redis-cli -u $REDIS_URL get "aurelle:rl:login:<your-ip>"
```
