#!/usr/bin/env bash
# =============================================================================
# scripts/deploy.sh — Blue/Green deployment for AURELLE (no Docker)
#
# Expected layout on server after setup-blue-green.sh:
#   /var/www/
#   ├── aurelle-blue/       # slot A — full git clone
#   ├── aurelle-green/      # slot B — full git clone
#   ├── aurelle -> ./aurelle-blue   # symlink; nginx root & PM2 cwd always here
#   └── aurelle-shared/
#       ├── .env            # single source of truth for secrets
#       └── uploads/        # user-uploaded files (shared across slots)
#
# Usage:
#   bash scripts/deploy.sh
#   BRANCH=develop bash scripts/deploy.sh
#   DEPLOY_ENV=staging bash scripts/deploy.sh
#   bash scripts/deploy.sh --skip-smoke
# =============================================================================

set -euo pipefail

# ── Configurable ──────────────────────────────────────────────────────────────
SLOTS_DIR="${SLOTS_DIR:-/var/www}"
SLOT_BLUE="${SLOTS_DIR}/aurelle-blue"
SLOT_GREEN="${SLOTS_DIR}/aurelle-green"
CURRENT="${SLOTS_DIR}/aurelle"           # symlink — nginx & PM2 always use this
SHARED_DIR="${SLOTS_DIR}/aurelle-shared"
ECOSYSTEM="ecosystem.config.cjs"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BRANCH="${BRANCH:-main}"
APP_PORT="${APP_PORT:-5000}"
APP_URL="${APP_URL:-http://127.0.0.1:${APP_PORT}}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"
HEALTH_DELAY_S="${HEALTH_DELAY_S:-5}"
SKIP_SMOKE="${SKIP_SMOKE:-false}"
for arg in "$@"; do [[ "$arg" == "--skip-smoke" ]] && SKIP_SMOKE=true; done
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn()    { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠  $*${NC}"; }
section() { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }
fail()    { echo -e "${RED}[$(date +%H:%M:%S)] ✗ FAIL: $*${NC}" >&2; exit 1; }

# ── 0. Pre-flight ─────────────────────────────────────────────────────────────
section "Pre-flight"
[[ -L "$CURRENT" ]] || fail \
  "$CURRENT must be a symlink. Run 'bash scripts/setup-blue-green.sh' first."
command -v pm2  >/dev/null 2>&1 || fail "pm2 not in PATH"
command -v curl >/dev/null 2>&1 || fail "curl not in PATH"
command -v npm  >/dev/null 2>&1 || fail "npm not in PATH"

# ── 1. Resolve active / inactive slots ────────────────────────────────────────
ACTIVE_REAL=$(readlink -f "$CURRENT")
if   [[ "$ACTIVE_REAL" == "$SLOT_BLUE" ]];  then
  ACTIVE="$SLOT_BLUE";  ACTIVE_NAME="blue"
  INACTIVE="$SLOT_GREEN"; INACTIVE_NAME="green"
elif [[ "$ACTIVE_REAL" == "$SLOT_GREEN" ]]; then
  ACTIVE="$SLOT_GREEN"; ACTIVE_NAME="green"
  INACTIVE="$SLOT_BLUE";  INACTIVE_NAME="blue"
else
  fail "Active slot path '$ACTIVE_REAL' is neither blue nor green"
fi
log "Active=$ACTIVE_NAME  →  target=$INACTIVE_NAME"

# ── 2. Clone inactive slot if missing (first deploy to this slot) ─────────────
if [[ ! -d "$INACTIVE" ]]; then
  section "Clone"
  REPO=$(git -C "$ACTIVE" remote get-url origin 2>/dev/null) \
    || fail "Cannot determine repo URL from active slot"
  log "Cloning into $INACTIVE_NAME ($REPO)"
  git clone --branch "$BRANCH" "$REPO" "$INACTIVE"
fi

# ── 3. Update code in inactive slot ───────────────────────────────────────────
section "Code"
cd "$INACTIVE"
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=format:"%s")
log "Commit: $COMMIT  $COMMIT_MSG"

# ── 4. Link shared .env (secrets live outside git, shared between slots) ──────
section ".env"
if [[ -f "${SHARED_DIR}/.env" ]]; then
  ln -sf "${SHARED_DIR}/.env" "$INACTIVE/.env"
  log "Linked .env from $SHARED_DIR"
elif [[ -f "${ACTIVE}/.env" ]]; then
  cp "${ACTIVE}/.env" "$INACTIVE/.env"
  warn "Copied .env from active slot — consider moving it to $SHARED_DIR"
else
  warn "No .env found — deployment may fail if env vars are missing"
fi

# Stamp release for Sentry tracking
if [[ -f "$INACTIVE/.env" ]]; then
  sed -i "s/^VITE_SENTRY_RELEASE=.*/VITE_SENTRY_RELEASE=aurelle@${COMMIT}/" "$INACTIVE/.env" \
    || echo "VITE_SENTRY_RELEASE=aurelle@${COMMIT}" >> "$INACTIVE/.env"
  sed -i "s/^SENTRY_RELEASE=.*/SENTRY_RELEASE=aurelle@${COMMIT}/" "$INACTIVE/.env" \
    || echo "SENTRY_RELEASE=aurelle@${COMMIT}" >> "$INACTIVE/.env"
fi

# ── 5. Install deps & build ───────────────────────────────────────────────────
section "Install & Build"
npm ci --prefer-offline
VITE_APP_VERSION="$COMMIT" VITE_SENTRY_RELEASE="aurelle@${COMMIT}" npm run build
BUILD_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "?")
log "Build OK — dist/ $BUILD_SIZE"

# ── 6. Atomic symlink switch ──────────────────────────────────────────────────
section "Switch"
# ln -sfn is atomic on Linux (uses rename(2) internally via util-linux).
# nginx keeps serving the old slot until its worker processes are recycled.
ln -sfn "$INACTIVE" "$CURRENT"
log "Symlink: $CURRENT → $INACTIVE_NAME"

# ── 7. Zero-downtime PM2 reload ───────────────────────────────────────────────
# startOrReload reads the ecosystem file from $CURRENT (new slot).
# PM2 derives cwd from the directory of the config file = /var/www/aurelle.
# New workers start from the new slot's dist/; old workers drain gracefully.
section "PM2 reload"
pm2 startOrReload "$CURRENT/$ECOSYSTEM" --env "$DEPLOY_ENV" --update-env
pm2 save
log "PM2 reloaded"

# ── 8. nginx reload for new static dist/ ──────────────────────────────────────
if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>/dev/null; then
    nginx -s reload && log "nginx reloaded"
  else
    warn "nginx -t failed — skipping nginx reload (app still served via Node)"
  fi
fi

# ── 9. Health check with auto-rollback ────────────────────────────────────────
section "Health check"
log "Checking ${APP_URL}/api/health  (up to ${HEALTH_RETRIES}×${HEALTH_DELAY_S}s)"
HEALTHY=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
  HTTP=$(curl -so /dev/null -w "%{http_code}" "${APP_URL}/api/health" 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    log "Health check passed (attempt $i, HTTP $HTTP)"
    HEALTHY=true
    break
  fi
  log "Attempt $i/$HEALTH_RETRIES — HTTP $HTTP — retry in ${HEALTH_DELAY_S}s…"
  sleep "$HEALTH_DELAY_S"
done

if [[ "$HEALTHY" != "true" ]]; then
  warn "Health check failed — auto-rollback to $ACTIVE_NAME"
  ln -sfn "$ACTIVE" "$CURRENT"
  pm2 startOrReload "$CURRENT/$ECOSYSTEM" --env "$DEPLOY_ENV" --update-env
  pm2 save
  nginx -s reload 2>/dev/null || true
  fail "Deployment failed; site restored to $ACTIVE_NAME"
fi

# ── 10. Smoke test (optional) ─────────────────────────────────────────────────
if [[ "$SKIP_SMOKE" != "true" ]] && [[ -d "$INACTIVE/node_modules/@playwright" ]]; then
  section "Smoke tests"
  if BASE_URL="${APP_URL}" npx playwright test tests/e2e/smoke.spec.ts --reporter=list 2>&1; then
    log "Smoke tests passed"
  else
    warn "Smoke tests FAILED — auto-rollback to $ACTIVE_NAME"
    ln -sfn "$ACTIVE" "$CURRENT"
    pm2 startOrReload "$CURRENT/$ECOSYSTEM" --env "$DEPLOY_ENV" --update-env
    pm2 save
    fail "Smoke tests failed; site restored to $ACTIVE_NAME"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment complete${NC}"
echo -e "${GREEN}  Slot   : $INACTIVE_NAME  (prev: $ACTIVE_NAME)${NC}"
echo -e "${GREEN}  Commit : $COMMIT  $COMMIT_MSG${NC}"
echo -e "${GREEN}  Rollback: bash scripts/rollback.sh${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
