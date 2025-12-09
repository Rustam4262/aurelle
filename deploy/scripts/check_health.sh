#!/bin/bash

# ==========================================
# HEALTH CHECK SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================
# Проверяет здоровье всех сервисов
# Использование:
#   bash check_health.sh
#
# Для автоматических проверок добавьте в crontab:
#   */5 * * * * cd ~/projects/aurelle && bash ./deploy/scripts/check_health.sh
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Load environment
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
FRONTEND_URL="https://aurelle.uz"
API_URL="https://api.aurelle.uz"
TELEGRAM_SCRIPT="./deploy/scripts/send_telegram.sh"

# Alert function
send_alert() {
    local message="$1"
    echo "$message"

    # Send to Telegram if configured
    if [ -f "$TELEGRAM_SCRIPT" ] && [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        bash "$TELEGRAM_SCRIPT" "$message" 2>/dev/null || true
    fi
}

echo "=========================================="
echo "  AURELLE Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# Check Frontend
echo "Checking Frontend..."
if curl -f -s -o /dev/null "$FRONTEND_URL"; then
    log_success "Frontend is UP: $FRONTEND_URL"
else
    log_error "Frontend is DOWN: $FRONTEND_URL"
    send_alert "⚠️ ALERT: Frontend не доступен! $FRONTEND_URL"
    exit 1
fi

# Check API Health endpoint
echo "Checking API..."
if curl -f -s "$API_URL/health" | grep -q "ok"; then
    log_success "API is UP: $API_URL/health"
else
    log_error "API is DOWN: $API_URL/health"
    send_alert "⚠️ ALERT: API не отвечает! $API_URL/health"
    exit 1
fi

# Check API Docs
if curl -f -s -o /dev/null "$API_URL/docs"; then
    log_success "API Docs is UP: $API_URL/docs"
else
    log_warn "API Docs is not accessible: $API_URL/docs"
fi

# Check Docker containers
echo ""
echo "Checking Docker containers..."
CONTAINERS=$(docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | wc -l)

if [ "$CONTAINERS" -eq 0 ]; then
    log_error "No Docker containers running!"
    send_alert "⚠️ ALERT: Docker контейнеры не запущены!"
    exit 1
fi

DOWN_CONTAINERS=$(docker-compose -f docker-compose.prod.yml ps | grep -c "Exit" || true)
if [ "$DOWN_CONTAINERS" -gt 0 ]; then
    log_error "Some containers are down: $DOWN_CONTAINERS"
    send_alert "⚠️ ALERT: $DOWN_CONTAINERS контейнеров не работают!"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

log_success "All $CONTAINERS containers are running"

# Check Disk Usage
echo ""
echo "Checking Disk Usage..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -gt 90 ]; then
    log_error "Disk usage critical: ${DISK_USAGE}%"
    send_alert "⚠️ ALERT: Диск заполнен на ${DISK_USAGE}%! Требуется очистка."
elif [ "$DISK_USAGE" -gt 80 ]; then
    log_warn "Disk usage high: ${DISK_USAGE}%"
else
    log_success "Disk usage OK: ${DISK_USAGE}%"
fi

# Check Memory Usage
echo "Checking Memory Usage..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

if [ "$MEMORY_USAGE" -gt 90 ]; then
    log_error "Memory usage critical: ${MEMORY_USAGE}%"
    send_alert "⚠️ ALERT: Память заполнена на ${MEMORY_USAGE}%!"
elif [ "$MEMORY_USAGE" -gt 80 ]; then
    log_warn "Memory usage high: ${MEMORY_USAGE}%"
else
    log_success "Memory usage OK: ${MEMORY_USAGE}%"
fi

# Check latest backup
echo ""
echo "Checking backups..."
LATEST_BACKUP=$(find ./backups -name "*.sql.gz" -type f -mtime -1 | head -1)

if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(stat -c %Y "$LATEST_BACKUP")
    NOW=$(date +%s)
    AGE_HOURS=$(( ($NOW - $BACKUP_AGE) / 3600 ))

    if [ $AGE_HOURS -lt 25 ]; then
        log_success "Recent backup found: $(basename $LATEST_BACKUP) (${AGE_HOURS}h ago)"
    else
        log_warn "Backup is old: ${AGE_HOURS}h ago"
    fi
else
    log_warn "No recent backups found (last 24h)"
fi

echo ""
echo "=========================================="
log_success "All systems are healthy!"
echo "=========================================="
