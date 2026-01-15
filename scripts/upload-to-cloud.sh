#!/bin/bash

# Cloud Upload Script
# Uploads backups to Backblaze B2 using rclone

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load configuration
CONFIG_FILE="/etc/aurelle-backup.conf"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo -e "${RED}✗${NC} Configuration file not found: $CONFIG_FILE"
    echo "Please run: sudo bash scripts/setup-backblaze-b2.sh"
    exit 1
fi

LOG_FILE="/var/log/aurelle-backups/cloud-upload.log"

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

# Function to upload file to B2
upload_file() {
    local file_path="$1"
    local destination="$2"

    if [ ! -f "$file_path" ]; then
        log "ERROR: File not found: $file_path"
        return 1
    fi

    local filename=$(basename "$file_path")
    local filesize=$(du -h "$file_path" | awk '{print $1}')

    log "Uploading: $filename (Size: $filesize)"

    # Upload with progress
    rclone copy "$file_path" "${B2_REMOTE}:${B2_BUCKET}/${destination}/" \
        --progress \
        --transfers 4 \
        --checkers 8 \
        --buffer-size 16M \
        2>&1 | tee -a "$LOG_FILE"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "✓ Upload successful: $filename"

        # Verify upload
        if rclone ls "${B2_REMOTE}:${B2_BUCKET}/${destination}/" | grep -q "$filename"; then
            log "✓ Upload verified on B2"
            return 0
        else
            log "ERROR: Upload verification failed"
            return 1
        fi
    else
        log "ERROR: Upload failed for: $filename"
        return 1
    fi
}

# Main execution
log "=== Cloud Upload Started ==="

# Check if rclone is configured
if ! rclone listremotes | grep -q "^${B2_REMOTE}:"; then
    log "ERROR: Rclone remote '$B2_REMOTE' not configured"
    send_telegram "critical" "Cloud Upload Failed" "Rclone remote '$B2_REMOTE' not found. Run setup-backblaze-b2.sh"
    exit 1
fi

log "✓ Rclone remote '$B2_REMOTE' found"

# Get backup files to upload
if [ $# -gt 0 ]; then
    # Files specified as arguments
    BACKUP_FILES=("$@")
else
    # Find latest backups
    log "Finding latest backups..."

    DB_BACKUP=$(find /var/backups/aurelle/database -name "aurelle_db_*.sql.gz" -type f -mtime -1 | sort -r | head -1)
    FILES_BACKUP=$(find /var/backups/aurelle/files -name "aurelle_files_*.tar.gz" -type f -mtime -1 | sort -r | head -1)

    BACKUP_FILES=()
    [ -n "$DB_BACKUP" ] && BACKUP_FILES+=("$DB_BACKUP")
    [ -n "$FILES_BACKUP" ] && BACKUP_FILES+=("$FILES_BACKUP")

    if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
        log "ERROR: No recent backups found"
        send_telegram "warning" "Cloud Upload Skipped" "No recent backups found to upload"
        exit 1
    fi

    log "Found ${#BACKUP_FILES[@]} backup(s) to upload"
fi

# Upload each backup
UPLOAD_SUCCESS=0
UPLOAD_FAILED=0
UPLOADED_FILES=()

for backup_file in "${BACKUP_FILES[@]}"; do
    if [ -f "$backup_file" ]; then
        # Determine destination based on file type
        if [[ "$backup_file" == *"_db_"* ]]; then
            DESTINATION="database"
        elif [[ "$backup_file" == *"_files_"* ]]; then
            DESTINATION="files"
        else
            DESTINATION="other"
        fi

        if upload_file "$backup_file" "$DESTINATION"; then
            UPLOAD_SUCCESS=$((UPLOAD_SUCCESS + 1))
            UPLOADED_FILES+=("$(basename "$backup_file")")
        else
            UPLOAD_FAILED=$((UPLOAD_FAILED + 1))
        fi
    else
        log "WARNING: File not found: $backup_file"
        UPLOAD_FAILED=$((UPLOAD_FAILED + 1))
    fi
done

# Clean up old backups on B2 (retention policy)
log "Cleaning up old backups on B2 (retention: ${B2_RETENTION_DAYS} days)..."

# Get files older than retention period
CUTOFF_DATE=$(date -d "${B2_RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${B2_RETENTION_DAYS}d +%Y%m%d 2>/dev/null)

for backup_type in database files; do
    log "Checking $backup_type backups..."

    rclone ls "${B2_REMOTE}:${B2_BUCKET}/${backup_type}/" 2>/dev/null | while read -r size filename; do
        # Extract date from filename (format: aurelle_TYPE_YYYYMMDD_HHMMSS.ext)
        if [[ "$filename" =~ aurelle_.*_([0-9]{8})_[0-9]{6}\. ]]; then
            file_date="${BASH_REMATCH[1]}"

            if [ "$file_date" -lt "$CUTOFF_DATE" ]; then
                log "  Deleting old backup: $filename (Date: $file_date)"
                rclone delete "${B2_REMOTE}:${B2_BUCKET}/${backup_type}/${filename}" 2>&1 | tee -a "$LOG_FILE"
            fi
        fi
    done
done

log "✓ Cleanup complete"

# Check B2 storage usage
log "Checking B2 storage usage..."
B2_USAGE=$(rclone size "${B2_REMOTE}:${B2_BUCKET}/" 2>/dev/null | grep "Total size:" | awk '{print $3" "$4}')
log "B2 storage used: $B2_USAGE"

# Send completion notification
log "=== Cloud Upload Completed ==="
log ""

if [ $UPLOAD_FAILED -eq 0 ]; then
    SUMMARY="*Uploaded:* $UPLOAD_SUCCESS file(s)
*Failed:* $UPLOAD_FAILED
*Storage:* $B2_USAGE
*Bucket:* ${B2_REMOTE}:${B2_BUCKET}
*Retention:* ${B2_RETENTION_DAYS} days

*Files:*
$(printf '- %s\n' "${UPLOADED_FILES[@]}")"

    send_telegram "success" "Cloud Upload Successful" "$SUMMARY"
    exit 0
else
    SUMMARY="*Uploaded:* $UPLOAD_SUCCESS file(s)
*Failed:* $UPLOAD_FAILED
*Storage:* $B2_USAGE
*Bucket:* ${B2_REMOTE}:${B2_BUCKET}

Check logs: $LOG_FILE"

    send_telegram "warning" "Cloud Upload Completed with Errors" "$SUMMARY"
    exit 1
fi
