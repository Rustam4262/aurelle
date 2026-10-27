# Yandex ID — 2026-10-07

Status: local implementation; production YANDEX_CLIENT_ID and YANDEX_CLIENT_SECRET are absent. Not deployed/enabled yet.

Create an authorization application at https://oauth.yandex.ru/client/new/id/ (not an API-debug application), name AURELLE, Web service, callback https://aurelle.uz/api/auth/yandex/callback. Grant login:info, login:email, login:avatar. Store Client ID/secret outside the repository and share only its file path. Official guide: https://yandex.ru/dev/id/doc/ru/register-auth

Implementation: fixed callback, session-bound OAuth state, rotated session, no stored provider tokens. First sign-in marks roleSelectionRequired and redirects to /choose-role; subsequent sign-ins retain role. Explicit yandex provider metadata prevents Google attribution. Existing accounts with matching email are not automatically merged without verified ownership evidence; a localized error requests their existing sign-in method. A missing email is allowed if Yandex returned a stable account ID. Existing Yandex IDs continue signing in.

UI: both provider buttons independent of email form role/terms fields; role choice after OAuth; RU/UZ/EN hints and visible terms/privacy notice cover Google and Yandex. Disabled while a provider is unconfigured.

Validation: scripts/verify-yandex-auth.ts, scripts/verify-google-auth.ts; TypeScript; production build; browser scripts verify-yandex-registration-button.cjs and verify-google-registration-button.cjs. Synthetic provider/database data only; no real user messages, registration or emails.

Deployment pending credentials; no migration required (0043 role_selection_required already exists on production). Real Yandex consent/login must be verified after credentials are installed.

## Production deployment 2026-10-07
Enabled 20261007-yandex-auth on port 5016. Previous release 20261007-google-register retained. Credentials loaded from user-supplied local file into mode-600 release config; temporary remote credential file removed. Full database backup created before cutover, no migration or user-record writes.
Standby and external checks passed: healthy DB and expected version, Google and Yandex enabled, Yandex redirect with fixed callback and nonempty state, production Registration tab starts Yandex without email-form fields (outbound navigation intercepted). Real Yandex consent/login and configured provider permissions still require user verification.
Rollback: bash /var/backups/aurelle/20261007-yandex-auth/rollback.sh
PM2 saved; jobs activated on new release.
