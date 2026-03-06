#!/usr/bin/env bash
# =============================================================================
# scripts/setup-blue-green.sh — One-time migration to Blue/Green layout
#
# Run ONCE on the server to convert from the single-directory setup
# (/var/www/aurelle as a plain directory) to the blue/green slot layout.
#
# Before:  /var/www/aurelle/        ← plain git checkout
# After:   /var/www/aurelle-blue/   ← slot A (active)
#          /var/www/aurelle-green/   ← slot B (ready for next deploy)
#          /var/www/aurelle          ← symlink → aurelle-blue
#          /var/www/aurelle-shared/
#              .env                  ← moved here from aurelle/
#              uploads/              ← symlinked from each slot
#
# Usage:
#   bash scripts/setup-blue-green.sh
#   SLOTS_DIR=/opt/apps bash scripts/setup-blue-green.sh  # custom parent dir
# =============================================================================

set -euo pipefail

SLOTS_DIR="${SLOTS_DIR:-/var/www}"
CURRENT="${SLOTS_DIR}/aurelle"
SLOT_BLUE="${SLOTS_DIR}/aurelle-blue"
SLOT_GREEN="${SLOTS_DIR}/aurelle-green"
SHARED_DIR="${SLOTS_DIR}/aurelle-shared"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "${GREEN}[setup] $*${NC}"; }
warn()    { echo -e "${YELLOW}[setup] ⚠  $*${NC}"; }
section() { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }
fail()    { echo -e "${RED}[setup] ✗ $*${NC}" >&2; exit 1; }

# ── Guard: must run as root or deploy user with sudo ──────────────────────────
[[ "$EUID" -eq 0 ]] || fail "Run as root or with sudo"

# ── Guard: must be a plain directory (not already a symlink) ──────────────────
[[ -d "$CURRENT" && ! -L "$CURRENT" ]] || fail \
  "$CURRENT must be a plain directory (not a symlink). Already migrated?"

section "Creating slot directories"
mkdir -p "$SLOT_BLUE" "$SLOT_GREEN" "$SHARED_DIR/uploads"

section "Copying current repo → aurelle-blue (active slot)"
# rsync: preserve permissions, exclude build artifacts that don't need copying
rsync -a --exclude=node_modules --exclude=.git \
  "${CURRENT}/" "${SLOT_BLUE}/"
log "Copied to $SLOT_BLUE"

section "Moving .env to shared directory"
if [[ -f "${CURRENT}/.env" ]]; then
  mv "${CURRENT}/.env" "${SHARED_DIR}/.env"
  log "Moved .env → $SHARED_DIR/.env"
else
  warn "No .env found at ${CURRENT}/.env — create ${SHARED_DIR}/.env manually"
fi

section "Setting up shared uploads dir"
# If uploads/ already has data, move it to shared dir
if [[ -d "${CURRENT}/uploads" ]]; then
  rsync -a "${CURRENT}/uploads/" "${SHARED_DIR}/uploads/"
  log "Synced uploads → $SHARED_DIR/uploads"
fi
# In each slot, uploads/ will be a symlink to the shared dir
ln -sfn "${SHARED_DIR}/uploads" "${SLOT_BLUE}/uploads"
log "Linked ${SLOT_BLUE}/uploads → shared"

section "Cloning repo into aurelle-green (inactive slot)"
REPO=$(git -C "$CURRENT" remote get-url origin 2>/dev/null || echo "")
if [[ -n "$REPO" ]]; then
  git clone --branch main "$REPO" "$SLOT_GREEN"
  # Link shared resources in green slot
  ln -sf "${SHARED_DIR}/.env"     "${SLOT_GREEN}/.env"     2>/dev/null || true
  ln -sfn "${SHARED_DIR}/uploads" "${SLOT_GREEN}/uploads"  2>/dev/null || true
  log "Cloned $REPO → $SLOT_GREEN"
else
  warn "Could not determine repo URL — $SLOT_GREEN is empty."
  warn "Clone manually: git clone <repo> $SLOT_GREEN"
fi

section "Creating symlink: aurelle → aurelle-blue"
# Rename current directory out of the way, then create symlink
mv "$CURRENT" "${CURRENT}-original-backup"
ln -sfn "$SLOT_BLUE" "$CURRENT"
log "Symlink created: $CURRENT → $SLOT_BLUE"
log "Original directory backed up at: ${CURRENT}-original-backup"

section "Building blue slot (initial)"
cd "$SLOT_BLUE"
npm ci --prefer-offline
npm run build
log "Build complete in blue slot"

section "Updating ecosystem.config.cjs (PM2 process name)"
# Verify the ecosystem file exists and PM2 picks it up from the symlink path
if [[ -f "${CURRENT}/ecosystem.config.cjs" ]]; then
  pm2 startOrReload "${CURRENT}/ecosystem.config.cjs" --env production --update-env
  pm2 save
  log "PM2 reloaded from new symlink path"
else
  warn "ecosystem.config.cjs not found — start PM2 manually:"
  warn "  pm2 startOrReload ${CURRENT}/ecosystem.config.cjs --env production"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Blue/Green setup complete!${NC}"
echo -e "${GREEN}  Active slot : blue  ($SLOT_BLUE)${NC}"
echo -e "${GREEN}  Inactive    : green ($SLOT_GREEN)${NC}"
echo -e "${GREEN}  Symlink     : $CURRENT → aurelle-blue${NC}"
echo -e "${GREEN}  Shared .env : $SHARED_DIR/.env${NC}"
echo ""
echo -e "${GREEN}  Next deploy : bash scripts/deploy.sh${NC}"
echo -e "${GREEN}  Rollback    : bash scripts/rollback.sh${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════${NC}"
echo ""
warn "Verify everything works, then delete the backup:"
warn "  rm -rf ${CURRENT}-original-backup"
echo ""
