# Release Checklist — AURELLE

Use this checklist for every production release. Complete all sections before
marking the release as "done".

---

## Pre-Release (on the dev machine)

### Code Quality
- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npm run lint` — no ESLint errors (warnings OK)
- [ ] All new routes have error handling (`try/catch` → 500)
- [ ] No secrets, tokens, or passwords committed (`git diff origin/main`)
- [ ] Logger calls use `{ source, meta }` pattern (no bare extra keys)

### Migrations
- [ ] All new tables/columns have a `.sql` file in `migrations/`
- [ ] Migrations use `IF NOT EXISTS` guards (idempotent)
- [ ] Migration reviewed by at least one other dev (for schema changes)
- [ ] `migrations/db-verify.ts` `REQUIRED_TABLES` updated if new tables added

### Tests
- [ ] `npm run test:fsm` — payment FSM tests pass
- [ ] `npm run test:smoke` (Playwright) — passes locally against dev server
- [ ] Key flows manually verified: booking flow, login, admin panel

---

## Staging Deploy

```bash
# Build
npm run build

# Apply migrations (if any)
psql $STAGING_DATABASE_URL -f migrations/NNNN_<new>.sql

# Smoke test staging
bash scripts/smoke.sh https://staging.aurelle.uz
npm run db:verify    # uses STAGING DATABASE_URL
```

- [ ] Staging smoke test passes (all green)
- [ ] Check Sentry staging project for new errors after deploy
- [ ] Test any changed user-facing flows on staging

---

## Production Deploy

### 1. Pre-deploy checks
- [ ] Confirm staging smoke passed in the last 30 minutes
- [ ] Check current production error rate in Sentry (baseline)
- [ ] Notify team: "Deploying vX.Y to production at HH:MM"

### 2. Apply DB migrations (BEFORE code deploy)

> Drizzle `db:push` is **blocked in production** — use manual SQL only.

```bash
# SSH to production server
ssh deploy@aurelle.uz

cd /var/www/aurelle

# Apply migrations (one at a time if multiple)
psql $DATABASE_URL -f migrations/NNNN_<change>.sql

# Verify schema
npm run db:verify
```

- [ ] All new migrations applied
- [ ] `npm run db:verify` exits 0

### 3. Deploy code

```bash
# On the production server:
bash scripts/deploy.sh main
```

The deploy script will:
- Build in the inactive blue/green slot
- Health-check the new build
- Atomically switch the symlink
- Auto-rollback on failure

- [ ] Deploy script exits 0 ("Deploy complete")
- [ ] No PM2 cluster restarts in `pm2 logs` immediately after

### 4. Post-deploy smoke test

```bash
bash scripts/smoke.sh https://aurelle.uz
```

- [ ] All smoke checks green

### 4a. Verify build SHA alignment

```bash
# Frontend SHA (DevTools console on any page):
#   window.__APP_VERSION__   → e.g. "a1b2c3d"

# Backend SHA:
curl -s https://aurelle.uz/api/health | grep -E '"commit"|"version"'
#   "version": "a1b2c3d",
#   "commit": "a1b2c3d"

# Both must match:
git rev-parse --short HEAD
```

- [ ] `window.__APP_VERSION__` matches `git rev-parse --short HEAD`
- [ ] `/api/health` `.commit` matches the same SHA

### 5. Post-deploy monitoring (first 15 minutes)

- [ ] Check Sentry for new error spikes
- [ ] Check PM2 memory: `pm2 monit`
- [ ] Check Neon DB query time in Neon console
- [ ] Test the specific feature changed: book an appointment, etc.

---

## Rollback

If any post-deploy check fails:

```bash
bash scripts/rollback.sh --yes
```

Then:
- [ ] Notify team: "Rolled back vX.Y — investigating"
- [ ] File an incident in Sentry or Slack
- [ ] Root-cause before re-deploying

---

## Feature Flag Releases

For features behind `FEAT_*` flags:

```bash
# Enable flag on production (without code deploy)
# Edit /var/www/aurelle-shared/.env
FEAT_MY_FEATURE=true
pm2 reload aurelle-production
```

- [ ] Feature tested with flag OFF (must not crash)
- [ ] Feature tested with flag ON
- [ ] Gradual rollout: enable for 10% users via flag if supported

---

## Communication

- [ ] Update `CHANGELOG.md` (or GitHub Releases) with:
  - New features / fixes summary
  - Any migration steps users/ops must take
- [ ] If breaking change: announce in Slack #ops channel
- [ ] Close related GitHub issues / PRs

---

## Post-Release (24 hours later)

- [ ] No elevated error rate in Sentry
- [ ] No complaints from users/clients
- [ ] Archive this checklist in the PR description or release notes
