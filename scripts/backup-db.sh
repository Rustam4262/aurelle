#!/bin/bash

# Database Backup Script
# Creates compressed PostgreSQL backups with retention policy

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aurelle/database}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="aurelle_db_${TIMESTAMP}.sql.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
LOG_FILE="/var/log/aurelle-backups/database.log"
TELEGRAM_SCRIPT="/path/to/aurelle/scripts/telegram-send.sh"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send Telegram notification
send_telegram() {
    local level="$1"
    local title="$2"
    local message="$3"

    if [ -f "$TELEGRAM_SCRIPT" ]; then
        bash "$TELEGRAM_SCRIPT" "$level" "$title" "$message"
    fi
}

log "=== Database Backup Started ==="

# Step 1: Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to create backup directory"
    send_telegram "critical" "Database Backup Failed" "Failed to create backup directory: $BACKUP_DIR"
    exit 1
fi

log "✓ Backup directory ready: $BACKUP_DIR"

# Step 2: Check if database exists
log "Checking database connection..."
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log "ERROR: Database '$DB_NAME' does not exist"
    send_telegram "critical" "Database Backup Failed" "Database '$DB_NAME' does not exist"
    exit 1
fi

log "✓ Database '$DB_NAME' exists"

# Step 3: Check disk space
log "Checking disk space..."
REQUIRED_SPACE_MB=500  # Minimum 500MB free space
AVAILABLE_SPACE_MB=$(df -m "$BACKUP_DIR" | tail -1 | awk '{print $4}')

if [ "$AVAILABLE_SPACE_MB" -lt "$REQUIRED_SPACE_MB" ]; then
    log "ERROR: Insufficient disk space (Available: ${AVAILABLE_SPACE_MB}MB, Required: ${REQUIRED_SPACE_MB}MB)"
    send_telegram "critical" "Database Backup Failed" "Insufficient disk space: ${AVAILABLE_SPACE_MB}MB available, ${REQUIRED_SPACE_MB}MB required"
    exit 1
fi

log "✓ Sufficient disk space (Available: ${AVAILABLE_SPACE_MB}MB)"

# Step 4: Get database size
DB_SIZE=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
log "Database size: $DB_SIZE"

# Step 5: Create backup
log "Creating database backup..."
START_TIME=$(date +%s)

sudo -u postgres pg_dump -Fc "$DB_NAME" | gzip > "$BACKUP_PATH"
DUMP_STATUS=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $DUMP_STATUS -ne 0 ]; then
    log "ERROR: Database backup failed (pg_dump exit code: $DUMP_STATUS)"
    send_telegram "critical" "Database Backup Failed" "pg_dump failed with exit code: $DUMP_STATUS. Check logs: $LOG_FILE"
    exit 1
fi

# Step 6: Verify backup file
if [ ! -f "$BACKUP_PATH" ]; then
    log "ERROR: Backup file was not created: $BACKUP_PATH"
    send_telegram "critical" "Database Backup Failed" "Backup file not found: $BACKUP_PATH"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | awk '{print $1}')
log "✓ Backup created: $BACKUP_FILE (Size: $BACKUP_SIZE, Duration: ${DURATION}s)"

# Step 7: Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_PATH" 2>/dev/null; then
    log "✓ Backup integrity verified (gzip test passed)"
else
    log "ERROR: Backup integrity check failed"
    send_telegram "critical" "Database Backup Failed" "Backup integrity check failed for: $BACKUP_FILE"
    exit 1
fi

# Step 8: Set permissions
chmod 600 "$BACKUP_PATH"
log "✓ Backup permissions set (600)"

# Step 9: Clean up old backups (local retention)
log "Cleaning up old backups (retention: ${LOCAL_RETENTION_DAYS} days)..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "aurelle_db_*.sql.gz" -type f -mtime +${LOCAL_RETENTION_DAYS})
OLD_COUNT=$(echo "$OLD_BACKUPS" | grep -c "aurelle_db_" 2>/dev/null || echo "0")

if [ "$OLD_COUNT" -gt 0 ]; then
    echo "$OLD_BACKUPS" | while read -r old_backup; do
        if [ -f "$old_backup" ]; then
            OLD_SIZE=$(du -h "$old_backup" | awk '{print $1}')
            rm -f "$old_backup"
            log "  Deleted old backup: $(basename "$old_backup") (Size: $OLD_SIZE)"
        fi
    done
    log "✓ Cleaned up $OLD_COUNT old backup(s)"
else
    log "No old backups to clean up"
fi

# Step 10: List current backups
log "Current backups in $BACKUP_DIR:"
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "aurelle_db_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')
log "  Total backups: $BACKUP_COUNT"
log "  Total size: $TOTAL_SIZE"

find "$BACKUP_DIR" -name "aurelle_db_*.sql.gz" -type f -printf "  %p (%s bytes, %TY-%Tm-%Td %TH:%TM)\n" | sort -r | head -5 | tee -a "$LOG_FILE"

# Step 11: Send success notification
log "=== Database Backup Completed Successfully ==="
log ""

# Summary message for Telegram
SUMMARY="*Database:* $DB_NAME
*Backup File:* $BACKUP_FILE
*Size:* $BACKUP_SIZE (Original DB: $DB_SIZE)
*Duration:* ${DURATION}s
*Location:* $BACKUP_DIR
*Total Backups:* $BACKUP_COUNT
*Retention:* ${LOCAL_RETENTION_DAYS} days local"

send_telegram "success" "Database Backup Successful" "$SUMMARY"

# Step 12: Return backup path for cloud upload
echo "$BACKUP_PATH"
exit 0
