#!/bin/bash

# ==========================================
# Database Backup Script
# ==========================================

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="aurelle_db_${TIMESTAMP}.sql.gz"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

POSTGRES_USER=${POSTGRES_USER:-beauty_user}
POSTGRES_DB=${POSTGRES_DB:-beauty_salon_db}

echo "📦 Starting database backup..."

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Check if running in production
if [ -f docker-compose.prod.yml ] && docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "Using compose file: ${COMPOSE_FILE}"

# Create backup
echo "Creating backup: ${BACKUP_FILE}"
docker-compose -f ${COMPOSE_FILE} exec -T postgres \
    pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} | gzip > ${BACKUP_DIR}/${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: ${BACKUP_DIR}/${BACKUP_FILE}"

    # Get file size
    SIZE=$(du -h ${BACKUP_DIR}/${BACKUP_FILE} | cut -f1)
    echo "   Size: ${SIZE}"

    # Delete old backups (older than 30 days)
    echo "🗑️  Removing old backups (>30 days)..."
    find ${BACKUP_DIR} -name "aurelle_db_*.sql.gz" -mtime +30 -delete

    # Show remaining backups
    BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/aurelle_db_*.sql.gz 2>/dev/null | wc -l)
    echo "   Total backups: ${BACKUP_COUNT}"
else
    echo "❌ Backup failed!"
    exit 1
fi
