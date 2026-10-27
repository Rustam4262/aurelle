# Google sign-in setup — AURELLE

Status: local implementation tested; production credentials are missing. Not deployed or enabled yet.

1. Google Cloud → Google Auth Platform: create/select the AURELLE project.
2. Configure Branding (app name, support/developer email, domain aurelle.uz, real published homepage/privacy/terms URLs), Audience External.
3. Create a Web application OAuth client.
4. Authorized redirect URI, exact: https://aurelle.uz/api/auth/google/callback
5. Download client JSON outside the repository. Do not commit it or paste secrets in chat.
6. Testing: add the Google accounts used for verification under Audience → Test users. Publish to Production for general access, completing any verification Google requests.
7. Securely configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server; GOOGLE_CALLBACK_URL=https://aurelle.uz/api/auth/google/callback. Restart the new release with updated environment.
8. Verify /api/auth/providers reports google:true; manually test a new client, a returning account and registration as owner/freelancer with the user. Do not log codes/tokens or create appointments/messages as a side effect.

Only profile and email scopes are requested. Callback defaults to the production URI above. Local development must explicitly register and configure its own localhost callback if not using port 5000.

Implementation:
- OAuth state bound to session; rotate session after authentication; provider tokens are not stored.
- Require Google's verified email. Automatic email linking only for Gmail or Google Workspace identities for which Google is authoritative; other existing-email accounts must use their existing sign-in method.
- Existing roles and avatars are preserved. New profiles receive the selected registration role, with freelancer onboarding.
- Blocked/deleted accounts rejected; same-origin redirects only.
- Unconfigured providers stay disabled, OAuth errors are displayed, social registration requires acceptance of terms.

Checks: npx tsx scripts/verify-google-auth.ts (mocked provider and database; no real Google login).
Source: https://developers.google.com/identity/protocols/oauth2/web-server

## Deployment 2026-10-07
- Enabled production release 20261007-google-auth on port 5012; previous 20261006-client-overview retained.
- Downloaded Web OAuth client validated for project and exact callback. Credentials transferred privately into mode-600 release configuration; staging JSON removed. No secrets in repository or report.
- Pre-deploy tests, TypeScript and build passed. Full database backup created; no migration required.
- Standby and external production checks: healthy database, google:true, redirect to Google with exact callback and state, rejection of invalid callback state, auth-page assets accessible.
- PM2 saved; background jobs switched to the new release.
- Rollback: bash /var/backups/aurelle/20261007-google-auth/rollback.sh
- End-to-end consent and login with a real Google account still require user testing. Google Cloud screenshot indicates Testing audience; configure test users or publish before general release.
