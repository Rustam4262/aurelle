#!/bin/bash

# ==========================================
# Database Restore Script
# ==========================================

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/aurelle_db_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

POSTGRES_USER=${POSTGRES_USER:-beauty_user}
POSTGRES_DB=${POSTGRES_DB:-beauty_salon_db}

echo "⚠️  WARNING: This will REPLACE the current database!"
echo "Database: ${POSTGRES_DB}"
echo "Backup: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Check if running in production
if [ -f docker-compose.prod.yml ] && docker-compose -f docker-compose.prod.yml ps | grep -q postgres; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "📥 Starting database restore..."

# Drop existing connections
echo "Terminating active connections..."
docker-compose -f ${COMPOSE_FILE} exec -T postgres psql -U ${POSTGRES_USER} -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Recreating database..."
docker-compose -f ${COMPOSE_FILE} exec -T postgres psql -U ${POSTGRES_USER} -d postgres <<EOF
DROP DATABASE IF EXISTS ${POSTGRES_DB};
CREATE DATABASE ${POSTGRES_DB};
EOF

# Restore from backup
echo "Restoring from backup..."
gunzip -c ${BACKUP_FILE} | docker-compose -f ${COMPOSE_FILE} exec -T postgres \
    psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"

    # Run migrations to ensure schema is up to date
    echo "Running migrations..."
    if [ "${COMPOSE_FILE}" = "docker-compose.prod.yml" ]; then
        docker-compose -f ${COMPOSE_FILE} exec backend alembic upgrade head
    else
        docker-compose -f ${COMPOSE_FILE} exec backend alembic upgrade head
    fi

    echo "✅ Restore completed!"
else
    echo "❌ Restore failed!"
    exit 1
fi
