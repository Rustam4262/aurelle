#!/usr/bin/env bash
# CRITICAL: Production Database Backup Script
#
# This script should be run ON THE PRODUCTION SERVER
# Setup: Copy this file to /root/backup_prod_db.sh on 188.225.83.33
#
# CRON SETUP (automated daily backups):
# crontab -e
# Add line: 0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1
#
# This will backup daily at 3:00 AM server time

set -e

# Configuration
CONTAINER_NAME="beauty_salon-db-1"  # UPDATE if different (check with: docker ps)
DB_NAME="beauty_salon"
DB_USER="beauty_user"
BACKUP_DIR="/root/backups/beauty_salon"
RETENTION_DAYS=30  # Keep backups for 30 days

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/beauty_salon_${TIMESTAMP}.sql.gz"
SCHEMA_FILE="$BACKUP_DIR/latest_schema.sql"

echo "========================================"
echo "AURELLE Beauty Salon - Database Backup"
echo "========================================"
echo "Started: $(date)"
echo ""

# 1. Full database backup (schema + data) - COMPRESSED
echo "📦 Creating full backup (schema + data)..."
docker exec -t $CONTAINER_NAME pg_dump \
  -U $DB_USER -d $DB_NAME \
  --no-owner --no-privileges \
  | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Full backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "❌ Full backup FAILED!"
    exit 1
fi

# 2. Schema-only backup (for versioning/comparison)
echo ""
echo "📋 Creating schema-only backup..."
docker exec -t $CONTAINER_NAME pg_dump \
  -U $DB_USER -d $DB_NAME \
  --schema-only --no-owner --no-privileges \
  > "$SCHEMA_FILE"

if [ -f "$SCHEMA_FILE" ]; then
    SCHEMA_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)
    echo "✅ Schema backup created: $SCHEMA_FILE ($SCHEMA_SIZE)"
else
    echo "⚠️  Schema backup failed (non-critical)"
fi

# 3. Database statistics
echo ""
echo "📊 Database statistics:"
TOTAL_TABLES=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
echo "   Tables: $TOTAL_TABLES"

TOTAL_ROWS=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -tAc \
  "SELECT SUM(n_live_tup) FROM pg_stat_user_tables")
echo "   Total rows: $TOTAL_ROWS"

DB_SIZE=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -tAc \
  "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))")
echo "   Database size: $DB_SIZE"

# 4. Cleanup old backups (keep last 30 days)
echo ""
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "beauty_salon_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "beauty_salon_*.sql.gz" -type f | wc -l)
echo "   Remaining backups: $REMAINING_BACKUPS"

# 5. List recent backups
echo ""
echo "📁 Recent backups:"
ls -lh "$BACKUP_DIR"/beauty_salon_*.sql.gz 2>/dev/null | tail -5 || echo "   No backups found"

echo ""
echo "========================================"
echo "Completed: $(date)"
echo "========================================"
echo ""
echo "RESTORE INSTRUCTIONS:"
echo "  1. Stop backend: docker-compose stop backend"
echo "  2. Restore: gunzip < $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
echo "  3. Start backend: docker-compose start backend"
