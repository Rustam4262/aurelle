# Sentry Error Monitoring

## Architecture

| Layer | Package | Entry point |
|---|---|---|
| Backend (Node.js) | `@sentry/node@8` | `server/lib/sentry.ts` → called in `server/index.ts` |
| Frontend (React) | `@sentry/react@8` | `client/src/lib/sentry.ts` → called in `client/src/main.tsx` |
| Source maps upload | `@sentry/vite-plugin` | `vite.config.ts` (production builds only) |

Both SDKs use the same release identifier so source maps are linked to browser events.

---

## Initial Setup

### Step 1 — Create a Sentry project

1. Sign up at [sentry.io](https://sentry.io) (free tier: 5 000 errors/month)
2. **Create project → Node.js** for the backend DSN
3. **Create project → React** for the frontend DSN
   - Or use one project for both (simpler — same DSN value for `SENTRY_DSN` and `VITE_SENTRY_DSN`)

### Step 2 — Get your DSN

Project → Settings → Client Keys (DSN). Copy the value — it looks like:

```
https://abc123def456@o123456.ingest.sentry.io/7654321
```

### Step 3 — Set environment variables on the server

```bash
# On the production server, add to /var/www/aurelle/.env:
SENTRY_DSN=https://abc123...@o123456.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=production
VITE_SENTRY_DSN=https://abc123...@o123456.ingest.sentry.io/7654321  # same or separate project
VITE_SENTRY_ENVIRONMENT=production
```

Reload: `pm2 reload aurelle-production`

---

## Release Tracking & Source Maps

Releases link error events to a specific code version so you get readable stack traces.

### How it works

1. At build time, `sentryVitePlugin` uploads `dist/public/**/*.map` files to Sentry under a release name,
   then **deletes** the `.map` files so they're never served publicly.
2. Both the plugin and the browser SDK must use the **exact same release name**.
   `vite.config.ts` computes it as: `VITE_SENTRY_RELEASE → SENTRY_RELEASE → aurelle@{package.version}`.
3. The backend SDK uses its own release string: `SENTRY_RELEASE → aurelle-backend@{APP_VERSION}`.

### Set release in your deploy script

```bash
# On the server, before npm run build:
RELEASE=aurelle@$(git rev-parse --short HEAD)

# In .env or as inline env:
VITE_SENTRY_RELEASE=$RELEASE     # browser SDK + vite plugin
SENTRY_RELEASE=aurelle-backend@$(git rev-parse --short HEAD)  # node SDK
```

Or pin a semver release once per version:
```env
VITE_SENTRY_RELEASE=aurelle@1.2.0
SENTRY_RELEASE=aurelle-backend@1.2.0
```

### Source maps upload requirements

Set these in `.env` before running `npm run build` in production:

```env
SENTRY_AUTH_TOKEN=   # Auth token with project:releases + org:read scopes
SENTRY_ORG=          # Your Sentry organization slug
SENTRY_PROJECT=      # Your Sentry project slug
```

Get the auth token: sentry.io → User Settings → Auth Tokens → Create Token.
Required scopes: `project:releases`, `org:read`.

The Vite plugin only runs when **all three** are set AND `NODE_ENV=production`.
Without them, the build still succeeds — just without source map upload.

---

## Verifying Setup (DoD check)

### 1 — Trigger a test error on the backend

The `/api/debug/sentry-test` endpoint throws a real exception that Sentry captures:

```bash
# Set SENTRY_DEBUG_TOKEN in .env first, then:
curl -H "x-debug-token: <SENTRY_DEBUG_TOKEN>" https://aurelle.uz/api/debug/sentry-test
```

Expected: `500` response + error appears in Sentry within 30 seconds with:
- `environment: production`
- `release: aurelle-backend@1.x.x`
- No `password`/`cookie`/`authorization` in the request payload

### 2 — Verify frontend events

Open devtools console on `https://aurelle.uz` and run:

```javascript
// This uses the Sentry SDK loaded by the page
Sentry.captureMessage("test from browser", "info");
```

Or trigger an unhandled error — it should appear in Sentry tagged with the correct release.

### 3 — Verify source maps are working

In a captured error, the stack trace should show **your TypeScript source file names and line numbers**,
not minified bundle code. If you see `bundle.js:1:23456`, source maps are not linked.

Common causes:
- `VITE_SENTRY_RELEASE` mismatch between build env and runtime env
- `SENTRY_AUTH_TOKEN` not set at build time (maps were never uploaded)
- Maps were uploaded to a different project than `VITE_SENTRY_DSN` points to

---

## Environment Variable Reference

| Variable | Where used | Description |
|---|---|---|
| `SENTRY_DSN` | Server | Backend DSN. Errors captured if set. |
| `SENTRY_ENVIRONMENT` | Server | Tag for filtering in Sentry (e.g. `production`) |
| `SENTRY_RELEASE` | Server + build | Backend release tag (e.g. `aurelle-backend@1.0.0`) |
| `VITE_SENTRY_DSN` | Client bundle | Frontend DSN. Same or different project as backend. |
| `VITE_SENTRY_ENVIRONMENT` | Client bundle | Tag for frontend events |
| `VITE_SENTRY_RELEASE` | Client bundle + build | **Must match** what the Vite plugin uploads source maps under |
| `SENTRY_AUTH_TOKEN` | Build only | Uploads source maps. Never deployed to server. |
| `SENTRY_ORG` | Build only | Sentry org slug |
| `SENTRY_PROJECT` | Build only | Sentry project slug |
| `SENTRY_DEBUG_TOKEN` | Server | Protects `/api/debug/sentry-test` test endpoint |
| `SENTRY_FORCE_ENABLE` | Dev | Set `true` to send events in development |

---

## Behavior by Environment

| Environment | Backend captures | Frontend captures | Source maps |
|---|---|---|---|
| `NODE_ENV=development` | No (filtered in `beforeSend`) | No (filtered) | Not uploaded |
| `NODE_ENV=production` + DSN set | Yes (5xx errors only) | Yes | Uploaded if `SENTRY_AUTH_TOKEN` set |
| Any + `SENTRY_FORCE_ENABLE=true` | Yes | Yes | Build-time only |

5xx errors are captured automatically. 4xx errors (401, 404, validation) are intentionally ignored.

---

## Data Privacy

`beforeSend` in both SDKs scrubs before transmission:
- **Backend**: removes `authorization`, `cookie`, `x-api-key` headers; scrubs `password`, `token`, `secret`, `apiKey` from request body
- **Frontend**: no cookies are sent; no PII beyond user ID/email if `setUser()` is called after login
- Session Replay has `maskAllText: true` and `blockAllMedia: true`
