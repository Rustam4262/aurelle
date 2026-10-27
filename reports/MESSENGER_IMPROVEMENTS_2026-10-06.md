# Messenger follow-up — 2026-10-06

Deployed version: `20261006-messenger-ui`, port 5009, directory `/var/www/aurelle-release-20261006-messenger-ui`.

- Name/avatar fallback now includes the professional master profile; empty/whitespace account fields no longer prevent fallback. Applies to direct chats, message sender names and group participants.
- Read-only inspection of the reported production conversation confirmed one participant had name/photo only in the master profile. No account data was changed.
- Global in-platform notification banner polls every 5 seconds for unread conversations, supports dismissal and reappears for subsequent incoming messages. Current conversation is excluded. Available on platform pages while signed in. This is not OS push and does not operate after closing the site.
- Search conversations, highlighted active chat, clearer chat header and composer; Enter sends on fine-pointer devices, Shift+Enter adds a line break.

Validation: TypeScript and production build passed; PostgreSQL integration suite passed including a new blank-account/professional-avatar regression; browser checks passed for notification arrival/dismiss/rearrival/navigation, displayed avatar, conversation search and 390px mobile width. Synthetic local users only.

Production: expected health version and connected database; new JS/CSS reachable over HTTPS; messenger noindex header present; anonymous conversation access returns 401. Real-user messages were not sent during validation.

Backup: `/var/backups/aurelle/20261006-messenger-ui/database.dump`.
Rollback: `bash /var/backups/aurelle/20261006-messenger-ui/rollback.sh`.
No new database migrations needed. Previous application retained, PM2 saved.
