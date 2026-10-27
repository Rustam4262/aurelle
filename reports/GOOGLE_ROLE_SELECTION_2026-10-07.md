# Google role selection — 2026-10-07

Deployed 20261007-google-roles, port 5013; prior 20261007-google-auth retained.

New Google registrations now require a persistent one-time role choice after authentication. /choose-role offers Client, Freelance master and Salon owner; clicking saves the choice and opens /client, /solo-master/onboarding or /owner respectively. Existing accounts keep their roles. Owner role is now reported by /api/auth/user even before the first salon is added.

Migration 0043 adds users.role_selection_required and marks incomplete Google client profiles without a master, salon or admin record for selection. This recovers the automatic client assignment reported by the user. Profile details remain intact. A UI gate also redirects existing sessions requiring selection. The endpoint accepts only the three public signup roles, requires authentication/CSRF and atomically consumes the flag with a transaction and guarded update, preventing subsequent role changes through this endpoint.

Validation: TypeScript/build passed; mocked OAuth regression and role endpoint tests passed. Built browser UI tests passed all three role destinations, 390px no-overflow and existing-pending-client redirect. Mobile screenshot inspected. Public production health/version/providers/page/assets passed; unauthenticated role POST rejected with 401. No role was selected on behalf of a real user during testing.

Full DB backup before migration: /var/backups/aurelle/20261007-google-roles/database.dump
Rollback: bash /var/backups/aurelle/20261007-google-roles/rollback.sh
Rollback preserves the additive flag column and chosen roles.

Final production release: 20261007-google-roles-v2, port 5014.
Added /choose-role to private SEO document policy after the first live check found HTTP 404 despite SPA rendering. Rebuilt and redeployed; final external verification passed health/version, Google enabled, role page HTTP 200 and noindex, current assets, unauthenticated role POST 401. One existing Google account awaits role selection. Migration was not rerun in v2.
Final release rollback: bash /var/backups/aurelle/20261007-google-roles-v2/rollback.sh (previous roles release). The earlier google-roles rollback restores pre-onboarding Google auth if necessary.
