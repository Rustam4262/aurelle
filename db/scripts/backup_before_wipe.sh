#!/usr/bin/env bash
# CRITICAL: Full backup before wipe
# This backup includes ALL data and schema

set -e

echo "=========================================="
echo "CRITICAL: Pre-Wipe Backup"
echo "=========================================="
echo "Date: $(date)"
echo ""

# Configuration (will be auto-detected if possible)
DB_CONTAINER=$(sudo docker ps --filter name=db --filter name=postgres --format '{{.Names}}' | head -1)
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

BACKUP_DIR="/root/backups/beauty_salon"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/BEFORE_WIPE_${TIMESTAMP}.dump"

echo "Container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Create backup directory
sudo mkdir -p "$BACKUP_DIR"

# Full backup (custom format - includes schema + data, can be selectively restored)
echo "📦 Creating full backup (custom format)..."
sudo docker exec -t $DB_CONTAINER pg_dump \
  -U $DB_USER -d $DB_NAME \
  --format=custom \
  --verbose \
  > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE"
    echo "   Size: $BACKUP_SIZE"
else
    echo "❌ Backup FAILED!"
    exit 1
fi

# Also create a plain SQL backup (human-readable)
SQL_BACKUP="$BACKUP_DIR/BEFORE_WIPE_${TIMESTAMP}.sql"
echo ""
echo "📋 Creating plain SQL backup (human-readable)..."
sudo docker exec -t $DB_CONTAINER pg_dump \
  -U $DB_USER -d $DB_NAME \
  --no-owner --no-privileges \
  | gzip > "${SQL_BACKUP}.gz"

if [ -f "${SQL_BACKUP}.gz" ]; then
    SQL_SIZE=$(du -h "${SQL_BACKUP}.gz" | cut -f1)
    echo "✅ SQL backup created: ${SQL_BACKUP}.gz"
    echo "   Size: $SQL_SIZE"
fi

echo ""
echo "=========================================="
echo "BACKUP COMPLETE"
echo "=========================================="
echo ""
echo "Restore instructions (if needed):"
echo ""
echo "# Custom format (selective restore):"
echo "sudo docker exec -i $DB_CONTAINER pg_restore \\"
echo "  -U $DB_USER -d $DB_NAME \\"
echo "  --clean --if-exists \\"
echo "  < $BACKUP_FILE"
echo ""
echo "# Plain SQL (full restore):"
echo "gunzip < ${SQL_BACKUP}.gz | sudo docker exec -i $DB_CONTAINER \\"
echo "  psql -U $DB_USER -d $DB_NAME"
echo ""
echo "✅ Safe to proceed with wipe."
echo ""
