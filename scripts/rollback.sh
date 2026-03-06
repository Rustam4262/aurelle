#!/usr/bin/env bash
# =============================================================================
# scripts/rollback.sh — Instant rollback for AURELLE Blue/Green deployment
#
# Switches the active slot symlink back to the previous slot and reloads
# PM2 + nginx. No rebuild needed — the previous slot's dist/ is already there.
#
# Usage:
#   bash scripts/rollback.sh           # interactive confirm
#   bash scripts/rollback.sh --yes     # non-interactive (CI/CD)
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SLOTS_DIR="${SLOTS_DIR:-/var/www}"
SLOT_BLUE="${SLOTS_DIR}/aurelle-blue"
SLOT_GREEN="${SLOTS_DIR}/aurelle-green"
CURRENT="${SLOTS_DIR}/aurelle"
ECOSYSTEM="ecosystem.config.cjs"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
YES=false
for arg in "$@"; do [[ "$arg" == "--yes" ]] && YES=true; done
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠  $*${NC}"; }
fail() { echo -e "${RED}[$(date +%H:%M:%S)] ✗ $*${NC}" >&2; exit 1; }

# ── Resolve active / previous slots ───────────────────────────────────────────
[[ -L "$CURRENT" ]] || fail "$CURRENT is not a symlink — cannot rollback"

ACTIVE_REAL=$(readlink -f "$CURRENT")
if   [[ "$ACTIVE_REAL" == "$SLOT_BLUE" ]];  then
  ACTIVE_NAME="blue";  PREV="$SLOT_GREEN"; PREV_NAME="green"
elif [[ "$ACTIVE_REAL" == "$SLOT_GREEN" ]]; then
  ACTIVE_NAME="green"; PREV="$SLOT_BLUE";  PREV_NAME="blue"
else
  fail "Active slot '$ACTIVE_REAL' is neither blue nor green"
fi

[[ -d "$PREV" ]] || fail "Previous slot ($PREV_NAME) not found — nothing to roll back to"

PREV_COMMIT=$(git -C "$PREV" rev-parse --short HEAD 2>/dev/null || echo "unknown")
PREV_MSG=$(git -C "$PREV" log -1 --pretty=format:"%s" 2>/dev/null || echo "")
CURR_COMMIT=$(git -C "$ACTIVE_REAL" rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo ""
warn "Rolling back:"
warn "  Active   : $ACTIVE_NAME  ($CURR_COMMIT)"
warn "  Previous : $PREV_NAME    ($PREV_COMMIT  $PREV_MSG)"
echo ""

if [[ "$YES" != "true" ]]; then
  read -r -p "Proceed? (y/N) " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { log "Aborted"; exit 0; }
fi

# ── Switch symlink ─────────────────────────────────────────────────────────────
ln -sfn "$PREV" "$CURRENT"
log "Symlink: $CURRENT → $PREV_NAME"

# ── PM2 reload ────────────────────────────────────────────────────────────────
pm2 startOrReload "$CURRENT/$ECOSYSTEM" --env "$DEPLOY_ENV" --update-env
pm2 save
log "PM2 reloaded"

# ── nginx reload ──────────────────────────────────────────────────────────────
if command -v nginx >/dev/null 2>&1; then
  nginx -t 2>/dev/null && nginx -s reload && log "nginx reloaded" || warn "nginx reload skipped"
fi

# ── Quick health check ────────────────────────────────────────────────────────
APP_PORT="${APP_PORT:-5000}"
APP_URL="${APP_URL:-http://127.0.0.1:${APP_PORT}}"
sleep 3
HTTP=$(curl -so /dev/null -w "%{http_code}" "${APP_URL}/api/health" 2>/dev/null || echo "000")
if [[ "$HTTP" == "200" ]]; then
  log "Health check OK (HTTP $HTTP)"
else
  warn "Health check returned HTTP $HTTP — check logs: pm2 logs aurelle-production"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Rollback complete${NC}"
echo -e "${GREEN}  Now live: $PREV_NAME  ($PREV_COMMIT)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
