# OPS: Sentry Error Monitoring

Sentry captures unhandled exceptions, React render errors, and slow transactions
for both the backend (Node.js) and frontend (React).

---

## Architecture

```text
Browser (React)                   Server (Node.js)
├── initializeSentry()            ├── initializeSentry()
├── browserTracingIntegration()   ├── setupSentryMiddleware()
├── replayIntegration()           ├── setupSentryErrorHandler()
├── ErrorBoundary.captureException│
└── useAuth → setUser()           └── setUserFromRequest()
        │                                   │
        └──────────── Sentry DSN ───────────┘
                      (two separate projects or one shared)
```

## Environment Variables

| Variable                | Side     | Required | Description                                              |
| ----------------------- | -------- | -------- | -------------------------------------------------------- |
| `SENTRY_DSN`            | Backend  | Yes      | DSN from Sentry project settings (starts with `https:`) |
| `VITE_SENTRY_DSN`       | Frontend | Yes      | Same or separate DSN for the React app                   |
| `SENTRY_ENVIRONMENT`    | Backend  | No       | Override environment tag (default: `NODE_ENV`)           |
| `SENTRY_RELEASE`        | Backend  | No       | Release tag, e.g. `aurelle-backend@1.2.0`                |
| `VITE_SENTRY_RELEASE`   | Frontend | No       | Release tag for frontend bundle                          |
| `SENTRY_DEBUG_TOKEN`    | Backend  | No       | Token for `/api/debug/sentry-test` (falls back to `SEED_TOKEN`) |
| `SENTRY_FORCE_ENABLE`   | Both     | No       | Set to `true` to send events in development              |

## Enabling Sentry in Production

1. Create a project at <https://sentry.io> (Node.js + React, or a single project).
2. Copy the DSN from **Project → Settings → Client Keys (DSN)**.
3. Add to `/var/www/aurelle/.env`:

   ```bash
   SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/YYYY
   VITE_SENTRY_DSN=https://xxxx@oXXX.ingest.sentry.io/YYYY
   SENTRY_ENVIRONMENT=production
   ```

4. Rebuild and reload:

   ```bash
   cd /var/www/aurelle
   npm run build
   pm2 reload aurelle-production --update-env
   ```

## Health Check

`GET /api/health/sentry` — no auth required.

**Response when enabled:**

```json
{
  "enabled": true,
  "dsnPresent": true,
  "environment": "production",
  "release": "aurelle-backend@1.0.0"
}
```

**Response when disabled:**

```json
{
  "enabled": false,
  "dsnPresent": false,
  "environment": "production",
  "release": "aurelle-backend@1.0.0"
}
```

## Smoke Test (after enabling)

```bash
# 1. Confirm config is picked up:
curl https://aurelle.uz/api/health/sentry

# 2. Trigger a test error (replace TOKEN with SENTRY_DEBUG_TOKEN or SEED_TOKEN):
curl -H "x-debug-token: TOKEN" https://aurelle.uz/api/debug/sentry-test

# 3. Open Sentry dashboard → Issues → look for "Sentry test error"
```

## Security Notes

- The DSN value is **never** returned by `/api/health/sentry` — only `dsnPresent: true/false`.
- `beforeSend` scrubs `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`,
  `secret`, `apiKey` from request body, and removes `Authorization`, `Cookie`, `x-api-key` headers.
- Events are suppressed in `NODE_ENV !== production` unless `SENTRY_FORCE_ENABLE=true`.
- Session Replay uses `maskAllText: true` + `blockAllMedia: true` (GDPR-safe).

## Sample Rates (production)

| Signal              | Sample Rate |
| ------------------- | ----------- |
| Traces (backend)    | 20%         |
| Profiles (backend)  | 20%         |
| Traces (frontend)   | 20%         |
| Profiles (frontend) | 20%         |
| Session Replay      | (default)   |

Adjust `tracesSampleRate` in `server/lib/sentry.ts` and `client/src/lib/sentry.ts` as needed.

## Ignored Errors

Backend: `ValidationError`, `Bad Request`, `Unauthorized`, `Forbidden`, `Too Many Requests`, `ECONNRESET`, `EPIPE`

Frontend: Browser extension errors, `NetworkError`, `ResizeObserver loop` (benign)

## Troubleshooting

| Symptom                          | Likely cause                                            |
| -------------------------------- | ------------------------------------------------------- |
| No events in Sentry              | `SENTRY_DSN` / `VITE_SENTRY_DSN` not set               |
| Events only in dev               | `SENTRY_FORCE_ENABLE` not set (suppressed by `beforeSend`) |
| `/health/sentry` shows disabled  | Env var missing or not loaded by PM2                    |
| Test endpoint returns 401        | Wrong token in `x-debug-token` header                   |
| User context missing             | `useAuth` not called in component tree                  |
