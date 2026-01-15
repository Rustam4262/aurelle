#!/bin/bash

# Database Restore Script
# Restores PostgreSQL database from backup

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
LOG_FILE="/var/log/aurelle-backups/restore.log"
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

log "=== Database Restore Started ==="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Step 1: Select backup file
if [ -z "$1" ]; then
    log "Listing available backups..."
    echo ""
    echo -e "${BLUE}Available database backups:${NC}"
    echo ""

    BACKUPS=($(find "$BACKUP_DIR" -name "aurelle_db_*.sql.gz" -type f | sort -r))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}✗${NC} No backups found in $BACKUP_DIR"
        exit 1
    fi

    for i in "${!BACKUPS[@]}"; do
        backup="${BACKUPS[$i]}"
        filename=$(basename "$backup")
        size=$(du -h "$backup" | awk '{print $1}')
        date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || stat -f "%Sm" "$backup" 2>/dev/null)
        echo "  $((i+1)). $filename"
        echo "     Size: $size, Date: $date"
    done

    echo ""
    read -p "Select backup number (1-${#BACKUPS[@]}) or enter path: " selection

    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le "${#BACKUPS[@]}" ]; then
        BACKUP_FILE="${BACKUPS[$((selection-1))]}"
    elif [ -f "$selection" ]; then
        BACKUP_FILE="$selection"
    else
        echo -e "${RED}✗${NC} Invalid selection"
        exit 1
    fi
else
    BACKUP_FILE="$1"
fi

# Step 2: Verify backup file
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

BACKUP_FILENAME=$(basename "$BACKUP_FILE")
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')

log "Selected backup: $BACKUP_FILENAME (Size: $BACKUP_SIZE)"

# Step 3: Verify backup integrity
log "Verifying backup integrity..."
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    log "ERROR: Backup file is corrupted (gzip test failed)"
    send_telegram "critical" "Database Restore Failed" "Backup file is corrupted: $BACKUP_FILENAME"
    exit 1
fi

log "✓ Backup integrity verified"

# Step 4: Confirmation warning
echo ""
echo -e "${YELLOW}⚠ WARNING: This will DROP and RECREATE the database!${NC}"
echo -e "${YELLOW}  Database: $DB_NAME${NC}"
echo -e "${YELLOW}  All current data will be LOST!${NC}"
echo ""
echo "Backup to restore: $BACKUP_FILENAME"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Step 5: Create pre-restore backup of current database
log "Creating pre-restore backup of current database..."
PRE_RESTORE_BACKUP="/tmp/aurelle_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

sudo -u postgres pg_dump -Fc "$DB_NAME" 2>/dev/null | gzip > "$PRE_RESTORE_BACKUP"

if [ $? -eq 0 ]; then
    PRE_RESTORE_SIZE=$(du -h "$PRE_RESTORE_BACKUP" | awk '{print $1}')
    log "✓ Pre-restore backup created: $PRE_RESTORE_BACKUP (Size: $PRE_RESTORE_SIZE)"
    echo ""
    echo -e "${GREEN}Pre-restore backup created${NC}"
    echo "If restore fails, you can recover from: $PRE_RESTORE_BACKUP"
    echo ""
else
    log "WARNING: Failed to create pre-restore backup"
    echo ""
    read -p "Continue without pre-restore backup? (yes/no): " continue_anyway
    if [ "$continue_anyway" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
fi

# Step 6: Stop application (PM2)
log "Stopping application..."
pm2 stop all 2>&1 | tee -a "$LOG_FILE"
sleep 2
log "✓ Application stopped"

# Step 7: Terminate active connections
log "Terminating active database connections..."
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>&1 | tee -a "$LOG_FILE"
log "✓ Active connections terminated"

# Step 8: Drop existing database
log "Dropping existing database..."
sudo -u postgres dropdb "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to drop database"
    log "Attempting to restart application..."
    pm2 restart all
    exit 1
fi

log "✓ Database dropped"

# Step 9: Create new database
log "Creating new database..."
sudo -u postgres createdb -O "$DB_USER" "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to create database"
    send_telegram "critical" "Database Restore Failed" "Failed to create database. Manual intervention required!"
    exit 1
fi

log "✓ Database created"

# Step 10: Restore from backup
log "Restoring database from backup..."
START_TIME=$(date +%s)

gunzip < "$BACKUP_FILE" | sudo -u postgres pg_restore -d "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"
RESTORE_STATUS=${PIPESTATUS[1]}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $RESTORE_STATUS -ne 0 ]; then
    log "ERROR: Database restore failed (pg_restore exit code: $RESTORE_STATUS)"

    # Try to restore from pre-restore backup
    if [ -f "$PRE_RESTORE_BACKUP" ]; then
        log "Attempting to restore from pre-restore backup..."
        sudo -u postgres dropdb "$DB_NAME"
        sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
        gunzip < "$PRE_RESTORE_BACKUP" | sudo -u postgres pg_restore -d "$DB_NAME"

        if [ $? -eq 0 ]; then
            log "✓ Restored from pre-restore backup"
            send_telegram "warning" "Database Restore Failed, Rollback Successful" "Failed to restore from $BACKUP_FILENAME, but rolled back to pre-restore state"
        else
            log "ERROR: Rollback failed!"
            send_telegram "critical" "Database Restore Failed, Rollback Failed" "CRITICAL: Both restore and rollback failed. Manual recovery required!"
        fi
    fi

    pm2 restart all
    exit 1
fi

log "✓ Database restored successfully (Duration: ${DURATION}s)"

# Step 11: Verify database
log "Verifying database..."

# Check if database exists
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log "ERROR: Database verification failed - database not found"
    pm2 restart all
    exit 1
fi

# Get record counts
TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
log "Tables restored: $TABLE_COUNT"

# Check critical tables
BOOKINGS_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM bookings;" 2>/dev/null | xargs || echo "0")
USERS_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM user_profiles;" 2>/dev/null | xargs || echo "0")
SALONS_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM salons;" 2>/dev/null | xargs || echo "0")

log "Record counts: Bookings=$BOOKINGS_COUNT, Users=$USERS_COUNT, Salons=$SALONS_COUNT"

log "✓ Database verification complete"

# Step 12: Restart application
log "Restarting application..."
pm2 restart all 2>&1 | tee -a "$LOG_FILE"
sleep 3

# Check if app is running
if pm2 list | grep -q "online"; then
    log "✓ Application restarted successfully"
else
    log "WARNING: Application may not have started correctly"
    send_telegram "warning" "Database Restored, Application Issue" "Database restored successfully but application may have issues. Check PM2 status."
fi

# Step 13: Clean up pre-restore backup
if [ -f "$PRE_RESTORE_BACKUP" ]; then
    log "Cleaning up pre-restore backup..."
    rm -f "$PRE_RESTORE_BACKUP"
    log "✓ Pre-restore backup removed"
fi

# Step 14: Send success notification
log "=== Database Restore Completed Successfully ==="
log ""

SUMMARY="*Database:* $DB_NAME
*Backup:* $BACKUP_FILENAME
*Size:* $BACKUP_SIZE
*Duration:* ${DURATION}s
*Tables:* $TABLE_COUNT
*Records:* Bookings=$BOOKINGS_COUNT, Users=$USERS_COUNT, Salons=$SALONS_COUNT"

send_telegram "success" "Database Restore Successful" "$SUMMARY"

echo ""
echo -e "${GREEN}✓ Database restore completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify application is working: https://aurelle.uz"
echo "  2. Check PM2 status: pm2 status"
echo "  3. Check application logs: pm2 logs"
echo ""

exit 0
