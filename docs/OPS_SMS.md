# OPS: SMS Notifications (Twilio)

SMS notifications are used for booking confirmation, cancellation, and reschedule events.
This is separate from phone OTP authentication (which uses Twilio Verify + `TWILIO_SERVICE_SID`).

---

## Architecture

```
booking created/cancelled/rescheduled
        │
        ▼ fire-and-forget (void async IIFE)
server/routes/bookings.routes.ts
        │  looks up client phone from userProfiles
        ▼
server/sms/index.ts → sendBookingCreatedSms / sendBookingCancelledSms / sendBookingRescheduledSms
        │  uses Twilio Messages API (not Verify)
        ▼
Twilio → client's phone number
```

## Environment Variables

| Variable              | Required | Description                                          |
| --------------------- | -------- | ---------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`  | Yes      | Twilio Account SID (starts with `AC`)                |
| `TWILIO_AUTH_TOKEN`   | Yes      | Twilio Auth Token                                    |
| `TWILIO_FROM`         | Yes      | Sender number in E.164 format (e.g. `+12025551234`) |
| `SMS_ENABLED`         | No       | Set to `false` to disable all SMS. Default: `true`  |

> `TWILIO_SERVICE_SID` is only for phone OTP auth — not needed here.

## Enabling SMS in Production

1. Create a Twilio account at https://twilio.com
2. Buy a phone number (or use a Messaging Service SID as sender)
3. Add to `/var/www/aurelle/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_FROM=+12025551234
   SMS_ENABLED=true
   ```
4. Reload the app: `pm2 reload aurelle-production`
5. Smoke test:
   ```bash
   # Check config status (no auth required):
   curl https://aurelle.uz/api/health/sms

   # Send a live test SMS:
   cd /var/www/aurelle
   TO_PHONE=+998XXXXXXXXX tsx scripts/test-sms.ts
   ```

## Health Check

`GET /api/health/sms` — no auth required.

**Response when enabled:**
```json
{
  "status": "ok",
  "enabled": true,
  "ok": true,
  "reason": null,
  "provider": "twilio",
  "fromNumber": "+12025551234"
}
```

**Response when disabled/misconfigured:**
```json
{
  "status": "disabled",
  "enabled": false,
  "ok": false,
  "reason": "Missing env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM",
  "provider": "twilio",
  "fromNumber": null
}
```

> Note: Unlike `/api/health/email`, the SMS health check does **not** make a live API call to Twilio
> (no "ping" endpoint in the Messages API). It only validates that config is present and non-empty.
> Use `scripts/test-sms.ts` for a live send test.

## Disabling SMS

Set `SMS_ENABLED=false` in `.env` and reload. All send functions return `false` silently.

## Phone Number Format

The SMS module normalizes Uzbek numbers automatically:

| Input            | Normalized     |
| ---------------- | -------------- |
| `998901234567`   | `+998901234567`|
| `0901234567`     | `+998901234567`|
| `901234567`      | `+998901234567`|
| `+998901234567`  | `+998901234567`|

For non-Uzbek numbers, include the country code (e.g. `+7...`, `+1...`).

## Security Notes

- Phone numbers are **never** logged in full — only last 4 digits (`***5678`).
- `TWILIO_AUTH_TOKEN` is read only via `getSmsConfig()` (internal) — never exposed in health endpoints.
- SMS sends are fire-and-forget (`void async IIFE`) — failures don't affect the booking API response.
- 3 retries with 1s / 2s backoff on Twilio failures.

## Troubleshooting

| Symptom                          | Likely cause                                        |
| -------------------------------- | --------------------------------------------------- |
| `/api/health/sms` returns `disabled` | Env vars missing or `SMS_ENABLED=false`         |
| SMS not delivered                | Wrong `TWILIO_FROM` format or unverified trial number |
| Twilio error `21608`             | Trial account — recipient number not verified       |
| Twilio error `21211`             | Invalid `to` number format                          |
| No SMS on booking but no error   | `clientProfile.phone` is null in DB                |

**Trial account limitation**: Twilio trial accounts can only send to verified numbers.
Upgrade to a paid account or verify the recipient at https://twilio.com/console/phone-numbers/verified.
