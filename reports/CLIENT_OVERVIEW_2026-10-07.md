# Client overview deployment — 2026-10-07

Release: `20261006-client-overview`, prepared October 6 and activated October 7.
Directory: `/var/www/aurelle-release-20261006-client-overview`; port 5011.

Changes: compact profile header with client name/photo, direct profile and messenger buttons, quick actions above the fold on desktop, responsive summary cards, removal of duplicate quick actions, correct master-search tab link, and messenger unread counts sourced from conversations instead of support tickets.

Validation before preparation: TypeScript and production build passed. Browser checks at 390/768/1280/1536 pixels passed for heading height, action-label fit, no horizontal overflow, booking-tab navigation and master-search URL. Desktop and mobile screenshots saved in reports/client-overview-*.png.

October 7 verification: production was still serving 20261006-master-cabinet on 5010; standby 5011 was healthy and connected to the database. Nginx switched to 5011, previous process stopped, background jobs activated and PM2 saved. External HTTPS verification confirmed expected version, connected database, client page 200, new JS/CSS 200, anonymous profile access 401. No user records were modified for validation.

Recovery: `/var/backups/aurelle/20261006-client-overview/rollback.sh`; backup database.dump and previous nginx/config retained in the same directory. No schema migrations for this release.
