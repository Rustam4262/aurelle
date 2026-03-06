# DB Migrations — AURELLE

## Overview

This project uses **Drizzle ORM** with a hybrid migration strategy:

| Environment | Method |
|-------------|--------|
| Development / Staging | `npm run db:push` (Drizzle schema push, non-interactive) |
| **Production** | **Manual SQL migrations** — `db:push` is blocked |

`db:push` is convenient for development but **must never run against production**
because it can silently drop columns or indexes. All production changes go through
numbered SQL files reviewed before execution.

---

## Migration Files

```
migrations/
  NNNN_<description>.sql   # numbered migrations (apply in order)
  HOTFIX_<name>.sql        # emergency patches
  meta/                    # drizzle-kit internal snapshots (do not edit)
```

Numbering convention: **4-digit prefix** (`0025_`, `0026_`, …). Legacy files exist with
3-digit or no prefix — these were applied in earlier sprints and must not be re-run.

---

## Adding a New Migration

```bash
# 1. Write the SQL
cat > migrations/0026_my_change.sql << 'EOF'
ALTER TABLE salons ADD COLUMN IF NOT EXISTS feature_x boolean NOT NULL DEFAULT false;
EOF

# 2. (optional) Test on staging
psql $STAGING_DATABASE_URL -f migrations/0026_my_change.sql

# 3. Apply to production
psql $DATABASE_URL -f migrations/0026_my_change.sql

# 4. Verify
npm run db:verify
```

> **Tip**: Always use `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` /
> `CREATE INDEX IF NOT EXISTS` to make migrations idempotent.

---

## db:push (dev only)

```bash
# Safe — blocked in production automatically
npm run db:push
```

The wrapper (`scripts/db-push-safe.ts`) will exit 1 with a clear error if
`NODE_ENV=production`.

If Drizzle asks an interactive question (e.g., about dropping a column), the
`--force` flag auto-accepts. Review the diff carefully in staging first.

---

## db:verify

Checks that all required tables defined in `scripts/db-verify.ts` exist in the DB:

```bash
npm run db:verify        # exits 0 = OK, exits 1 = missing tables
```

Run this:
- After every production migration
- As part of the release smoke test (`scripts/smoke.sh`)
- In CI before deploying to staging

---

## Current Schema Tables (as of 2026-03)

| Table | Migration |
|-------|-----------|
| `users`, `user_profiles`, `sessions` | 0000 |
| `salons`, `masters`, `services`, `service_categories` | 0000 |
| `bookings` | 0000 |
| `push_subscriptions` | 0002 |
| `waitlist` | 0003 |
| `portfolio_items` | 0004 |
| `admin_users`, `admin_roles`, `admin_role_permissions`, `admin_user_roles` | 001 / 0012 |
| `sanctions` | 0013 |
| `complaints` | 0014 |
| `audit_logs` | 0015 |
| `chat_messages` | 0016 |
| `user_activity` | 0017 |
| `scheduled_notifications` | 0018 |
| `email_verification_tokens`, `password_reset_tokens` | 0020 |
| `product_events` | 0021 |
| `platform_fee_config` | 0022 |
| `gmv_daily` (mat view) | 0023 |
| `webhook_events.external_event_id` (column) | 0024 |
| `booking_drafts` | 0025 |

---

## Emergency Hotfix Procedure

1. Write `migrations/HOTFIX_<name>.sql` with `IF NOT EXISTS` guards
2. Apply directly: `psql $DATABASE_URL -f migrations/HOTFIX_<name>.sql`
3. Run `npm run db:verify` to confirm
4. Commit the migration file (so other environments can replay it)
5. Log the change in `docs/RCA_<date>.md` if it was incident-related

---

## Known Issues

- `drizzle-kit push:pg` (old command) hangs interactively. Always use `npm run db:push`
  which runs with `--force --config=<absolute-path>`.
- The drizzle `_journal.json` only tracks the first 3 auto-generated snapshots.
  All subsequent migrations were applied manually — `db:verify` fills this gap.
