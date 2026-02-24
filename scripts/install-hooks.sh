#!/bin/bash
# install-hooks.sh — Установить git pre-commit хуки
# Usage: bash scripts/install-hooks.sh
set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
GREEN='\033[0;32m'; NC='\033[0m'

cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/bin/bash
# pre-commit: запрещает коммит unsafe-* в критические CSP-файлы
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

CRITICAL_FILES=(
  "configs/nginx-https.conf"
  "server/index.ts"
  "client/index.html"
)

FAILED=0

for f in "${CRITICAL_FILES[@]}"; do
  # Проверяем только staged версию файла
  if ! git show ":$f" &>/dev/null 2>&1; then
    continue  # файл не в индексе — пропускаем
  fi

  STAGED=$(git show ":$f" 2>/dev/null || true)

  # nginx: unsafe-* в script-src — запрещено
  if [[ "$f" == *.conf ]]; then
    MATCHES=$(echo "$STAGED" | awk '/script-src/,/;/' | grep -nE "unsafe-inline|unsafe-eval" || true)
  # HTML: inline <script> блоки — запрещены
  elif [[ "$f" == *.html ]]; then
    MATCHES=$(echo "$STAGED" | grep -nE "<script[^>]*>[^<]+" | grep -v "src=" || true)
  # server/index.ts: unsafe-* вне dev-guard и вне style-src — запрещено
  elif [[ "$f" == *.ts ]]; then
    MATCHES=$(echo "$STAGED" | grep -nE "unsafe-inline|unsafe-eval" \
      | grep -vE "NODE_ENV.*production|style-src" || true)
  else
    MATCHES=$(echo "$STAGED" | grep -nE "unsafe-inline|unsafe-eval" || true)
  fi

  if [ -n "$MATCHES" ]; then
    echo -e "${RED}❌ pre-commit: CSP violation in $f:${NC}"
    echo "$MATCHES" | while read -r line; do
      echo "   $line"
    done
    FAILED=1
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo -e "${RED}Commit blocked: unsafe-* in CSP-critical files.${NC}"
  echo -e "${YELLOW}If intentional, use: git commit --no-verify${NC}"
  exit 1
fi

echo -e "${GREEN}✅ pre-commit: no unsafe-* in CSP files${NC}"
HOOK

chmod +x "$HOOKS_DIR/pre-commit"
echo -e "${GREEN}✅ pre-commit hook installed at $HOOKS_DIR/pre-commit${NC}"
echo "   Blocks commits with unsafe-inline/unsafe-eval in:"
echo "   configs/nginx-https.conf, server/index.ts, client/index.html"
