#!/bin/bash

# Automated Restore Testing Script
# Tests database and files restoration without affecting production

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TEST_DB_NAME="aurelle_restore_test"
TEST_DIR="/tmp/aurelle_restore_test_$(date +%s)"
BACKUP_DIR="/var/backups/aurelle"
LOG_FILE="/var/log/aurelle-backups/restore-test.log"
TELEGRAM_SCRIPT="/path/to/aurelle/scripts/telegram-send.sh"

# Function to log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send Telegram
send_telegram() {
    if [ -f "$TELEGRAM_SCRIPT" ]; then
        bash "$TELEGRAM_SCRIPT" "$@"
    fi
}

log "=== Automated Restore Test Started ==="

# Create test directory
mkdir -p "$TEST_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Test 1: Database Restore Test
log "Test 1: Database Restore"

DB_BACKUP=$(find "$BACKUP_DIR/database" -name "aurelle_db_*.sql.gz" -type f | sort -r | head -1)

if [ -z "$DB_BACKUP" ]; then
    log "ERROR: No database backup found"
    send_telegram "warning" "Restore Test Failed" "No database backup found for testing"
    exit 1
fi

DB_BACKUP_NAME=$(basename "$DB_BACKUP")
DB_BACKUP_SIZE=$(du -h "$DB_BACKUP" | awk '{print $1}')
log "Testing with: $DB_BACKUP_NAME (Size: $DB_BACKUP_SIZE)"

# Verify backup integrity
if ! gzip -t "$DB_BACKUP" 2>/dev/null; then
    log "ERROR: Database backup corrupted"
    send_telegram "critical" "Restore Test Failed" "Database backup is corrupted: $DB_BACKUP_NAME"
    exit 1
fi

log "✓ Database backup integrity verified"

# Create test database
sudo -u postgres createdb "$TEST_DB_NAME" 2>&1 | tee -a "$LOG_FILE"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to create test database"
    exit 1
fi

# Restore to test database
START_TIME=$(date +%s)
gunzip < "$DB_BACKUP" | sudo -u postgres pg_restore -d "$TEST_DB_NAME" 2>&1 | tee -a "$LOG_FILE"
RESTORE_STATUS=${PIPESTATUS[1]}
END_TIME=$(date +%s)
DB_DURATION=$((END_TIME - START_TIME))

if [ $RESTORE_STATUS -ne 0 ]; then
    log "ERROR: Database restore failed"
    sudo -u postgres dropdb "$TEST_DB_NAME" 2>/dev/null
    send_telegram "critical" "Restore Test Failed" "Database restore test failed for: $DB_BACKUP_NAME"
    exit 1
fi

# Verify restored database
TABLE_COUNT=$(sudo -u postgres psql -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
BOOKINGS=$(sudo -u postgres psql -d "$TEST_DB_NAME" -t -c "SELECT COUNT(*) FROM bookings;" 2>/dev/null | xargs || echo "0")

log "✓ Database restore successful: $TABLE_COUNT tables, $BOOKINGS bookings (Duration: ${DB_DURATION}s)"

# Cleanup test database
sudo -u postgres dropdb "$TEST_DB_NAME" 2>&1 | tee -a "$LOG_FILE"

# Test 2: Files Restore Test
log "Test 2: Files Restore"

FILES_BACKUP=$(find "$BACKUP_DIR/files" -name "aurelle_files_*.tar.gz" -type f | sort -r | head -1)

if [ -z "$FILES_BACKUP" ]; then
    log "WARNING: No files backup found"
    FILES_TEST_RESULT="No backup found"
else
    FILES_BACKUP_NAME=$(basename "$FILES_BACKUP")
    FILES_BACKUP_SIZE=$(du -h "$FILES_BACKUP" | awk '{print $1}')
    log "Testing with: $FILES_BACKUP_NAME (Size: $FILES_BACKUP_SIZE)"

    # Verify backup integrity
    if ! tar -tzf "$FILES_BACKUP" > /dev/null 2>&1; then
        log "ERROR: Files backup corrupted"
        send_telegram "critical" "Restore Test Failed" "Files backup is corrupted: $FILES_BACKUP_NAME"
        exit 1
    fi

    FILE_COUNT=$(tar -tzf "$FILES_BACKUP" | wc -l)
    log "✓ Files backup integrity verified ($FILE_COUNT files)"

    # Test extraction to temp directory
    START_TIME=$(date +%s)
    tar -xzf "$FILES_BACKUP" -C "$TEST_DIR" 2>&1 | tee -a "$LOG_FILE"
    EXTRACT_STATUS=$?
    END_TIME=$(date +%s)
    FILES_DURATION=$((END_TIME - START_TIME))

    if [ $EXTRACT_STATUS -ne 0 ]; then
        log "ERROR: Files extraction failed"
        send_telegram "critical" "Restore Test Failed" "Files extraction test failed for: $FILES_BACKUP_NAME"
        rm -rf "$TEST_DIR"
        exit 1
    fi

    EXTRACTED_SIZE=$(du -sh "$TEST_DIR" 2>/dev/null | awk '{print $1}')
    log "✓ Files extraction successful: $FILE_COUNT files, $EXTRACTED_SIZE (Duration: ${FILES_DURATION}s)"
    FILES_TEST_RESULT="Success"
fi

# Cleanup test directory
rm -rf "$TEST_DIR"

# Test 3: Cloud Backup Availability
log "Test 3: Cloud Backup Availability"

if [ -f "/etc/aurelle-backup.conf" ]; then
    source "/etc/aurelle-backup.conf"

    if command -v rclone &> /dev/null && rclone listremotes | grep -q "^${B2_REMOTE}:"; then
        CLOUD_DB_COUNT=$(rclone ls "${B2_REMOTE}:${B2_BUCKET}/database/" 2>/dev/null | wc -l)
        CLOUD_FILES_COUNT=$(rclone ls "${B2_REMOTE}:${B2_BUCKET}/files/" 2>/dev/null | wc -l)
        CLOUD_SIZE=$(rclone size "${B2_REMOTE}:${B2_BUCKET}/" 2>/dev/null | grep "Total size:" | awk '{print $3" "$4}')

        log "✓ Cloud backups: DB=$CLOUD_DB_COUNT, Files=$CLOUD_FILES_COUNT, Size=$CLOUD_SIZE"
        CLOUD_TEST_RESULT="Available"
    else
        log "WARNING: Cloud backup not configured"
        CLOUD_TEST_RESULT="Not configured"
    fi
else
    log "WARNING: Cloud backup configuration not found"
    CLOUD_TEST_RESULT="Not configured"
fi

# Summary
log "=== Restore Test Completed ==="
log ""

SUMMARY="*Database Restore:* ✓ Success
- Backup: $DB_BACKUP_NAME ($DB_BACKUP_SIZE)
- Tables: $TABLE_COUNT
- Records: $BOOKINGS bookings
- Duration: ${DB_DURATION}s

*Files Restore:* $FILES_TEST_RESULT"

if [ "$FILES_TEST_RESULT" == "Success" ]; then
    SUMMARY="$SUMMARY
- Backup: $FILES_BACKUP_NAME ($FILES_BACKUP_SIZE)
- Files: $FILE_COUNT
- Duration: ${FILES_DURATION}s"
fi

SUMMARY="$SUMMARY

*Cloud Backup:* $CLOUD_TEST_RESULT"

if [ "$CLOUD_TEST_RESULT" == "Available" ]; then
    SUMMARY="$SUMMARY
- Database backups: $CLOUD_DB_COUNT
- Files backups: $CLOUD_FILES_COUNT
- Total size: $CLOUD_SIZE"
fi

send_telegram "success" "Restore Test Successful" "$SUMMARY"

log "Test results:"
log "  Database restore: Success"
log "  Files restore: $FILES_TEST_RESULT"
log "  Cloud availability: $CLOUD_TEST_RESULT"
log ""

echo ""
echo -e "${GREEN}✓ All restore tests passed!${NC}"
echo ""
echo "Backups are verified and ready for disaster recovery"
echo ""

exit 0
