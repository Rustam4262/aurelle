#!/bin/bash
# diagnose-server.sh — Диагностика production сервера
# Запустить на сервере: bash diagnose-server.sh
# Вывод отправить разработчику

echo "============================================================"
echo "AURELLE Server Diagnostics — $(date)"
echo "============================================================"
echo ""

section() { echo ""; echo "━━━ $1 ━━━"; }

# ─── 1. Способ запуска ───────────────────────────────────────────────────────
section "1. PROCESS MANAGER"

echo "[Docker]"
if command -v docker &>/dev/null; then
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "docker ps failed"
else
  echo "Docker not installed"
fi

echo ""
echo "[PM2]"
if command -v pm2 &>/dev/null; then
  pm2 list 2>/dev/null || echo "pm2 list failed"
else
  echo "PM2 not installed"
fi

echo ""
echo "[systemd — Node/Aurelle services]"
systemctl list-units --type=service 2>/dev/null | grep -E "node|aurelle|app" || echo "No matching systemd services"

echo ""
echo "[Raw Node processes]"
ps aux | grep -E "[n]ode|[t]sx" | head -10

# ─── 2. Порты ────────────────────────────────────────────────────────────────
section "2. PORTS (listening)"
ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null || echo "ss/netstat not available"

# ─── 3. Проект ───────────────────────────────────────────────────────────────
section "3. PROJECT LOCATION"
echo "Searching for .env files..."
find /var/www /home /opt /root -name ".env" -not -path "*/node_modules/*" 2>/dev/null | head -20

echo ""
echo "Searching for package.json (aurelle)..."
find /var/www /home /opt -name "package.json" -not -path "*/node_modules/*" 2>/dev/null \
  | xargs grep -l '"name": "rest-express"\|aurelle' 2>/dev/null | head -5

# ─── 4. nginx ────────────────────────────────────────────────────────────────
section "4. NGINX"
if command -v nginx &>/dev/null; then
  echo "[nginx -t]"
  nginx -t 2>&1

  echo ""
  echo "[sites-enabled]"
  ls -la /etc/nginx/sites-enabled/ 2>/dev/null || ls -la /etc/nginx/conf.d/ 2>/dev/null || echo "No nginx configs found"

  echo ""
  echo "[aurelle config]"
  cat /etc/nginx/sites-enabled/aurelle 2>/dev/null \
    || cat /etc/nginx/conf.d/aurelle.conf 2>/dev/null \
    || echo "aurelle nginx config not found"
else
  echo "nginx not installed"
fi

# ─── 5. SSL ──────────────────────────────────────────────────────────────────
section "5. SSL CERTIFICATE"
if command -v certbot &>/dev/null; then
  certbot certificates 2>&1 | head -30
fi

echo ""
echo "[Certificate expiry]"
echo | openssl s_client -connect aurelle.uz:443 -servername aurelle.uz 2>/dev/null \
  | openssl x509 -noout -subject -dates 2>/dev/null || echo "Cannot check cert"

# ─── 6. Env variables (без секретов) ─────────────────────────────────────────
section "6. ENV VARIABLES (redacted)"
ENV_FILE=$(find /var/www /home /opt -name ".env" -not -path "*/node_modules/*" 2>/dev/null | head -1)
if [ -n "$ENV_FILE" ]; then
  echo "Found: $ENV_FILE"
  # Показываем ключи, скрываем значения секретов
  sed 's/\(SECRET\|PASSWORD\|TOKEN\|KEY\|DSN\|SID\)=.*/\1=***REDACTED***/g' "$ENV_FILE" | grep -v "^#"
else
  echo ".env not found"
fi

# ─── 7. Диск и память ────────────────────────────────────────────────────────
section "7. DISK & MEMORY"
df -h 2>/dev/null | grep -v "tmpfs\|udev"
echo ""
free -h 2>/dev/null

# ─── 8. OS и Node версии ─────────────────────────────────────────────────────
section "8. SYSTEM INFO"
echo "OS: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2)"
echo "Kernel: $(uname -r)"
echo "Node: $(node --version 2>/dev/null || echo 'not found')"
echo "npm: $(npm --version 2>/dev/null || echo 'not found')"
echo "nginx: $(nginx -v 2>&1 || echo 'not found')"
echo "Uptime: $(uptime)"

# ─── 9. Health check ─────────────────────────────────────────────────────────
section "9. APP HEALTH CHECK"
echo "[localhost:5000]"
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" http://localhost:5000/ 2>/dev/null || echo "Cannot reach localhost:5000"

echo "[https://aurelle.uz]"
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://aurelle.uz/ 2>/dev/null || echo "Cannot reach aurelle.uz"

echo "[/api/health]"
curl -s https://aurelle.uz/api/health 2>/dev/null | head -200 || echo "Cannot reach /api/health"

echo ""
echo "============================================================"
echo "Diagnostics complete. Send this output to your developer."
echo "============================================================"
