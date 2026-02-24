#!/bin/bash
# rollback.sh — Rollback to previous commit for AURELLE
# Usage: ./scripts/rollback.sh [COMMIT_HASH]
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/var/www/aurelle}"
APP_NAME="${APP_NAME:-aurelle}"
HEALTH_URL="${HEALTH_URL:-https://aurelle.uz/api/health}"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)] ✅ $*${NC}"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠️  $*${NC}"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ❌ $*${NC}" >&2; }

cd "$APP_DIR"

# ─── Determine target commit ──────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  TARGET_COMMIT="$1"
  log "Rollback target (explicit): $TARGET_COMMIT"
elif [ -f /tmp/aurelle_prev_commit ]; then
  TARGET_COMMIT=$(cat /tmp/aurelle_prev_commit)
  log "Rollback target (from deploy): $TARGET_COMMIT"
else
  # Fallback: previous commit in git
  TARGET_COMMIT=$(git rev-parse HEAD~1)
  warn "No saved rollback point. Using HEAD~1: $TARGET_COMMIT"
fi

CURRENT_COMMIT=$(git rev-parse HEAD)
warn "Rolling back: $CURRENT_COMMIT → $TARGET_COMMIT"
warn "Press Ctrl+C in 5 seconds to cancel..."
sleep 5

# ─── Checkout previous commit ─────────────────────────────────────────────────
log "Checking out $TARGET_COMMIT..."
git checkout "$TARGET_COMMIT"

# ─── Install & build ─────────────────────────────────────────────────────────
log "Installing dependencies..."
npm ci

log "Building..."
npm run build

# ─── Restart ─────────────────────────────────────────────────────────────────
log "Restarting..."

if command -v pm2 &>/dev/null && pm2 list | grep -q "$APP_NAME"; then
  pm2 reload "$APP_NAME"
elif systemctl is-active --quiet "$APP_NAME" 2>/dev/null; then
  systemctl restart "$APP_NAME"
elif docker ps --filter "name=$APP_NAME" --format "{{.Names}}" | grep -q "$APP_NAME" 2>/dev/null; then
  docker restart "$APP_NAME"
else
  err "Cannot restart — do it manually!"
  exit 1
fi

# ─── Health check ─────────────────────────────────────────────────────────────
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  log "Rollback successful! Running on: $(git log -1 --oneline)"
  rm -f /tmp/aurelle_prev_commit
else
  err "Rollback health check failed (HTTP $HTTP_CODE)"
  err "The app may be broken on the rollback commit too."
  err "Check logs: pm2 logs $APP_NAME / journalctl -u $APP_NAME -f"
  exit 1
fi
