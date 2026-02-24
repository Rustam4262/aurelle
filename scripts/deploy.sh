#!/bin/bash
# deploy.sh — Production deploy script for AURELLE
# Usage: ./scripts/deploy.sh [--skip-build] [--skip-smoke] [--branch main]
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/var/www/aurelle}"
APP_NAME="${APP_NAME:-aurelle}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-https://aurelle.uz/api/health}"
SMOKE_URL="${SMOKE_URL:-https://aurelle.uz}"
HEALTH_TIMEOUT=30
SKIP_BUILD=false
SKIP_SMOKE=false

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "${GREEN}[$(date +%H:%M:%S)] ✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠️  $*${NC}"; }
err()     { echo -e "${RED}[$(date +%H:%M:%S)] ❌ $*${NC}" >&2; }
info()    { echo -e "${CYAN}[$(date +%H:%M:%S)] ℹ  $*${NC}"; }
section() { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

# ─── Parse args ──────────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --skip-smoke) SKIP_SMOKE=true ;;
    --branch=*)   BRANCH="${arg#*=}" ;;
  esac
done

# ─── Pre-flight ──────────────────────────────────────────────────────────────
section "Pre-flight"
log "Starting deploy → branch: $BRANCH, app: $APP_NAME"

if [ ! -d "$APP_DIR" ]; then
  err "App directory not found: $APP_DIR"
  err "Set APP_DIR env variable to the correct path"
  exit 1
fi

cd "$APP_DIR"

# ─── Save rollback point ─────────────────────────────────────────────────────
PREV_COMMIT=$(git rev-parse HEAD)
PREV_SHORT=$(git rev-parse --short HEAD)
info "Current: $PREV_SHORT — $(git log -1 --format='%s')"
echo "$PREV_COMMIT" > /tmp/aurelle_prev_commit

# ─── Pull code ───────────────────────────────────────────────────────────────
section "Code"
log "Pulling $BRANCH..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

RELEASE=$(git rev-parse --short HEAD)
RELEASE_FULL=$(git rev-parse HEAD)

if [ "$PREV_COMMIT" = "$RELEASE_FULL" ]; then
  warn "No new commits. Continuing deploy anyway."
fi

info "Deploying: $RELEASE — $(git log -1 --format='%s')"
info "Author:    $(git log -1 --format='%an <%ae>')"
info "Date:      $(git log -1 --format='%ci')"

# ─── Update .env with release ─────────────────────────────────────────────────
# Sentry release tracking: передаём commit hash как release
if grep -q "VITE_SENTRY_RELEASE=" .env 2>/dev/null; then
  sed -i "s/VITE_SENTRY_RELEASE=.*/VITE_SENTRY_RELEASE=aurelle@${RELEASE}/" .env
  sed -i "s/SENTRY_RELEASE=.*/SENTRY_RELEASE=aurelle@${RELEASE}/" .env
else
  echo "VITE_SENTRY_RELEASE=aurelle@${RELEASE}" >> .env
  echo "SENTRY_RELEASE=aurelle@${RELEASE}" >> .env
fi
info "Release set: aurelle@${RELEASE}"

# ─── Install dependencies ─────────────────────────────────────────────────────
section "Install"
log "Installing dependencies..."
npm ci

# ─── Build ───────────────────────────────────────────────────────────────────
section "Build"
if [ "$SKIP_BUILD" = false ]; then
  log "Building (release: $RELEASE)..."

  # Передаём release в Vite build
  export VITE_APP_VERSION="$RELEASE"
  export VITE_SENTRY_RELEASE="aurelle@${RELEASE}"
  export SENTRY_RELEASE="aurelle@${RELEASE}"

  npm run build
  BUILD_SIZE=$(du -sh dist/public 2>/dev/null | cut -f1 || echo "?")
  log "Build complete — $BUILD_SIZE total"
else
  warn "Skipping build (--skip-smoke)"
fi

# ─── Nginx: проверить и перезагрузить конфиг ────────────────────────────────
section "Nginx"
if command -v nginx &>/dev/null; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null && log "nginx reloaded" || warn "nginx reload failed (not systemd?)"
  else
    err "nginx -t failed! NOT reloading nginx."
    err "Check: /etc/nginx/sites-enabled/aurelle"
  fi
else
  warn "nginx not found — skipping"
fi

# ─── Restart app ─────────────────────────────────────────────────────────────
section "Restart"
log "Restarting app..."

if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q "$APP_NAME"; then
  pm2 reload "$APP_NAME"
  log "Restarted via PM2"
elif systemctl is-active --quiet "$APP_NAME" 2>/dev/null; then
  systemctl restart "$APP_NAME"
  log "Restarted via systemd"
elif docker ps --filter "name=$APP_NAME" --format "{{.Names}}" 2>/dev/null | grep -q "$APP_NAME"; then
  docker restart "$APP_NAME"
  log "Restarted via Docker"
else
  err "Cannot determine process manager. Restart manually:"
  err "  PM2:     pm2 restart $APP_NAME"
  err "  systemd: systemctl restart $APP_NAME"
  err "  Docker:  docker restart $APP_NAME"
  exit 1
fi

# ─── Health check ─────────────────────────────────────────────────────────────
section "Health check"
log "Waiting for app to be ready... ($HEALTH_URL)"
sleep 3

for i in $(seq 1 $HEALTH_TIMEOUT); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    log "Health check passed (HTTP $HTTP_CODE) in ${i}s"
    break
  fi
  if [ "$i" = "$HEALTH_TIMEOUT" ]; then
    err "Health check FAILED after ${HEALTH_TIMEOUT}s (last HTTP: $HTTP_CODE)"
    err "Auto-rollback to $PREV_SHORT..."
    bash "$(dirname "$0")/rollback.sh" "$PREV_COMMIT"
    exit 1
  fi
  printf "."
  sleep 1
done

# ─── Smoke tests (если Playwright установлен) ────────────────────────────────
section "Smoke tests"
if [ "$SKIP_SMOKE" = true ]; then
  warn "Smoke tests skipped (--skip-smoke)"
elif ! command -v npx &>/dev/null; then
  warn "npx not found — skipping smoke tests"
elif ! ls node_modules/@playwright/test &>/dev/null 2>&1; then
  warn "Playwright not installed — skipping smoke tests"
  warn "To enable: npm install -D @playwright/test && npx playwright install chromium"
else
  log "Running smoke tests against $SMOKE_URL..."
  if BASE_URL="$SMOKE_URL" npx playwright test tests/e2e/smoke.spec.ts --reporter=list 2>&1; then
    log "Smoke tests passed"
  else
    err "Smoke tests FAILED!"
    err "Auto-rollback to $PREV_SHORT..."
    bash "$(dirname "$0")/rollback.sh" "$PREV_COMMIT"
    exit 1
  fi
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
section "Done"
log "Deploy complete!"
info "Release:  aurelle@${RELEASE}"
info "Commit:   $(git log -1 --oneline)"
info "URL:      $SMOKE_URL"
info "Rollback: ./scripts/rollback.sh $PREV_SHORT"
