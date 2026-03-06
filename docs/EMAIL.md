# Email Architecture — AURELLE

## Stack

| Layer | File | Role |
|---|---|---|
| Config validation | `server/config/email.ts` | Validates env vars at startup; exports `getEmailConfig()` + `getEmailConfigStatus()` |
| Transport + templates | `server/email/index.ts` | Nodemailer singleton, 3-retry backoff, all HTML templates |
| Shim (compat) | `server/lib/email.ts` | Re-export only — do not add logic here |

---

## Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `EMAIL_ENABLED` | No | `true` if host/user/pass all set | Set `false` to disable without removing other vars |
| `EMAIL_HOST` | Yes* | — | `smtp.gmail.com` for Gmail |
| `EMAIL_PORT` | No | `587` | `465` for SSL, `587` for TLS/STARTTLS |
| `EMAIL_USER` | Yes* | — | SMTP username / Gmail address |
| `EMAIL_PASSWORD` | Yes* | — | App Password (Gmail) or SMTP password |
| `EMAIL_FROM` | No | `EMAIL_USER` | `"AURELLE" <noreply@aurelle.uz>` |
| `EMAIL_SECURE` | No | `false` | `true` → port 465 SSL; `false` → STARTTLS on 587 |
| `EMAIL_REQUIRE_TLS` | No | `false` | Force STARTTLS upgrade |

*Required when EMAIL_ENABLED is not explicitly `false`.

### Current production config (Gmail)
```
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=roziyev18r@gmail.com
EMAIL_PASSWORD=<App Password>
EMAIL_FROM="AURELLE" <roziyev18r@gmail.com>
EMAIL_SECURE=false
EMAIL_REQUIRE_TLS=false
```

---

## Reliability

- **3 retries** with 1s / 2s exponential backoff on SMTP errors
- **`sendEmail()` never throws** — returns `Promise<boolean>`; callers may fire-and-forget
- **`verifyTransport()`** result is cached 60s — used by `/api/health/email` only
- **Graceful degradation**: if EMAIL_ENABLED=false or config missing, all sends return `false` + log `email_disabled`

---

## Email Templates

| Function | Trigger | Subject |
|---|---|---|
| `sendEmailVerificationEmail` | Registration (fire-and-forget) | "Подтвердите email — AURELLE" |
| `sendPasswordResetEmail` | `POST /api/auth/request-password-reset` | "Сброс пароля — AURELLE" |
| `sendBookingConfirmation` | `POST /api/client/bookings` (booking created) | Booking confirmation |
| `sendBookingCancellation` | `DELETE /api/client/bookings/:id` | Booking cancellation |
| `sendBookingReminder` | Scheduled notifications | Booking reminder |
| `sendUserBlockedEmail` | Admin blocks user | Account suspended |
| `sendUserUnblockedEmail` | Admin unblocks user | Account restored |
| `sendManagerInvitationEmail` | Salon owner invites manager | Manager invitation |

All templates are 3-language (ru/uz/en) with `language` parameter defaulting to `"ru"`.

---

## Email Verification Flow

### On Registration
1. `POST /api/auth/register` creates user with `email_verified = false`
2. Fire-and-forget: `sendVerificationEmail(userId, email)` inserts token (24h TTL) + sends email
3. User receives link: `https://aurelle.uz/api/auth/verify-email?token=<64-hex>`

### Verify endpoint
```
GET /api/auth/verify-email?token=<64-hex>
```
- Validates token (not expired, not used)
- Sets `users.email_verified = true`
- Marks token `used_at = NOW()`
- Redirects to `/?emailVerified=1`

### Resend
```
POST /api/auth/resend-verification
Body: { "email": "user@example.com" }
```
- Rate-limited (shared with password reset limiter)
- Always returns success (no email enumeration)
- No-ops silently if email already verified

### Database Table
```sql
email_verification_tokens (
  id          VARCHAR PK,
  user_id     VARCHAR NOT NULL,
  token       VARCHAR(64) UNIQUE NOT NULL,
  expires_at  TIMESTAMP NOT NULL,   -- 24 hours from creation
  used_at     TIMESTAMP,            -- NULL = not yet used
  created_at  TIMESTAMP DEFAULT NOW()
)
```
Migration: `migrations/0020_email_verification_tokens.sql`

Apply on server:
```bash
psql $DATABASE_URL -f /var/www/aurelle/migrations/0020_email_verification_tokens.sql
```

---

## Password Reset Flow

1. `POST /api/auth/request-password-reset` — generates 64-hex token (1h TTL), sends email (fire-and-forget)
2. User clicks link → client renders reset form with token in URL query string
3. `POST /api/auth/confirm-password-reset` — validates token, hashes new password, marks token used

Tokens table: `password_reset_tokens` (already in DB).

---

## Health Check

```bash
curl https://aurelle.uz/api/health/email
```

Response:
```json
{
  "status": "ok",
  "enabled": true,
  "smtpVerified": true,
  "host": "smtp.gmail.com",
  "port": 587,
  "from": "roziyev18r@gmail.com"
}
```

`smtpVerified` is cached 60s. Status `"disabled"` means EMAIL_ENABLED=false or config missing.

---

## CLI Smoke Test

```bash
# On the server (or locally with correct env):
TO_EMAIL=your@email.com npx tsx scripts/test-email.ts
```

Sends a real test email and exits 0 on success.

---

## DoD Verification (P1.4)

- [x] Verification email sent on registration (fire-and-forget, logged)
- [x] Token expires after 24h, single-use
- [x] `GET /api/auth/verify-email` sets `email_verified = true`
- [x] `POST /api/auth/resend-verification` rate-limited, no enumeration
- [x] Password reset email sent with 1h token (existing, working)
- [x] Booking confirmation email sent on `POST /api/client/bookings`
- [x] Booking cancellation email sent on `DELETE /api/client/bookings/:id`
- [x] 3 retries with backoff — `sendEmailDetailed()` in `server/email/index.ts`
- [x] Graceful fail — `sendEmail()` returns boolean, never throws
- [x] Health check at `/api/health/email`
