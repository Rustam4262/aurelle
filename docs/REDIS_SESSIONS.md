# Redis Session Store — AURELLE

## Overview

Sessions are stored in **Redis** when `REDIS_URL` is set; otherwise they fall back to **PostgreSQL** (`sessions` table via `connect-pg-simple`). Both stores use the same session cookie, so the switch is transparent to clients.

This is a **zero-configuration opt-in**: the fallback always works, Redis only activates when the env var is present.

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `REDIS_URL` | No | *(absent → PgSession)* | Full connection URL: `redis://host:port` or `rediss://...` (TLS) |
| `REDIS_KEY_PREFIX` | No | `aurelle:` | Key namespace. Append `:` suffix convention: keys look like `aurelle:sess:<sid>` |

### Examples

```bash
# Local Redis (no auth)
REDIS_URL=redis://127.0.0.1:6379

# Redis with password
REDIS_URL=redis://:yourpassword@127.0.0.1:6379

# Redis Cloud / Upstash (TLS)
REDIS_URL=rediss://default:yourpassword@your-endpoint.upstash.io:6380

# Custom key prefix (if sharing Redis with other apps)
REDIS_KEY_PREFIX=aurelle-prod:
```

---

## Session Key Format

```
aurelle:sess:<express-session-id>
```

With TTL = 30 days (same as cookie `maxAge`). TTL is **reset on every request** because `rolling: true` + `disableTouch: false` (default).

---

## Architecture

```
server/config/redis.ts  — env validation, getRedisConfig(), getRedisConfigStatus()
server/lib/redis.ts     — client singleton, initializeRedis(), getRedisClient()
server/auth/index.ts    — calls initializeRedis() inside setupAuth(), selects store
```

### Startup sequence (in `setupAuth`)
1. `initializeRedis()` — tries to connect; on failure → `_client = null`
2. `getRedisClient()` → returns connected client or `null`
3. If connected: `new RedisStore({ client, prefix, ttl })` ← Redis store
4. If null: `new PgSession({ pool, tableName: "sessions" })` ← Postgres fallback

---

## Health Check

```bash
curl https://aurelle.uz/api/health/redis
```

**When Redis is active:**
```json
{
  "status": "ok",
  "configured": true,
  "connected": true,
  "host": "127.0.0.1:6379",
  "keyPrefix": "aurelle:",
  "sessionTtlDays": 30,
  "sessionStore": "redis"
}
```

**When Redis is not configured (default):**
```json
{
  "status": "disabled",
  "configured": false,
  "sessionStore": "postgresql",
  "reason": "REDIS_URL is not set — session store uses PostgreSQL"
}
```

**When Redis is configured but connection failed (degraded):**
```json
{
  "status": "degraded",
  "configured": true,
  "connected": false,
  "sessionStore": "postgresql (fallback)"
}
```

---

## Migration Procedure (PgSession → Redis)

### Prerequisites
- Redis instance available (see [Installation](#installation) below)
- Connection URL ready (tested with `redis-cli -u $REDIS_URL ping`)

### Steps

**1. Set env var (zero-downtime)**
```bash
# On the server — add to .env or set in PM2 ecosystem.config.js:
REDIS_URL=redis://127.0.0.1:6379
```

**2. Reload PM2**
```bash
pm2 reload aurelle-production --update-env
```
New sessions go to Redis immediately. Existing sessions in PostgreSQL become invalid — users with existing sessions will need to log in again (expected, unavoidable with this store switch).

**3. Verify**
```bash
curl https://aurelle.uz/api/health/redis
# → { "status": "ok", "sessionStore": "redis" }

redis-cli -u $REDIS_URL keys 'aurelle:sess:*' | wc -l
# → increases as users log in
```

**4. Keep the PostgreSQL `sessions` table**
Do not drop it — it's used as fallback and may be needed for rollback.

### Rollback
Remove `REDIS_URL` from `.env` and reload PM2:
```bash
# Comment out or delete REDIS_URL in .env
pm2 reload aurelle-production --update-env
# Sessions revert to PostgreSQL store
```

---

## Installation

### Option A — Local Redis (development / single-server)
```bash
# Ubuntu / Debian
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping  # → PONG
```

### Option B — Redis Cloud (managed, production-ready)

**Upstash** (free tier: 10k commands/day, TLS):
1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy the connection URL (starts with `rediss://`)
4. Set `REDIS_URL=rediss://default:password@endpoint.upstash.io:6380`

**Redis Cloud** (Redis Ltd):
1. Sign up at https://redis.com/redis-enterprise-cloud/
2. Create a database, copy the endpoint
3. Set `REDIS_URL=redis://:password@endpoint:port`

---

## Why Redis for Sessions?

| | PostgreSQL (current default) | Redis |
|---|---|---|
| Reads | `SELECT` query (Neon round-trip ~20ms) | In-memory O(1) (~1ms) |
| Writes | `INSERT/UPDATE` | O(1) set with TTL |
| TTL cleanup | Requires cron (pg-simple does this) | Native EXPIRE |
| Cluster-ready | No (single writer) | Yes (sticky sessions or cluster) |
| Operational cost | Free (already running) | Small (Upstash free tier or ~$7/mo for managed) |

The main benefit for AURELLE is **reducing Neon load**: every API request (with a session cookie) currently hits the `sessions` table for a `SELECT`. With Redis, session reads bypass the database entirely.

---

## Security Notes

- `REDIS_URL` is never logged — only the `host:port` portion is shown in health checks and logs
- Use `rediss://` (TLS) for any non-localhost Redis instance
- Redis is not exposed to the internet — use a VPC/private network or bind to `127.0.0.1`
- Consider setting a `requirepass` on Redis and including it in the URL

---

## DoD Verification (P2.1)

- [x] `REDIS_URL` absent → PgSession (no change to existing behaviour)
- [x] `REDIS_URL` set + Redis up → RedisStore with `aurelle:sess:` prefix and 30d TTL
- [x] `REDIS_URL` set + Redis down → falls back to PgSession (logged), app starts normally
- [x] `rolling: true` + `disableTouch: false` → TTL reset on every request
- [x] Health check at `GET /api/health/redis`
- [x] `REDIS_URL` never logged (only host:port in status)
- [x] `disconnectRedis()` available for graceful shutdown
