# Blue/Green Deployment — AURELLE

Zero-downtime deploys without Docker. Two identical git clones on the same
server; a symlink switches between them atomically.

---

## Directory Layout

```
/var/www/
├── aurelle-blue/       ← slot A (full git clone + node_modules + dist/)
├── aurelle-green/      ← slot B (full git clone + node_modules + dist/)
├── aurelle             ← symlink → active slot (nginx root & PM2 cwd)
└── aurelle-shared/
    ├── .env            ← secrets — single source of truth
    └── uploads/        ← user-uploaded files (symlinked from each slot)
```

`/var/www/aurelle` is the only path nginx and PM2 ever reference.
After a deploy it points to the new slot; after a rollback it points back.

---

## One-time Setup (run once on the server)

Migrates from the current single-directory setup to the slot layout:

```bash
sudo bash scripts/setup-blue-green.sh
```

What it does:
1. Copies current `/var/www/aurelle/` → `/var/www/aurelle-blue/`
2. Moves `.env` → `/var/www/aurelle-shared/.env`
3. Clones repo into `/var/www/aurelle-green/` (for next deploy)
4. Renames the original directory to `aurelle-original-backup`
5. Creates symlink `/var/www/aurelle → aurelle-blue`
6. Builds blue slot, reloads PM2

After verifying the app works:
```bash
rm -rf /var/www/aurelle-original-backup
```

---

## Deploy

```bash
bash scripts/deploy.sh
```

### Flow

```
[inactive slot]                   [active slot]
git pull / clone
npm ci --prefer-offline
npm run build                     ← old dist/ still serving traffic
                    ln -sfn       ← atomic symlink switch (< 1ms)
pm2 startOrReload ────────────── new workers start from new dist/
                                  old workers drain in-flight requests
health check × 12                 ← retry 12 × 5s = up to 60s window
  200 OK ──── done
  timeout ─── auto-rollback → switch symlink back, pm2 reload, fail
nginx -s reload ─────────────── serve new static dist/
```

Key properties:
- **Zero downtime**: PM2 cluster mode keeps old workers alive until new ones are healthy
- **Fast rollback**: previous slot's `dist/` is already built — no rebuild needed
- **Atomic switch**: `ln -sfn` uses `rename(2)` — instantaneous with no partial state

### Options

```bash
BRANCH=develop bash scripts/deploy.sh        # deploy a different branch
DEPLOY_ENV=staging bash scripts/deploy.sh    # use staging env in PM2
bash scripts/deploy.sh --skip-smoke          # skip Playwright smoke tests
HEALTH_RETRIES=20 HEALTH_DELAY_S=3 \
  bash scripts/deploy.sh                     # custom health check timing
```

---

## Rollback

```bash
bash scripts/rollback.sh           # interactive confirm
bash scripts/rollback.sh --yes     # non-interactive (CI/CD, alerts)
```

What it does:
1. Reads the current active slot from the symlink
2. Switches symlink to the other slot (`ln -sfn`)
3. `pm2 startOrReload` from the previous slot's ecosystem file
4. `nginx -s reload`
5. Quick health check

No rebuild. Rollback completes in ~5 seconds.

---

## How PM2 Knows Which Slot to Use

`ecosystem.config.cjs` does **not** hardcode a `cwd`. When PM2 loads it via:

```bash
pm2 startOrReload /var/www/aurelle/ecosystem.config.cjs
```

PM2 derives `cwd` from the directory of the config file = `/var/www/aurelle`
(the symlink). After `ln -sfn aurelle-green aurelle`, the same path now
resolves to the green slot. New PM2 workers start from `green/dist/index.cjs`.

---

## nginx Configuration

nginx should reference the symlink path (no changes needed from current config):

```nginx
root /var/www/aurelle/dist/public;

location /api {
    proxy_pass http://127.0.0.1:5000;
}
```

`nginx -s reload` after a deploy picks up the new `dist/public/` from the new
slot without a connection drop (graceful worker restart).

---

## Shared .env

Both slots share one `.env` file at `/var/www/aurelle-shared/.env`.
`deploy.sh` symlinks it into the inactive slot before building:

```
/var/www/aurelle-blue/.env  → /var/www/aurelle-shared/.env
/var/www/aurelle-green/.env → /var/www/aurelle-shared/.env
```

To update a secret:
```bash
nano /var/www/aurelle-shared/.env
# Then redeploy for the new values to take effect in the running process:
pm2 reload aurelle-production --update-env
```

---

## Shared Uploads

User-uploaded files live outside the slots so they survive slot switches:

```
/var/www/aurelle-shared/uploads/
/var/www/aurelle-blue/uploads   → symlink → ../aurelle-shared/uploads
/var/www/aurelle-green/uploads  → symlink → ../aurelle-shared/uploads
```

---

## Logs

Logs are per-slot (relative paths in `ecosystem.config.cjs`):

```
/var/www/aurelle-blue/logs/pm2-error.log
/var/www/aurelle-green/logs/pm2-out.log
```

To view current slot's logs:
```bash
pm2 logs aurelle-production
```

To view previous slot's logs after rollback:
```bash
tail -f /var/www/aurelle-blue/logs/pm2-error.log
```

---

## Troubleshooting

### Health check fails after deploy

```bash
# Check new slot's PM2 output
pm2 logs aurelle-production --lines 50

# Hit health endpoint directly
curl -v http://127.0.0.1:5000/api/health

# Verify symlink
readlink /var/www/aurelle
```

### deploy.sh says "must be a symlink"

Initial migration not done. Run:
```bash
sudo bash scripts/setup-blue-green.sh
```

### Rollback: "Previous slot not found"

Green slot was never built. Run a deploy first (it auto-clones green if missing):
```bash
bash scripts/deploy.sh
```

### PM2 starts workers from wrong slot

Check what the symlink points to and force-reload:
```bash
readlink /var/www/aurelle
pm2 startOrReload /var/www/aurelle/ecosystem.config.cjs --env production --update-env
```

---

## Build Versioning (`__APP_VERSION__` / `GIT_COMMIT_SHA`)

Every deploy stamps the git short SHA in four places so the frontend build and
backend runtime always report the same commit.

### Where the SHA comes from

| Location | How it's set | Used by |
|----------|-------------|---------|
| `__APP_VERSION__` (frontend bundle) | `vite.config.ts` → `execSync("git rev-parse --short HEAD")` at build time | `window.__APP_VERSION__`, Sentry `app.version`, error boundary fallback UI |
| `GIT_COMMIT_SHA` (server env) | `deploy.sh` → `stamp_env GIT_COMMIT_SHA` into `.env` before build | `GET /api/health` response `.commit` field |
| `APP_VERSION` (server env) | same `stamp_env` call | `GET /api/health` response `.version` field |
| `VITE_SENTRY_RELEASE` | same `stamp_env` call; also passed to `npm run build` | Sentry release tracking (links source maps to events) |

### Verifying SHA alignment after a deploy

```bash
# 1. Frontend SHA (DevTools console — any page)
window.__APP_VERSION__
# → e.g. "a1b2c3d"

# 2. Backend SHA (from any terminal or browser)
curl -s https://aurelle.uz/api/health | python3 -m json.tool | grep commit
# → "commit": "a1b2c3d"

# Both should match the deployed commit:
git rev-parse --short HEAD
```

### Error boundary chunk-load behaviour

After a deploy, clients with cached `index.html` may request chunk URLs that no
longer exist (404). The error boundary handles this without a white screen:

| Occurrence | Behaviour |
|-----------|-----------|
| 1st chunk error | Spinner shown; auto-reload fires once (`sessionStorage` guard prevents loop) |
| 2nd chunk error (reload didn't help) | User-visible card: "App updated — reload page" with a manual Reload button. No further auto-reload. |
| Runtime error (non-chunk) | Standard error card with Try Again / Go Home buttons |

---

## DoD Verification (P3.4)

- [x] `scripts/deploy.sh` — build in inactive slot → atomic symlink switch → PM2 reload → health check → auto-rollback on failure
- [x] `scripts/rollback.sh` — `ln -sfn` + `pm2 startOrReload` + `nginx -s reload` in ~5s
- [x] `scripts/setup-blue-green.sh` — one-time migration from single-dir to slot layout
- [x] Rollback requires no rebuild (previous slot's `dist/` preserved)
- [x] Shared `.env` and `uploads/` survive slot switches
- [x] PM2 cwd derived from ecosystem file location — no hardcoded paths
- [x] Health check with 12×5s retries + auto-rollback on timeout
- [x] `docs/DEPLOY_BLUE_GREEN.md` this file

### Manual verification

```bash
# 1. Initial setup (once)
sudo bash scripts/setup-blue-green.sh
readlink /var/www/aurelle   # should print /var/www/aurelle-blue

# 2. First deploy to green
bash scripts/deploy.sh
readlink /var/www/aurelle   # should print /var/www/aurelle-green
curl http://127.0.0.1:5000/api/health  # should return 200

# 3. Rollback
bash scripts/rollback.sh --yes
readlink /var/www/aurelle   # should print /var/www/aurelle-blue

# 4. Re-deploy (deploys to green again)
bash scripts/deploy.sh
```
