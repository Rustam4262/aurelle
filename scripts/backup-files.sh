#!/bin/bash

# Files Backup Script
# Creates compressed backups of uploads and important files

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-/var/www/aurelle}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aurelle/files}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="aurelle_files_${TIMESTAMP}.tar.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
LOG_FILE="/var/log/aurelle-backups/files.log"
TELEGRAM_SCRIPT="/path/to/aurelle/scripts/telegram-send.sh"

# Directories to backup
BACKUP_SOURCES=(
    "$PROJECT_ROOT/uploads"
    "$PROJECT_ROOT/.env"
    "$PROJECT_ROOT/.env.production"
    "/etc/nginx/sites-available/aurelle"
    "/etc/letsencrypt/live/aurelle.uz"
    "/etc/letsencrypt/live/staging.aurelle.uz"
)

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

log "=== Files Backup Started ==="

# Step 1: Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

if [ $? -ne 0 ]; then
    log "ERROR: Failed to create backup directory"
    send_telegram "critical" "Files Backup Failed" "Failed to create backup directory: $BACKUP_DIR"
    exit 1
fi

log "✓ Backup directory ready: $BACKUP_DIR"

# Step 2: Check disk space
log "Checking disk space..."
REQUIRED_SPACE_MB=1000  # Minimum 1GB free space
AVAILABLE_SPACE_MB=$(df -m "$BACKUP_DIR" | tail -1 | awk '{print $4}')

if [ "$AVAILABLE_SPACE_MB" -lt "$REQUIRED_SPACE_MB" ]; then
    log "ERROR: Insufficient disk space (Available: ${AVAILABLE_SPACE_MB}MB, Required: ${REQUIRED_SPACE_MB}MB)"
    send_telegram "critical" "Files Backup Failed" "Insufficient disk space: ${AVAILABLE_SPACE_MB}MB available, ${REQUIRED_SPACE_MB}MB required"
    exit 1
fi

log "✓ Sufficient disk space (Available: ${AVAILABLE_SPACE_MB}MB)"

# Step 3: Verify backup sources
log "Verifying backup sources..."
EXISTING_SOURCES=()
MISSING_SOURCES=()

for source in "${BACKUP_SOURCES[@]}"; do
    if [ -e "$source" ]; then
        EXISTING_SOURCES+=("$source")
        SIZE=$(du -sh "$source" 2>/dev/null | awk '{print $1}' || echo "N/A")
        log "  ✓ $source (Size: $SIZE)"
    else
        MISSING_SOURCES+=("$source")
        log "  ⚠ Missing: $source"
    fi
done

if [ ${#EXISTING_SOURCES[@]} -eq 0 ]; then
    log "ERROR: No backup sources found"
    send_telegram "critical" "Files Backup Failed" "No backup sources found. Check configuration."
    exit 1
fi

log "Found ${#EXISTING_SOURCES[@]} source(s) to backup (${#MISSING_SOURCES[@]} missing)"

# Step 4: Create temporary file list
log "Creating file list..."
TEMP_FILE_LIST=$(mktemp)

for source in "${EXISTING_SOURCES[@]}"; do
    echo "$source" >> "$TEMP_FILE_LIST"
done

log "✓ File list created: $TEMP_FILE_LIST"

# Step 5: Create backup archive
log "Creating backup archive..."
START_TIME=$(date +%s)

# Use tar with gzip compression
# -czf: create, gzip, file
# -P: preserve absolute paths
# -T: read file list from file
# --exclude: exclude patterns
tar -czf "$BACKUP_PATH" \
    -P \
    -T "$TEMP_FILE_LIST" \
    --exclude='*.log' \
    --exclude='*.tmp' \
    --exclude='*.cache' \
    --exclude='node_modules' \
    --exclude='.git' \
    2>&1 | tee -a "$LOG_FILE"

TAR_STATUS=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Clean up temp file
rm -f "$TEMP_FILE_LIST"

if [ $TAR_STATUS -ne 0 ]; then
    log "ERROR: Backup archive creation failed (tar exit code: $TAR_STATUS)"
    send_telegram "critical" "Files Backup Failed" "tar command failed with exit code: $TAR_STATUS. Check logs: $LOG_FILE"
    exit 1
fi

# Step 6: Verify backup file
if [ ! -f "$BACKUP_PATH" ]; then
    log "ERROR: Backup file was not created: $BACKUP_PATH"
    send_telegram "critical" "Files Backup Failed" "Backup file not found: $BACKUP_PATH"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | awk '{print $1}')
BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null)
log "✓ Backup created: $BACKUP_FILE (Size: $BACKUP_SIZE, Duration: ${DURATION}s)"

# Step 7: Verify backup integrity
log "Verifying backup integrity..."
if tar -tzf "$BACKUP_PATH" > /dev/null 2>&1; then
    FILE_COUNT=$(tar -tzf "$BACKUP_PATH" | wc -l)
    log "✓ Backup integrity verified (tar test passed, $FILE_COUNT files)"
else
    log "ERROR: Backup integrity check failed"
    send_telegram "critical" "Files Backup Failed" "Backup integrity check failed for: $BACKUP_FILE"
    exit 1
fi

# Step 8: Create backup manifest
log "Creating backup manifest..."
MANIFEST_FILE="${BACKUP_PATH}.manifest"

cat > "$MANIFEST_FILE" << EOF
# AURELLE Files Backup Manifest
# Created: $(date)
# Backup File: $BACKUP_FILE
# Size: $BACKUP_SIZE ($BACKUP_SIZE_BYTES bytes)
# Duration: ${DURATION}s
# File Count: $FILE_COUNT

# Sources:
$(printf '%s\n' "${EXISTING_SOURCES[@]}")

# Missing Sources:
$(printf '%s\n' "${MISSING_SOURCES[@]}")

# File List:
$(tar -tzf "$BACKUP_PATH")
EOF

log "✓ Manifest created: ${BACKUP_FILE}.manifest"

# Step 9: Set permissions
chmod 600 "$BACKUP_PATH"
chmod 600 "$MANIFEST_FILE"
log "✓ Backup permissions set (600)"

# Step 10: Clean up old backups (local retention)
log "Cleaning up old backups (retention: ${LOCAL_RETENTION_DAYS} days)..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "aurelle_files_*.tar.gz" -type f -mtime +${LOCAL_RETENTION_DAYS})
OLD_COUNT=$(echo "$OLD_BACKUPS" | grep -c "aurelle_files_" 2>/dev/null || echo "0")

if [ "$OLD_COUNT" -gt 0 ]; then
    echo "$OLD_BACKUPS" | while read -r old_backup; do
        if [ -f "$old_backup" ]; then
            OLD_SIZE=$(du -h "$old_backup" | awk '{print $1}')
            rm -f "$old_backup"
            rm -f "${old_backup}.manifest"
            log "  Deleted old backup: $(basename "$old_backup") (Size: $OLD_SIZE)"
        fi
    done
    log "✓ Cleaned up $OLD_COUNT old backup(s)"
else
    log "No old backups to clean up"
fi

# Step 11: List current backups
log "Current backups in $BACKUP_DIR:"
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "aurelle_files_*.tar.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')
log "  Total backups: $BACKUP_COUNT"
log "  Total size: $TOTAL_SIZE"

find "$BACKUP_DIR" -name "aurelle_files_*.tar.gz" -type f -printf "  %p (%s bytes, %TY-%Tm-%Td %TH:%TM)\n" 2>/dev/null | sort -r | head -5 | tee -a "$LOG_FILE"

# Step 12: Send success notification
log "=== Files Backup Completed Successfully ==="
log ""

# Summary message for Telegram
SUMMARY="*Backup File:* $BACKUP_FILE
*Size:* $BACKUP_SIZE
*File Count:* $FILE_COUNT
*Duration:* ${DURATION}s
*Sources:* ${#EXISTING_SOURCES[@]} backed up, ${#MISSING_SOURCES[@]} missing
*Location:* $BACKUP_DIR
*Total Backups:* $BACKUP_COUNT
*Retention:* ${LOCAL_RETENTION_DAYS} days local"

send_telegram "success" "Files Backup Successful" "$SUMMARY"

# Step 13: Return backup path for cloud upload
echo "$BACKUP_PATH"
exit 0
