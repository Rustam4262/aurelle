# Monitoring & Uptime

## Health Endpoints

| Endpoint | DB check | Use case |
|---|---|---|
| `GET /api/health/ping` | No | Uptime monitor liveness probe (poll every 30–60 s) |
| `GET /api/health` | Yes | Full readiness check — returns 503 if DB unreachable |
| `GET /api/health/email` | No | SMTP connectivity check |
| `GET /api/health/sms` | No | Twilio config status |
| `GET /api/health/sentry` | No | Sentry DSN presence check |

### `/api/health/ping` response

```json
{ "status": "ok", "ts": "2026-03-03T12:00:00.000Z" }
```

Always 200. Process is alive if you receive a response.

### `/api/health` response (healthy)

```json
{
  "status": "healthy",
  "timestamp": "2026-03-03T12:00:00.000Z",
  "uptime": 123456.78,
  "responseTime": "4ms",
  "database": { "status": "connected" },
  "version": "1.0.0",
  "environment": "production"
}
```

Returns **503** with `"status": "unhealthy"` if the Neon DB is unreachable.

---

## UptimeRobot Setup (free tier — 5-minute intervals)

1. Go to [https://uptimerobot.com](https://uptimerobot.com) → **Add New Monitor**
2. Settings:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: `Aurelle Production`
   - **URL**: `https://aurelle.uz/api/health/ping`
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: add your email / Telegram
3. Add a second monitor for the full DB check:
   - **URL**: `https://aurelle.uz/api/health`
   - **Keyword**: `"healthy"` (Keyword monitor type → alert if keyword absent)
   - **Interval**: 15 minutes (has DB query cost)

### Telegram alerts (recommended)
- In UptimeRobot: **Alert Contacts → Add Alert Contact → Telegram**
- Create a bot via [@BotFather](https://t.me/BotFather), get your chat ID
- Paste bot token + chat ID in UptimeRobot

---

## BetterStack (Uptime) Setup (recommended — 30-second intervals on free tier)

1. Go to [https://betterstack.com/uptime](https://betterstack.com/uptime) → **New Monitor**
2. Settings:
   - **URL**: `https://aurelle.uz/api/health/ping`
   - **Check frequency**: 30 seconds
   - **Expected status code**: 200
   - **Regions**: Frankfurt + Singapore (closest to Uzbekistan)
3. Add a **second monitor** for the DB health:
   - **URL**: `https://aurelle.uz/api/health`
   - **Expected status code**: 200
   - **Frequency**: 3 minutes
4. **Escalation policy**: on-call → SMS/phone after 2 failed checks in a row

### Status page
BetterStack can host a public status page (e.g. `status.aurelle.uz`):
- Dashboard → **Status Pages → New Status Page**
- Add both monitors above
- Custom domain: add CNAME `status.aurelle.uz → statuspage.betterstack.com`

---

## Nginx rate-limit exclusion

The health endpoints are mounted **before** the Express rate limiter (see `server/routes.ts`),
so uptime monitor polling never counts against user-facing rate limits.

If you also run Nginx-level rate limiting, whitelist the endpoints:

```nginx
# In your server block (configs/nginx-https.conf)
location = /api/health/ping {
    access_log off;       # keep access logs clean
    proxy_pass http://localhost:5000;
}
location = /api/health {
    proxy_pass http://localhost:5000;
}
```

---

## Alerting checklist

- [ ] UptimeRobot or BetterStack account created
- [ ] `/api/health/ping` monitor active (≤ 5 min interval)
- [ ] `/api/health` monitor active for DB-aware check
- [ ] Alert contact set (email **and** Telegram/SMS)
- [ ] Alert fires on 2+ consecutive failures (avoids false positives)
- [ ] Status page URL shared with team (optional)

---

## Manual health check

```bash
# Quick liveness
curl https://aurelle.uz/api/health/ping

# Full readiness (DB + version)
curl https://aurelle.uz/api/health | jq .

# From the server itself (avoids network)
curl http://localhost:5000/api/health/ping
```
