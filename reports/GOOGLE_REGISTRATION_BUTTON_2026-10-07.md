# Google registration button fix — 2026-10-07

Production: 20261007-google-register, port 5015.
Removed the stale role prerequisite from the Google button's disabled condition and removed the email form's checkbox prerequisite from its click handler. Google no longer sends the email form's selected role; first-time role selection remains after OAuth. Updated RU/UZ/EN social hint and added visible terms/privacy notice with links beside social sign-in. Email registration keeps its existing role/password/consent requirements.

Validation: TypeScript and production build passed; browser regression checked both Login and Registration with no role/email/password/checkbox and confirmed navigation to Google auth endpoint. Production browser confirmed Registration button starts OAuth (outbound navigation intercepted, no real accounts created). Live health expected version and database connected.

Full backup and rollback: /var/backups/aurelle/20261007-google-register/rollback.sh
No migrations or user record changes. Prior release retained, PM2 saved.
