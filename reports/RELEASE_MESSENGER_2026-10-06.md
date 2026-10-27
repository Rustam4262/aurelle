# Messenger production deployment — 2026-10-06

Status: deployed to https://aurelle.uz/messenger.

## Release
- Version: `20261006-messenger`
- Server: `62.113.58.208`
- Directory: `/var/www/aurelle-release-20261006-messenger`
- PM2: `aurelle-production-20261006-messenger`, port `5008`
- Nginx switched from port 5007 to 5008; config validation passed.
- Background jobs enabled on the new release after stopping the previous process.
- PM2 process list saved.

## Database and rollback
- Full database backup: `/var/backups/aurelle/20261006-messenger/database.dump`
- Migrations 0039, 0040, 0041 applied together in a transaction.
- Previous release and nginx configuration retained.
- Rollback command on the server: `bash /var/backups/aurelle/20261006-messenger/rollback.sh`
- Rollback restores the previous application and nginx route; it intentionally retains messenger tables and data.

## Validation
- Before deployment: TypeScript check and production build passed.
- Previously completed isolated PostgreSQL integration tests and two-account browser tests cover direct chats, groups, membership permissions, unread state, photos, PDFs, retries and mobile layout. See MESSENGER_GROUPS_ATTACHMENTS_2026-10-06.md.
- Standby release: healthy, database connected, messenger page 200, anonymous conversations 401.
- After cutover, external HTTPS checks: expected version and connected database; /ru, /ru/search and /messenger return 200; referenced JS/CSS assets return 200.
- /messenger sends X-Robots-Tag with noindex (HTTP header, not an HTML meta tag).
- Anonymous conversations, contacts and attachment requests return 401.
- No real-user messages or production test bookings were created. Authenticated chat scenarios were verified locally, not repeated against production accounts.

## Delivered scope
Direct conversations, named groups with membership controls, text messages, private image/PDF attachments up to 8 MiB, unread counters, RU/UZ/EN and mobile layout, messenger entry points in platform cabinets.

Current limitations: updates use polling; salon contact opens the owner's personal conversation. A shared staff inbox, voice messages and push notifications are not part of this release.
