#!/bin/bash

# ==========================================
# ADVANCED BACKUP SCRIPT WITH ROTATION
# AURELLE - Beauty Salon Marketplace
# ==========================================
# Многоуровневая система бэкапов:
# - Ежедневные (сохраняются 7 дней)
# - Еженедельные (сохраняются 4 недели)
# - Ежемесячные (сохраняются 12 месяцев)
#
# Использование:
#   bash advanced_backup.sh
#
# Для автоматизации добавьте в crontab:
#   0 3 * * * cd /путь/к/проекту && bash ./deploy/scripts/advanced_backup.sh
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Configuration
BACKUP_ROOT="./backups"
DAILY_DIR="${BACKUP_ROOT}/daily"
WEEKLY_DIR="${BACKUP_ROOT}/weekly"
MONTHLY_DIR="${BACKUP_ROOT}/monthly"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u")  # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +"%d")

# Retention periods
KEEP_DAILY=7      # Keep 7 daily backups
KEEP_WEEKLY=4     # Keep 4 weekly backups
KEEP_MONTHLY=12   # Keep 12 monthly backups

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_NAME=${POSTGRES_DB:-beauty_salon_db}
DB_USER=${POSTGRES_USER:-beauty_user}
CONTAINER_NAME="aurelle_db_prod"

# Create backup directories
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

log_info "============================================"
log_info "  ADVANCED BACKUP SYSTEM"
log_info "============================================"
log_info "Database: $DB_NAME"
log_info "Container: $CONTAINER_NAME"
log_info "Date: $(date +'%Y-%m-%d %H:%M:%S')"
log_info ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    log_error "Database container is not running!"
    exit 1
fi

# ==========================================
# DAILY BACKUP
# ==========================================
log_step "Creating daily backup..."
DAILY_FILE="${DAILY_DIR}/daily_${TIMESTAMP}.sql"

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$DAILY_FILE"

# Compress
gzip "$DAILY_FILE"
DAILY_FILE_GZ="${DAILY_FILE}.gz"

if [ -f "$DAILY_FILE_GZ" ]; then
    SIZE=$(du -h "$DAILY_FILE_GZ" | cut -f1)
    log_info "✓ Daily backup created: $(basename $DAILY_FILE_GZ) ($SIZE)"
else
    log_error "Daily backup failed!"
    exit 1
fi

# ==========================================
# WEEKLY BACKUP (every Sunday)
# ==========================================
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    log_step "Creating weekly backup (Sunday)..."
    WEEK_NUM=$(date +"%V")
    WEEKLY_FILE="${WEEKLY_DIR}/weekly_${TIMESTAMP}_week${WEEK_NUM}.sql.gz"

    cp "$DAILY_FILE_GZ" "$WEEKLY_FILE"
    SIZE=$(du -h "$WEEKLY_FILE" | cut -f1)
    log_info "✓ Weekly backup created: $(basename $WEEKLY_FILE) ($SIZE)"
fi

# ==========================================
# MONTHLY BACKUP (first day of month)
# ==========================================
if [ "$DAY_OF_MONTH" -eq "01" ]; then
    log_step "Creating monthly backup (1st of month)..."
    MONTH=$(date +"%Y-%m")
    MONTHLY_FILE="${MONTHLY_DIR}/monthly_${TIMESTAMP}_${MONTH}.sql.gz"

    cp "$DAILY_FILE_GZ" "$MONTHLY_FILE"
    SIZE=$(du -h "$MONTHLY_FILE" | cut -f1)
    log_info "✓ Monthly backup created: $(basename $MONTHLY_FILE) ($SIZE)"
fi

# ==========================================
# CLEANUP OLD BACKUPS
# ==========================================
log_step "Cleaning up old backups..."

# Delete old daily backups (keep last 7 days)
DELETED_DAILY=$(find "$DAILY_DIR" -name "daily_*.sql.gz" -mtime +$KEEP_DAILY -delete -print | wc -l)
if [ "$DELETED_DAILY" -gt 0 ]; then
    log_info "Deleted $DELETED_DAILY old daily backup(s)"
fi

# Delete old weekly backups (keep last 4 weeks = 28 days)
KEEP_WEEKLY_DAYS=$((KEEP_WEEKLY * 7))
DELETED_WEEKLY=$(find "$WEEKLY_DIR" -name "weekly_*.sql.gz" -mtime +$KEEP_WEEKLY_DAYS -delete -print | wc -l)
if [ "$DELETED_WEEKLY" -gt 0 ]; then
    log_info "Deleted $DELETED_WEEKLY old weekly backup(s)"
fi

# Delete old monthly backups (keep last 12 months = 365 days)
KEEP_MONTHLY_DAYS=$((KEEP_MONTHLY * 30))
DELETED_MONTHLY=$(find "$MONTHLY_DIR" -name "monthly_*.sql.gz" -mtime +$KEEP_MONTHLY_DAYS -delete -print | wc -l)
if [ "$DELETED_MONTHLY" -gt 0 ]; then
    log_info "Deleted $DELETED_MONTHLY old monthly backup(s)"
fi

# ==========================================
# BACKUP STATISTICS
# ==========================================
log_info ""
log_info "============================================"
log_info "  BACKUP STATISTICS"
log_info "============================================"

# Count backups
DAILY_COUNT=$(find "$DAILY_DIR" -name "daily_*.sql.gz" 2>/dev/null | wc -l)
WEEKLY_COUNT=$(find "$WEEKLY_DIR" -name "weekly_*.sql.gz" 2>/dev/null | wc -l)
MONTHLY_COUNT=$(find "$MONTHLY_DIR" -name "monthly_*.sql.gz" 2>/dev/null | wc -l)

log_info "Daily backups: $DAILY_COUNT (max: $KEEP_DAILY)"
log_info "Weekly backups: $WEEKLY_COUNT (max: $KEEP_WEEKLY)"
log_info "Monthly backups: $MONTHLY_COUNT (max: $KEEP_MONTHLY)"

# Total size
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
log_info "Total backup size: $TOTAL_SIZE"

# Show recent backups
log_info ""
log_info "Recent backups:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DAILY:"
ls -lh "$DAILY_DIR"/daily_*.sql.gz 2>/dev/null | tail -3 | awk '{print "  "$9" - "$5}' || echo "  No daily backups"

if [ "$WEEKLY_COUNT" -gt 0 ]; then
    echo ""
    echo "WEEKLY:"
    ls -lh "$WEEKLY_DIR"/weekly_*.sql.gz 2>/dev/null | tail -3 | awk '{print "  "$9" - "$5}'
fi

if [ "$MONTHLY_COUNT" -gt 0 ]; then
    echo ""
    echo "MONTHLY:"
    ls -lh "$MONTHLY_DIR"/monthly_*.sql.gz 2>/dev/null | tail -3 | awk '{print "  "$9" - "$5}'
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info ""
log_info "✅ Backup completed successfully!"
log_info "Next backup will run: $(date -d 'tomorrow 3:00' +'%Y-%m-%d %H:%M')"
log_info ""
