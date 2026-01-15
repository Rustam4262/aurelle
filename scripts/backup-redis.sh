#!/bin/bash

# Redis Backup Script
# Creates backup of Redis data

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Redis Backup for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
REDIS_DIR="/var/lib/redis"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aurelle/redis}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"
LOG_FILE="/var/log/aurelle-backups/redis.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load Redis credentials
if [ -f "/etc/aurelle-redis.conf" ]; then
    source /etc/aurelle-redis.conf
else
    echo -e "${RED}✗${NC} Redis credentials file not found"
    exit 1
fi

log "=== Redis Backup Started ==="

# Step 1: Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Step 2: Check Redis service
if ! systemctl is-active --quiet redis-server; then
    log "ERROR: Redis service is not running"
    exit 1
fi

log "✓ Redis service is running"

# Step 3: Check disk space
AVAILABLE_SPACE=$(df -BM "$BACKUP_DIR" | tail -1 | awk '{print $4}' | sed 's/M//')
REDIS_SIZE=$(du -m "$REDIS_DIR/dump.rdb" 2>/dev/null | awk '{print $1}' || echo "0")

if [ "$AVAILABLE_SPACE" -lt $((REDIS_SIZE * 2 + 100)) ]; then
    log "ERROR: Insufficient disk space. Available: ${AVAILABLE_SPACE}M, Required: $((REDIS_SIZE * 2 + 100))M"
    exit 1
fi

log "✓ Sufficient disk space: ${AVAILABLE_SPACE}M available"

# Step 4: Trigger Redis BGSAVE
log "Triggering Redis BGSAVE..."

redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE > /dev/null 2>&1

# Wait for BGSAVE to complete
TIMEOUT=300  # 5 minutes timeout
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
    BGSAVE_STATUS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE 2>/dev/null)
    sleep 2
    NEW_STATUS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE 2>/dev/null)

    if [ "$NEW_STATUS" -gt "$BGSAVE_STATUS" ]; then
        log "✓ BGSAVE completed"
        break
    fi

    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    log "WARNING: BGSAVE timeout, proceeding with existing dump.rdb"
fi

# Step 5: Copy Redis dump file
log "Copying Redis dump file..."

if [ ! -f "$REDIS_DIR/dump.rdb" ]; then
    log "ERROR: Redis dump file not found"
    exit 1
fi

cp "$REDIS_DIR/dump.rdb" "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | awk '{print $1}')
    log "✓ Backup created: $BACKUP_FILE (Size: $BACKUP_SIZE)"
else
    log "ERROR: Failed to copy Redis dump file"
    exit 1
fi

# Step 6: Verify backup
log "Verifying backup..."

if [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    log "✓ Backup file is not empty"
else
    log "ERROR: Backup file is empty"
    exit 1
fi

# Step 7: Compress backup
log "Compressing backup..."

gzip "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | awk '{print $1}')
    log "✓ Backup compressed: ${BACKUP_FILE}.gz (Size: $COMPRESSED_SIZE)"
else
    log "ERROR: Failed to compress backup"
    exit 1
fi

# Step 8: Get Redis info
REDIS_KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" DBSIZE 2>/dev/null | awk '{print $2}')
REDIS_MEMORY=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r')

log "Redis stats: Keys=$REDIS_KEYS, Memory=$REDIS_MEMORY"

# Step 9: Clean up old backups
log "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."

OLD_BACKUPS=$(find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -type f -mtime +${RETENTION_DAYS})
OLD_COUNT=$(echo "$OLD_BACKUPS" | grep -c "redis_backup" || echo "0")

if [ "$OLD_COUNT" -gt 0 ]; then
    echo "$OLD_BACKUPS" | xargs rm -f
    log "✓ Removed $OLD_COUNT old backup(s)"
else
    log "No old backups to remove"
fi

# Step 10: List current backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')

log "Current backups: $BACKUP_COUNT file(s), Total size: $TOTAL_SIZE"

# Step 11: Send Telegram notification (if available)
TELEGRAM_SCRIPT="/var/www/aurelle/scripts/telegram-send.sh"

if [ -f "$TELEGRAM_SCRIPT" ]; then
    NOTIFICATION="*Redis Backup Successful*

*File:* ${BACKUP_FILE}.gz
*Size:* $COMPRESSED_SIZE
*Keys:* $REDIS_KEYS
*Memory:* $REDIS_MEMORY
*Backups:* $BACKUP_COUNT"

    bash "$TELEGRAM_SCRIPT" "info" "Redis Backup" "$NOTIFICATION"
fi

log "=== Redis Backup Completed Successfully ==="
log ""

echo ""
echo -e "${GREEN}✓ Redis backup completed successfully${NC}"
echo ""
echo "Backup file: $BACKUP_DIR/${BACKUP_FILE}.gz"
echo "Backup size: $COMPRESSED_SIZE"
echo "Redis keys: $REDIS_KEYS"
echo "Total backups: $BACKUP_COUNT"
echo ""

exit 0
