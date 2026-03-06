# CI / CD — GitHub Actions

## Overview

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push to non-main branches + PRs to main | Type-check, security audit, lint |
| `deploy-production.yml` | Push to main + manual dispatch | Checks → build → deploy → health check |
| `rollback.yml` | Manual dispatch only | Restore a previous backup |

---

## ci.yml — PR Gate

Runs on every PR targeting `main` or `develop` and on every push to non-main branches.

### Jobs

| Job | Blocking | Description |
|---|---|---|
| `typecheck` | **Yes** | `npm run check` (tsc --noEmit). PR cannot merge if this fails. |
| `security` | **Yes** | `npm audit --audit-level=high`. Blocks on HIGH/CRITICAL CVEs only. |
| `lint` | No | `npm run lint`. Advisory — reported but does not block merge. |

**Why `--audit-level=high`?** Moderate-severity CVEs in dev deps are common noise (e.g. in Vite, esbuild). High/Critical vulnerabilities in runtime dependencies are the actual risk.

### Setting up branch protection (required for DoD)

In GitHub → Repository → Settings → Branches → Add rule for `main`:
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date
- Required checks: `TypeScript`, `Security audit`
- ✅ Require pull request reviews before merging (recommended: 1)
- ✅ Do not allow bypassing the above settings

---

## deploy-production.yml — Production Deploy

### Flow

```
push to main
    │
    ▼
checks job (parallel)
├── tsc --noEmit          ← BLOCKS DEPLOY if fails
└── npm audit --level=high ← BLOCKS DEPLOY if fails
    │
    ▼ (only if checks pass)
deploy job
├── SSH: git pull origin main
├── SSH: npm ci
├── SSH: NODE_ENV=production npm run build
├── SSH: pm2 reload aurelle-production --update-env
├── sleep 12s
├── SSH: health check with 6 retries × 5s
│       GET http://localhost:5000/api/health/ping → must be HTTP 200
│       if fail → auto-rollback to previous commit → Telegram alert
│
└── Telegram notification (success or failure)
    │
    ▼ (only if deploy succeeds)
smoke job (from GitHub runner, external)
├── GET https://aurelle.uz/               → must be HTTP 200
├── GET https://aurelle.uz/api/health/ping → must be HTTP 200
└── GET https://aurelle.uz/api/health      → status must be "healthy"
```

### Health check details

The health check calls `GET http://localhost:5000/api/health/ping` with:
- 6 retries × 5 seconds = up to 30 seconds wait
- Returns HTTP 200 `{"status":"ok"}` when the process is alive
- If all retries fail → workflow exits 1 → auto-rollback triggers

The full `GET /api/health` (with DB check) is used in the external smoke test step.

### Auto-rollback

If the health check fails after deploy, `git checkout <prev-commit>` restores the working version, rebuilds, and reloads PM2. You will receive a Telegram alert either way.

---

## Required GitHub Secrets

Add these in: Repository → Settings → Secrets and variables → Actions → New repository secret

### SSH access
| Secret | Value |
|---|---|
| `PRODUCTION_HOST` | Server IP or hostname (e.g. `95.x.x.x`) |
| `PRODUCTION_USER` | SSH user (e.g. `ubuntu` or `root`) |
| `PRODUCTION_SSH_KEY` | Private SSH key (RSA or Ed25519, full key including header) |
| `PRODUCTION_PORT` | SSH port (optional, defaults to 22) |

**Generate a dedicated deploy key:**
```bash
# On your local machine:
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/aurelle_deploy
# Copy public key to server:
ssh-copy-id -i ~/.ssh/aurelle_deploy.pub user@server
# Copy private key to GitHub Secret PRODUCTION_SSH_KEY:
cat ~/.ssh/aurelle_deploy
```

### Notifications
| Secret | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_CHAT_ID` | Your chat ID (get from @userinfobot) |

### Sentry (optional, for release markers)
| Secret | Value |
|---|---|
| `SENTRY_AUTH_TOKEN` | Auth token with `project:releases` + `org:read` scopes |
| `SENTRY_ORG` | Organization slug |
| `SENTRY_PROJECT` | Project slug |
| `VITE_SENTRY_DSN` | Frontend DSN (used in build step) |

---

## Manual deploy (without GitHub Actions)

```bash
# On the production server:
cd /var/www/aurelle
git pull origin main
npm ci
NODE_ENV=production npm run build
pm2 reload aurelle-production --update-env
pm2 save

# Verify:
curl http://localhost:5000/api/health/ping
curl http://localhost:5000/api/health | jq .status
```

---

## Manual rollback via workflow

1. Go to: Repository → Actions → `Rollback Deployment` → Run workflow
2. Select environment: `production`
3. Enter backup timestamp (or leave `latest`)
4. Enter rollback reason

Or directly on the server:
```bash
cd /var/www/aurelle
git log --oneline -5          # find the commit to go back to
git checkout <commit-sha>
NODE_ENV=production npm run build
pm2 reload aurelle-production --update-env
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| tsc check fails in CI | TypeScript errors in code | Fix errors locally: `npm run check` |
| security audit fails | New HIGH CVE in dependency | `npm audit fix` or update dep |
| Deploy fails at `git pull` | Merge conflict or untracked files on server | SSH in and resolve manually |
| Health check times out | PM2 crashed on startup, bad env var | `pm2 logs aurelle-production --err` |
| Auto-rollback fails | `/tmp/aurelle_prev_commit` not present | SSH in and `git checkout HEAD~1` manually |
| Smoke test fails | Nginx not serving, TLS issue | Check `nginx -t` and `pm2 status` |
