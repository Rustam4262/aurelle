# Salon master cabinet — 2026-10-06

Deployed: `20261006-master-cabinet`, directory `/var/www/aurelle-release-20261006-master-cabinet`, port 5010.

## Fixes
- Portfolio uploader previously posted multipart to an unimplemented endpoint. It now uploads to `/api/upload/portfolio`, then persists the URL through the authenticated `/api/master/portfolio` endpoint.
- Successful upload now refreshes the portfolio query instead of the master dashboard query.
- Public salon-team portfolio endpoint merges both existing portfolio tables, deduplicating image URLs.
- Avatar and portfolio upload requests use the shared FormData-compatible API client. Progress timers are cleared on failure. Upload directories are created when missing; generated file extensions match optimized JPEG content.
- Master header and overview display the master photo; salon card displays its first photo, with fallback icons when absent.
- Overview includes the master's name, experience and biography with an explicit profile-settings button. Tabs and cards adapt to narrow screens.
- Added a separate master response field and authenticated, CSRF-protected reply endpoint scoped to the master's own non-hidden reviews. Existing salon-owner responses remain unchanged. Responses render in public review views.
- Localized the portfolio introduction in RU/UZ/EN.

## Validation
- TypeScript and production build passed.
- Browser test with mocked API: multipart upload, portfolio persistence and immediate refresh, rendered master/salon images, review response saving, profile updates, and 390px layout passed.
- Real multipart upload handlers tested with synthetic images in an isolated temporary directory: directory creation, image processing and JPEG output passed. Auth was bypassed only within this test harness.
- Reply handler tests with a mocked database checked role rejection, master/review-scoped predicates, hidden-review exclusion, length/blank validation, and separate master response writes.
- Production: nginx config valid; expected health version and database connected; master/main/messenger pages and new assets accessible; anonymous master access rejected; public merged portfolio SQL returned successfully.
- No real customer reviews or user profiles were modified for testing.

## Database / recovery
Migration `0042_master_review_response.sql` applied transactionally after a full database backup.
Backup: `/var/backups/aurelle/20261006-master-cabinet/database.dump`.
Rollback: `bash /var/backups/aurelle/20261006-master-cabinet/rollback.sh`.
Previous release retained; PM2 state saved. Rollback retains the additive response column and recorded responses.
