# Production release 2026-10-05

Deployed: 20261005-master-profile-navigation
Release: /var/www/aurelle-release-20261005-fixes
PM2: aurelle-production-20261005-fixes, port 5007; saved.
Previous release 20260930-fixes stopped and retained.

Includes all current application source changes: salon-master profile settings and visible reviews/rating, booking client name/avatar/card, cabinet back navigation. Earlier September fixes retained.

Validation: TypeScript passed; master profile API role/payload/ownership transaction tests passed; production build passed. Built UI tested locally and on aurelle.uz using intercepted test API responses: profile save/reload, reviews/rating, mobile tabs, client card, back/reload/forward/direct-link fallback. No real customer profile writes or bookings were made by these UI tests.
Live /api/health healthy, database connected, expected version; /ru HTTP 200; unauthenticated /api/master/me HTTP 401.

Backup: /var/backups/aurelle/20261005-fixes/database.dump (pg_dump custom format), nginx.conf, previous.config.json.
Rollback: bash /var/backups/aurelle/20261005-fixes/rollback.sh
No database schema migration required or run.
