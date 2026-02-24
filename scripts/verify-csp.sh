#!/bin/bash
# verify-csp.sh — Полная валидация CSP + smoke + drift check + commit gate
# Usage:
#   ./scripts/verify-csp.sh                       # против localhost:5000
#   ./scripts/verify-csp.sh https://aurelle.uz    # против прода
#   ./scripts/verify-csp.sh https://staging.aurelle.uz
set -euo pipefail

TARGET="${1:-http://localhost:5000}"
PASS=0; FAIL=0; WARN=0

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()      { echo -e "${GREEN}  ✅ $*${NC}";   ((PASS++)); }
fail()    { echo -e "${RED}  ❌ $*${NC}";     ((FAIL++)); }
warn()    { echo -e "${YELLOW}  ⚠  $*${NC}"; ((WARN++)); }
info()    { echo -e "${CYAN}  ℹ  $*${NC}"; }
section() { echo -e "\n${BOLD}${CYAN}━━━ $* ━━━${NC}"; }

# ─── 0. HTTP → HTTPS redirect ────────────────────────────────────────────────
section "HTTP → HTTPS redirect"
if [[ "$TARGET" == https://* ]]; then
  HTTP_TARGET="http://$(echo "$TARGET" | sed 's|https://||')"
  HTTP_CODE=$(curl -sI "$HTTP_TARGET" --max-time 5 | head -1 | awk '{print $2}' || echo "000")
  if [[ "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
    ok "HTTP redirects to HTTPS (HTTP $HTTP_CODE)"
  else
    fail "HTTP does not redirect — got HTTP $HTTP_CODE"
  fi
else
  info "Skipping redirect check (not HTTPS target)"
fi

# ─── 1. Получить CSP заголовки ────────────────────────────────────────────────
section "Fetching CSP headers"

get_csp() {
  curl -sI "$1" --max-time 10 | tr -d '\r' \
    | awk -F': ' 'tolower($1) == "content-security-policy" { print substr($0, index($0,$2)) }'
}

HTML_CSP=$(get_csp "$TARGET")
API_CSP=$(get_csp "$TARGET/api/health")

info "HTML CSP (nginx, ${#HTML_CSP} chars):"
[ -n "$HTML_CSP" ] && echo "  $HTML_CSP" | head -c 300 && echo "..." || echo "  (empty)"

echo ""
info "API CSP (helmet, ${#API_CSP} chars):"
[ -n "$API_CSP" ] && echo "  $API_CSP" | head -c 300 && echo "..." || echo "  (empty)"

# ─── 2. Директивы HTML CSP ────────────────────────────────────────────────────
section "Directive checks — HTML (nginx)"

if [ -z "$HTML_CSP" ]; then
  fail "Content-Security-Policy MISSING on HTML response"
else
  check_directive() {
    local label="$1"; local pattern="$2"
    echo "$HTML_CSP" | grep -qi "$pattern" && ok "$label" || fail "$label — pattern: $pattern"
  }
  check_directive "default-src 'self'"          "default-src 'self'"
  check_directive "base-uri 'self'"             "base-uri 'self'"
  check_directive "object-src 'none'"           "object-src 'none'"
  check_directive "frame-ancestors 'none'"      "frame-ancestors 'none'"
  check_directive "script-src GTM"              "googletagmanager\.com"
  check_directive "script-src GA4"              "google-analytics\.com"
  check_directive "style-src Google Fonts"      "fonts\.googleapis\.com"
  check_directive "font-src gstatic"            "fonts\.gstatic\.com"
  check_directive "connect-src https:"          "connect-src.*https:"
  check_directive "frame-src GTM"               "frame-src"
fi

# ─── 3. Security checks — нет опасных директив ────────────────────────────────
section "Security checks — HTML"

if echo "$HTML_CSP" | grep -qiE "script-src[^;]*'unsafe-eval'"; then
  fail "unsafe-eval in script-src (CRITICAL)"
else
  ok "No unsafe-eval in script-src"
fi

if echo "$HTML_CSP" | grep -qiE "script-src[^;]*'unsafe-inline'"; then
  fail "unsafe-inline in script-src (high risk)"
else
  ok "No unsafe-inline in script-src"
fi

if echo "$HTML_CSP" | grep -qiE "(default|script)-src[^;]* \*"; then
  fail "Wildcard (*) in script-src or default-src"
else
  ok "No wildcard in script/default-src"
fi

if echo "$HTML_CSP" | grep -qi "frame-ancestors 'none'"; then
  ok "frame-ancestors 'none' (clickjacking protected)"
elif echo "$HTML_CSP" | grep -qi "frame-ancestors 'self'"; then
  warn "frame-ancestors 'self' — consider 'none' if no embeds needed"
else
  fail "frame-ancestors missing"
fi

# X-Frame-Options
XFO=$(curl -sI "$TARGET" --max-time 5 | tr -d '\r' \
  | awk -F': ' 'tolower($1)=="x-frame-options"{print $2}')
if echo "$XFO" | grep -qi "DENY"; then
  ok "X-Frame-Options: DENY (aligned with frame-ancestors 'none')"
elif echo "$XFO" | grep -qi "SAMEORIGIN"; then
  warn "X-Frame-Options: SAMEORIGIN — misaligned with frame-ancestors 'none'"
else
  warn "X-Frame-Options: not set (modern browsers use CSP frame-ancestors)"
fi

# ─── 4. Drift check: nginx vs Helmet ──────────────────────────────────────────
section "Drift check — nginx CSP vs Helmet CSP"

if [ -z "$HTML_CSP" ] || [ -z "$API_CSP" ]; then
  warn "Cannot compare — one CSP is missing"
else
  # Нормализуем: разбиваем по ';', сортируем, сравниваем
  printf '%s\n' "$HTML_CSP" | sed 's/;[ ]*/\n/g' | sed 's/^ *//' | grep -v '^$' | sort > /tmp/csp_nginx.txt
  printf '%s\n' "$API_CSP"  | sed 's/;[ ]*/\n/g' | sed 's/^ *//' | grep -v '^$' | sort > /tmp/csp_helmet.txt

  if diff -q /tmp/csp_nginx.txt /tmp/csp_helmet.txt >/dev/null 2>&1; then
    ok "nginx CSP == Helmet CSP (in sync)"
  else
    warn "nginx CSP ≠ Helmet CSP — drift detected:"
    diff /tmp/csp_nginx.txt /tmp/csp_helmet.txt | grep '^[<>]' | head -10 \
      | sed 's/^</  nginx:  /; s/^>/  helmet: /' || true
    info "Fix: sync configs/nginx-https.conf and server/index.ts"
  fi
fi

# ─── 5. GTM loader reachable ──────────────────────────────────────────────────
section "GTM loader: /gtm-init.js"

GTM_STATUS=$(curl -sI "$TARGET/gtm-init.js" --max-time 5 | head -1 | awk '{print $2}' || echo "000")
GTM_TYPE=$(curl -sI "$TARGET/gtm-init.js" --max-time 5 | tr -d '\r' \
  | awk -F': ' 'tolower($1)=="content-type"{print $2}')

if [ "$GTM_STATUS" = "200" ]; then
  ok "/gtm-init.js reachable (HTTP 200)"
  if echo "$GTM_TYPE" | grep -qi "javascript"; then
    ok "Content-Type: $GTM_TYPE"
  else
    warn "Content-Type: $GTM_TYPE (expected application/javascript)"
  fi
else
  fail "/gtm-init.js returned HTTP $GTM_STATUS"
fi

# ─── 6. Smoke: ErrorBoundary / raw i18n keys ─────────────────────────────────
section "Smoke — ErrorBoundary & i18n keys"

# Получаем HTML страницы /client (SPA — сервер всегда отдаёт index.html,
# React boundary виден только после гидрации, поэтому проверяем index.html
# на наличие ErrorBoundary-маркеров и raw i18n паттернов в JS бандле)
INDEX_HTML=$(curl -s "$TARGET" --max-time 10 || echo "")

if [ -z "$INDEX_HTML" ]; then
  warn "Cannot fetch $TARGET for smoke check"
else
  # ErrorBoundary маркеры в HTML (до гидрации React — там их быть не должно)
  if echo "$INDEX_HTML" | grep -qiE "errorboundary|что-то пошло не так|something went wrong"; then
    fail "ErrorBoundary marker found in HTML response"
  else
    ok "No ErrorBoundary marker in HTML"
  fi

  # Raw i18n ключи в HTML (до гидрации их тоже не должно быть)
  if echo "$INDEX_HTML" | grep -qiE "marketplace\.[a-z]+\.[a-z]+"; then
    fail "Raw i18n keys found in HTML (translations not loaded server-side)"
  else
    ok "No raw i18n keys in HTML"
  fi
fi

# ─── 7. Commit gate: нет unsafe-* в критических файлах ────────────────────────
section "Commit gate — no unsafe-* in source"

if ! command -v git &>/dev/null || ! git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
  warn "Not in a git repo — skipping commit gate"
else
  GATE_FAIL=0

  # 1. nginx: в script-src НЕ должно быть unsafe-*
  #    style-src unsafe-inline допустим (CSS inline)
  NGINX_SCRIPT_UNSAFE=$(awk '/script-src/,/;/' configs/nginx-https.conf \
    | grep -E "unsafe-inline|unsafe-eval" || true)
  if [ -n "$NGINX_SCRIPT_UNSAFE" ]; then
    fail "nginx script-src has unsafe-*:"
    echo "$NGINX_SCRIPT_UNSAFE" | sed 's/^/    /'
    GATE_FAIL=1
  else
    ok "nginx script-src: no unsafe-*"
  fi

  # 2. HTML: нет inline <script> блоков (только src=)
  HTML_INLINE=$(grep -nE "<script[^>]*>[^<]+" client/index.html \
    | grep -v "src=" || true)
  if [ -n "$HTML_INLINE" ]; then
    fail "client/index.html has inline <script> blocks:"
    echo "$HTML_INLINE" | sed 's/^/    /'
    GATE_FAIL=1
  else
    ok "index.html: no inline <script> blocks"
  fi

  # 3. server/index.ts: unsafe-eval/unsafe-inline только в dev-guard
  #    Разрешаем: строки где есть NODE_ENV conditional
  #    Разрешаем: style-src (CSS inline допустим)
  #    Блокируем: всё остальное
  SERVER_UNSAFE=$(grep -nE "unsafe-inline|unsafe-eval" server/index.ts \
    | grep -vE "NODE_ENV.*production|style-src" || true)
  if [ -n "$SERVER_UNSAFE" ]; then
    fail "server/index.ts has unsafe-* outside dev guard or style-src:"
    echo "$SERVER_UNSAFE" | sed 's/^/    /'
    GATE_FAIL=1
  else
    ok "server/index.ts: unsafe-* only in dev guard and style-src (OK)"
  fi

  [ "$GATE_FAIL" -eq 0 ] && ok "Commit gate passed"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
section "Summary"
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}  ${YELLOW}Warnings: $WARN${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ CSP validation FAILED ($FAIL issues). Fix before deploying.${NC}"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}⚠  Passed with $WARN warning(s). Review above.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ All CSP checks passed.${NC}"
fi
