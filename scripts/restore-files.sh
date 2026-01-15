#!/bin/bash

# Files Restore Script
# Restores files from backup archive

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="${PROJECT_ROOT:-/var/www/aurelle}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aurelle/files}"
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

log "=== Files Restore Started ==="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Step 1: Select backup file
if [ -z "$1" ]; then
    log "Listing available backups..."
    echo ""
    echo -e "${BLUE}Available files backups:${NC}"
    echo ""

    BACKUPS=($(find "$BACKUP_DIR" -name "aurelle_files_*.tar.gz" -type f | sort -r))

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
MANIFEST_FILE="${BACKUP_FILE}.manifest"

log "Selected backup: $BACKUP_FILENAME (Size: $BACKUP_SIZE)"

# Step 3: Show backup contents
if [ -f "$MANIFEST_FILE" ]; then
    echo ""
    echo -e "${BLUE}Backup Manifest:${NC}"
    head -20 "$MANIFEST_FILE"
    echo ""
fi

# Step 4: Verify backup integrity
log "Verifying backup integrity..."
if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    log "ERROR: Backup file is corrupted (tar test failed)"
    send_telegram "critical" "Files Restore Failed" "Backup file is corrupted: $BACKUP_FILENAME"
    exit 1
fi

FILE_COUNT=$(tar -tzf "$BACKUP_FILE" | wc -l)
log "✓ Backup integrity verified ($FILE_COUNT files)"

# Step 5: Restore options
echo ""
echo -e "${BLUE}Restore Options:${NC}"
echo "  1. Full restore (overwrites existing files)"
echo "  2. Selective restore (choose what to restore)"
echo "  3. Preview only (list files without extracting)"
echo ""

read -p "Select option (1-3): " restore_option

case $restore_option in
    1)
        RESTORE_MODE="full"
        ;;
    2)
        RESTORE_MODE="selective"
        ;;
    3)
        RESTORE_MODE="preview"
        ;;
    *)
        echo -e "${RED}✗${NC} Invalid option"
        exit 1
        ;;
esac

# Step 6: Preview mode
if [ "$RESTORE_MODE" == "preview" ]; then
    echo ""
    echo -e "${BLUE}Files in backup:${NC}"
    tar -tzf "$BACKUP_FILE" | head -50
    echo ""
    TOTAL=$(tar -tzf "$BACKUP_FILE" | wc -l)
    echo "Total files: $TOTAL"
    echo ""
    echo "To restore, run again and select option 1 or 2"
    exit 0
fi

# Step 7: Selective restore
if [ "$RESTORE_MODE" == "selective" ]; then
    echo ""
    echo -e "${BLUE}What would you like to restore?${NC}"
    echo "  1. Uploads directory only"
    echo "  2. Environment files (.env) only"
    echo "  3. Nginx configuration only"
    echo "  4. SSL certificates only"
    echo "  5. Custom selection"
    echo ""

    read -p "Select option (1-5): " selective_option

    case $selective_option in
        1)
            EXTRACT_PATTERN="*/uploads/*"
            ;;
        2)
            EXTRACT_PATTERN="*/.env*"
            ;;
        3)
            EXTRACT_PATTERN="*/nginx/*"
            ;;
        4)
            EXTRACT_PATTERN="*/letsencrypt/*"
            ;;
        5)
            read -p "Enter pattern to extract (e.g., */uploads/*.jpg): " EXTRACT_PATTERN
            ;;
        *)
            echo -e "${RED}✗${NC} Invalid option"
            exit 1
            ;;
    esac

    log "Selective restore: $EXTRACT_PATTERN"
fi

# Step 8: Confirmation warning
echo ""
echo -e "${YELLOW}⚠ WARNING: Files will be overwritten!${NC}"
echo ""

if [ "$RESTORE_MODE" == "full" ]; then
    echo -e "${YELLOW}  This will restore ALL files from the backup${NC}"
elif [ "$RESTORE_MODE" == "selective" ]; then
    echo -e "${YELLOW}  This will restore files matching: $EXTRACT_PATTERN${NC}"
fi

echo ""
echo "Backup: $BACKUP_FILENAME"
echo ""

read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Step 9: Create pre-restore backup of critical directories
log "Creating pre-restore backup..."
PRE_RESTORE_DIR="/tmp/aurelle_pre_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$PRE_RESTORE_DIR"

if [ -d "$PROJECT_ROOT/uploads" ]; then
    cp -r "$PROJECT_ROOT/uploads" "$PRE_RESTORE_DIR/" 2>/dev/null
    log "✓ Backed up uploads directory to: $PRE_RESTORE_DIR"
fi

if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$PRE_RESTORE_DIR/" 2>/dev/null
    log "✓ Backed up .env file"
fi

# Step 10: Stop application (PM2)
log "Stopping application..."
pm2 stop all 2>&1 | tee -a "$LOG_FILE"
sleep 2
log "✓ Application stopped"

# Step 11: Extract backup
log "Extracting files from backup..."
START_TIME=$(date +%s)

if [ "$RESTORE_MODE" == "full" ]; then
    # Full restore
    tar -xzf "$BACKUP_FILE" -C / -P 2>&1 | tee -a "$LOG_FILE"
    EXTRACT_STATUS=${PIPESTATUS[0]}
else
    # Selective restore
    tar -xzf "$BACKUP_FILE" -C / -P --wildcards "$EXTRACT_PATTERN" 2>&1 | tee -a "$LOG_FILE"
    EXTRACT_STATUS=${PIPESTATUS[0]}
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $EXTRACT_STATUS -ne 0 ]; then
    log "ERROR: File extraction failed (tar exit code: $EXTRACT_STATUS)"

    # Restore from pre-restore backup
    if [ -d "$PRE_RESTORE_DIR/uploads" ]; then
        log "Restoring from pre-restore backup..."
        rm -rf "$PROJECT_ROOT/uploads"
        cp -r "$PRE_RESTORE_DIR/uploads" "$PROJECT_ROOT/" 2>/dev/null
    fi

    send_telegram "critical" "Files Restore Failed" "Failed to extract: $BACKUP_FILENAME. Check logs: $LOG_FILE"
    pm2 restart all
    exit 1
fi

log "✓ Files extracted successfully (Duration: ${DURATION}s)"

# Step 12: Set permissions
log "Setting file permissions..."

if [ -d "$PROJECT_ROOT/uploads" ]; then
    chown -R www-data:www-data "$PROJECT_ROOT/uploads"
    chmod -R 755 "$PROJECT_ROOT/uploads"
    log "✓ Uploads directory permissions set"
fi

if [ -f "$PROJECT_ROOT/.env" ]; then
    chown www-data:www-data "$PROJECT_ROOT/.env"
    chmod 600 "$PROJECT_ROOT/.env"
    log "✓ Environment file permissions set"
fi

# Step 13: Verify restoration
log "Verifying restored files..."

if [ -d "$PROJECT_ROOT/uploads" ]; then
    UPLOADS_SIZE=$(du -sh "$PROJECT_ROOT/uploads" 2>/dev/null | awk '{print $1}')
    UPLOADS_COUNT=$(find "$PROJECT_ROOT/uploads" -type f 2>/dev/null | wc -l)
    log "Uploads: $UPLOADS_COUNT files, $UPLOADS_SIZE total"
fi

log "✓ File verification complete"

# Step 14: Restart application
log "Restarting application..."
pm2 restart all 2>&1 | tee -a "$LOG_FILE"
sleep 3

# Check if app is running
if pm2 list | grep -q "online"; then
    log "✓ Application restarted successfully"
else
    log "WARNING: Application may not have started correctly"
    send_telegram "warning" "Files Restored, Application Issue" "Files restored successfully but application may have issues. Check PM2 status."
fi

# Step 15: Clean up pre-restore backup
echo ""
read -p "Keep pre-restore backup at $PRE_RESTORE_DIR? (y/N): " keep_backup

if [[ ! $keep_backup =~ ^[Yy]$ ]]; then
    log "Cleaning up pre-restore backup..."
    rm -rf "$PRE_RESTORE_DIR"
    log "✓ Pre-restore backup removed"
else
    log "Pre-restore backup kept at: $PRE_RESTORE_DIR"
    echo ""
    echo -e "${YELLOW}Remember to clean up later:${NC}"
    echo "  rm -rf $PRE_RESTORE_DIR"
fi

# Step 16: Send success notification
log "=== Files Restore Completed Successfully ==="
log ""

SUMMARY="*Backup:* $BACKUP_FILENAME
*Size:* $BACKUP_SIZE
*Files:* $FILE_COUNT
*Duration:* ${DURATION}s
*Mode:* $RESTORE_MODE"

if [ -n "$UPLOADS_COUNT" ]; then
    SUMMARY="$SUMMARY
*Uploads:* $UPLOADS_COUNT files, $UPLOADS_SIZE"
fi

send_telegram "success" "Files Restore Successful" "$SUMMARY"

echo ""
echo -e "${GREEN}✓ Files restore completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify application is working: https://aurelle.uz"
echo "  2. Check PM2 status: pm2 status"
echo "  3. Check application logs: pm2 logs"
echo ""

exit 0
