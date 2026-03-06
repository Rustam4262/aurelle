# Security Secrets — Session Management

## Overview

Sessions are signed with HMAC-SHA256 using `SESSION_SECRET_CURRENT`.
Express-session accepts an array of secrets: the first entry signs new cookies, all
entries verify existing ones — enabling zero-downtime secret rotation.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET_CURRENT` | **Yes (prod)** | Signs all new session cookies. Min 64 chars. |
| `SESSION_SECRET_PREVIOUS` | No | Accepts cookies signed with the old secret during rotation. |

---

## Initial Setup (first deploy)

```bash
# Generate a strong secret (128 hex chars = 64 bytes of entropy)
openssl rand -hex 64
```

Copy the output into your server `.env`:

```env
SESSION_SECRET_CURRENT=<paste output here>
SESSION_SECRET_PREVIOUS=
```

The server **will refuse to start** in production if `SESSION_SECRET_CURRENT` is
absent or shorter than 64 characters.

---

## Rotating the Secret (zero-downtime)

Rotation keeps all currently-logged-in users active during the 30-day cookie window.

### Step 1 — Generate a new secret

```bash
openssl rand -hex 64
```

### Step 2 — Update the server `.env`

```env
# New secret → signs all new cookies from this point
SESSION_SECRET_CURRENT=<new secret>

# Old secret → verifies cookies that were signed before rotation
SESSION_SECRET_PREVIOUS=<old SESSION_SECRET_CURRENT value>
```

### Step 3 — Reload the process (no downtime)

```bash
pm2 reload aurelle-production
```

Verify the server started with both secrets active — you should see in the logs:

```
Auth system initialized (local auth only) (rotation: 2 secrets active)
```

### Step 4 — Remove the old secret after 30 days

Once all cookies signed with the old secret have expired (max cookie age = 30 days),
clear `SESSION_SECRET_PREVIOUS` and reload again:

```env
SESSION_SECRET_CURRENT=<new secret>
SESSION_SECRET_PREVIOUS=
```

```bash
pm2 reload aurelle-production
```

---

## Cookie Security Settings

The session cookie is hardened in `server/auth/index.ts`:

| Setting | Value | Purpose |
|---|---|---|
| `httpOnly` | `true` | Blocks JavaScript access (XSS mitigation) |
| `secure` | `true` in production | HTTPS-only transmission |
| `sameSite` | `"lax"` | Blocks cross-site POST (CSRF mitigation) |
| `maxAge` | 30 days | Automatic expiry |
| `rolling` | `true` | Resets expiry on activity (sliding window) |

---

## Production Checklist

- [ ] `SESSION_SECRET_CURRENT` set to a 128-char hex string (`openssl rand -hex 64`)
- [ ] `SESSION_SECRET_CURRENT` stored in your password manager / secret vault
- [ ] No hardcoded secrets in source code (search: `grep -r "fallback-secret" server/`)
- [ ] `NODE_ENV=production` is set (enables `secure` cookie + startup validation)
- [ ] `.env` is in `.gitignore` and never committed

---

## Emergency: Force Logout All Users

If a secret is compromised, invalidate all sessions immediately:

```bash
# Option A: delete all sessions from the DB
psql $DATABASE_URL -c "DELETE FROM sessions;"

# Option B: rotate the secret (new secret → all old cookies fail signature check)
# Set SESSION_SECRET_CURRENT = <new secret>, leave SESSION_SECRET_PREVIOUS empty
# Then: pm2 reload aurelle-production
```

All users will be logged out and need to sign in again.
