#!/usr/bin/env bash
# scripts/smoke.sh
#
# Post-deploy smoke test for AURELLE.
# Checks all health endpoints and critical API routes.
#
# Usage:
#   bash scripts/smoke.sh                          # test localhost (dev)
#   bash scripts/smoke.sh https://aurelle.uz       # test production
#   bash scripts/smoke.sh https://staging.aurelle.uz
#
# Exit 0 = all checks passed
# Exit 1 = one or more checks failed

set -euo pipefail

BASE_URL="${1:-http://localhost:5000}"
FAIL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "  ${GREEN}✅${NC}  $1"; }
fail() { echo -e "  ${RED}❌${NC}  $1"; FAIL=1; }
info() { echo -e "  ${YELLOW}ℹ️ ${NC}  $1"; }

echo ""
echo "==================================================="
echo "  AURELLE Smoke Test — ${BASE_URL}"
echo "==================================================="
echo ""

# ── Helper ──────────────────────────────────────────────────────────────────

check_http() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local field="${4:-}"       # optional jq field to print
  local timeout_sec=10

  local response
  response=$(curl -s -o /tmp/smoke_body -w "%{http_code}" \
    --max-time "$timeout_sec" \
    --retry 2 --retry-delay 2 \
    "$url") || true

  if [[ "$response" == "$expected_status" ]]; then
    local body
    body=$(cat /tmp/smoke_body 2>/dev/null || echo "")
    if [[ -n "$field" ]] && command -v jq &>/dev/null; then
      local val
      val=$(echo "$body" | jq -r ".$field" 2>/dev/null || echo "?")
      pass "$label → HTTP $response  ($field=$val)"
    else
      pass "$label → HTTP $response"
    fi
  else
    fail "$label → expected HTTP $expected_status, got HTTP $response"
    cat /tmp/smoke_body 2>/dev/null | head -3 | sed 's/^/       /'
  fi
}

# ── 1. Liveness ──────────────────────────────────────────────────────────────

echo "── 1. Liveness ─────────────────────────────────────"
check_http "Ping"         "${BASE_URL}/api/health/ping" 200 "status"
check_http "Health (DB)"  "${BASE_URL}/api/health"      200 "status"
echo ""

# ── 2. Infrastructure Health ─────────────────────────────────────────────────

echo "── 2. Infrastructure Health ─────────────────────────"
check_http "Redis"   "${BASE_URL}/api/health/redis"  200 "status"
check_http "Email"   "${BASE_URL}/api/health/email"  200 "status"
check_http "SMS"     "${BASE_URL}/api/health/sms"    200 "status"
check_http "Sentry"  "${BASE_URL}/api/health/sentry" 200 "enabled"
echo ""

# ── 3. Auth Endpoints ────────────────────────────────────────────────────────

echo "── 3. Auth (unauthenticated baseline) ───────────────"
# /api/auth/me returns 200 {"user":null} or 401 depending on app config
# We just check it doesn't 500
check_http "Auth /me (expect 200 or 401)"  "${BASE_URL}/api/auth/me"  200
echo ""

# ── 4. Public API ────────────────────────────────────────────────────────────

echo "── 4. Public API ────────────────────────────────────"
check_http "Salons list"  "${BASE_URL}/api/salons"    200
check_http "Search"       "${BASE_URL}/api/search?q=test&city=Tashkent" 200
echo ""

# ── 5. Admin (expect 401 without auth) ──────────────────────────────────────

echo "── 5. Admin routes (expect 401) ─────────────────────"
check_http "Admin dashboard (401)"  "${BASE_URL}/api/admin/dashboard" 401
check_http "Admin users (401)"      "${BASE_URL}/api/admin/users"     401
echo ""

# ── 6. DB Verify ─────────────────────────────────────────────────────────────

echo "── 6. DB Schema Verification ────────────────────────"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
if command -v npx &>/dev/null; then
  if (cd "$PROJECT_ROOT" && npx tsx scripts/db-verify.ts 2>&1) | tail -1 | grep -q "✅"; then
    pass "DB schema — all required tables present"
  else
    fail "DB schema — missing tables detected (run: npm run db:verify)"
  fi
else
  info "npx not found — skipping db:verify (run manually: npm run db:verify)"
fi
echo ""

# ── Result ───────────────────────────────────────────────────────────────────

echo "==================================================="
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}  ✅  All smoke tests passed.${NC}"
  echo "==================================================="
  echo ""
  exit 0
else
  echo -e "${RED}  ❌  One or more smoke tests FAILED.${NC}"
  echo "==================================================="
  echo ""
  exit 1
fi
