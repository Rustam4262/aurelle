# AURELLE — Production Readiness Checklist

## P0 — Critical (must be done before go-live)

### Auth
- [x] **P0.1** 401 from `/api/auth/user` returns `null` (not crash) — `queryClient` global `on401: "returnNull"`
- [x] **P0.1** `ProtectedRoute` guards all authenticated pages, redirects guests to `/auth`

### Email
- [x] **P0.2** `EMAIL_ENABLED` flag — set `EMAIL_ENABLED=false` to safely disable all email
- [x] **P0.2** Send with retry (3 attempts, 1s/2s backoff) — `server/email/index.ts`
- [x] **P0.2** Password reset email sent via `sendPasswordResetEmail()` — `server/localAuth.ts`
- [ ] **P0.2** Fill `EMAIL_USER` + `EMAIL_PASSWORD` in `.env` on production server
- [x] **P0.2** Booking confirmation emails (create/cancel) — `server/lib/booking-emails.ts`

### Rate Limiting
- [x] **P0.4** `loginLimiter` — 10 req/min (failed only), applied to `POST /api/auth/login`
- [x] **P0.4** `resetLimiter` — 5 req/min, applied to `/api/auth/request-password-reset` + `/confirm-password-reset`
- [x] **P0.4** `registerLimiter` — 5 req/min, applied to `POST /api/auth/register`

### CORS
- [x] **P0.5** Replaced `http://localhost:5000` with `http://localhost:5173` (Vite dev)
- [x] **P0.5** `http://localhost` kept for Capacitor Android WebView (port-80 origin)

### Seed Route
- [x] **P0.6** `SEED_TOKEN` env var required to call `/api/admin/seed/test-users` in production
- [x] **P0.6** Hardcoded `TestPass123!` removed from API response
- [ ] **P0.6** Set a strong random `SEED_TOKEN` in production `.env` (or leave unset to fully block)

### Monitoring
- [ ] **P0.3** Fill `SENTRY_DSN` in production `.env` (server error monitoring)
- [ ] **P0.3** Fill `VITE_SENTRY_DSN` in production `.env` (client error monitoring)

### DB
- [ ] Apply `migrations/HOTFIX_add_verification_fields.sql` on production DB

---

## P1 — Important (next sprint)

- [x] **P1.1** Booking confirmation + cancellation emails — `server/lib/booking-emails.ts`, wired into bookings + soloMaster routes
- [x] **P1.2** SMS via Twilio: `server/sms/index.ts` + wired into booking create/cancel/reschedule — fill `TWILIO_FROM` + `SMS_ENABLED=true` in `.env`
- [x] VAPID keys for push notifications — `server/routes/push.routes.ts` (web-push, VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env)
- [x] **P1.3** Booking reminders cron job: `server/jobs/booking-reminders.ts` + `scheduled_notifications` table + `server/lib/reminders.ts`
- [x] **P1.1** Solo master: working-hours schedule tab added to `/solo-master` cabinet
- [x] **P1.1** Solo master: mobile distance check added to booking dialog in `/master/:slug`
- [x] **P1.1** Booking slot conflict check + idempotency guard in `POST /api/bookings`
- [x] **P1.4** Improved `req.user.claims.sub` access pattern (replaces legacy `req.session.passport` pattern)
- [x] **P1.5** Audit logging wired to all solo-master mutations (profile, schedule, settings, services, portfolio)

## P2 — Future

- [ ] Payment integration (Click / Payme)
- [ ] WebSocket for real-time support chat
- [ ] Export reports (Excel / PDF)
- [ ] Mobile app release (Capacitor Android + iOS)

---

## Environment variables required for production

| Key | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Min 32 chars random string |
| `EMAIL_USER` | ✅ | SMTP login |
| `EMAIL_PASSWORD` | ✅ | App-specific password (Gmail) |
| `EMAIL_FROM` | optional | Defaults to `EMAIL_USER` |
| `EMAIL_ENABLED` | optional | Default `true`; set `false` to disable |
| `APP_URL` | optional | Defaults to `https://aurelle.uz` |
| `SENTRY_DSN` | recommended | Server-side error monitoring |
| `VITE_SENTRY_DSN` | recommended | Client-side error monitoring |
| `SEED_TOKEN` | optional | Leave unset to fully block seed endpoint |
| `GOOGLE_CLIENT_ID/SECRET` | optional | Google OAuth |
| `YANDEX_CLIENT_ID/SECRET` | optional | Yandex OAuth |
| `TWILIO_*` | optional | Phone auth via SMS |
| `TWILIO_FROM` | optional | SMS notification sender number (Messages API) |
| `SMS_ENABLED` | optional | Default `true`; set `false` to disable SMS |
| `VAPID_PUBLIC_KEY` | optional | Web Push — generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | optional | Web Push private key |
| `VAPID_SUBJECT` | optional | Web Push contact email — defaults to `mailto:support@aurelle.uz` |
| `VITE_YANDEX_MAPS_API_KEY` | optional | Map on homepage |
