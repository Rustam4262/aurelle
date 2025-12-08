#!/bin/bash

# ==========================================
# DATABASE RESTORE SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================
# Восстанавливает базу данных из резервной копии
# Использование:
#   bash restore.sh /path/to/backup.sql.gz
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_question() {
    echo -e "${BLUE}[?]${NC} $1"
}

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_NAME=${POSTGRES_DB:-beauty_salon_db}
DB_USER=${POSTGRES_USER:-beauty_user}
CONTAINER_NAME="aurelle_db_prod"
BACKUP_DIR="./backups"

# Check if backup file is provided
if [ $# -eq 0 ]; then
    log_error "Please provide backup file to restore"
    log_info "Usage: ./restore.sh <backup_file>"
    log_info ""
    log_info "Available backups:"
    ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_info "============================================"
log_info "  DATABASE RESTORE"
log_info "============================================"
log_info "Backup file: $BACKUP_FILE"
log_info "Database: $DB_NAME"
log_info "Container: $CONTAINER_NAME"
log_info ""

# Warning
log_warn "⚠️  WARNING: This will COMPLETELY REPLACE the current database!"
log_warn "⚠️  All current data will be LOST!"
log_warn ""
log_question "Are you sure you want to continue? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled."
    exit 0
fi

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    log_error "Database container is not running!"
    log_info "Start it with: docker-compose -f docker-compose.prod.yml up -d postgres"
    exit 1
fi

# Create safety backup of current database
log_info "Creating safety backup of current database..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SAFETY_BACKUP="${BACKUP_DIR}/safety_backup_before_restore_${TIMESTAMP}.sql.gz"
mkdir -p "$BACKUP_DIR"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY_BACKUP"
log_info "Safety backup created: $SAFETY_BACKUP"

# Stop backend to prevent connections
log_info "Stopping backend service..."
docker-compose -f docker-compose.prod.yml stop backend || true

# Wait a bit
sleep 3

# Terminate existing connections
log_info "Terminating active database connections..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# Drop and recreate database
log_info "Dropping existing database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
    log_error "Failed to drop database!"
    log_info "Starting backend again..."
    docker-compose -f docker-compose.prod.yml start backend
    exit 1
}

log_info "Creating fresh database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" || {
    log_error "Failed to create database!"
    log_info "Starting backend again..."
    docker-compose -f docker-compose.prod.yml start backend
    exit 1
}

# Restore from backup
log_info "Restoring data from backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    # Compressed backup
    gunzip < "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
else
    # Uncompressed backup
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    log_info "✅ Database restored successfully!"
else
    log_error "❌ Database restore failed!"
    log_warn "Attempting to restore from safety backup..."
    gunzip < "$SAFETY_BACKUP" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"
    log_info "Starting backend again..."
    docker-compose -f docker-compose.prod.yml start backend
    exit 1
fi

# Start backend again
log_info "Starting backend service..."
docker-compose -f docker-compose.prod.yml start backend

# Wait for backend to be healthy
log_info "Waiting for backend to be ready..."
sleep 5

MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "✅ Backend is healthy!"
        break
    fi
    ATTEMPT=$((ATTEMPT+1))
    log_warn "Waiting for backend... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "Backend failed to start!"
    log_info "Check logs: docker-compose -f docker-compose.prod.yml logs backend"
    exit 1
fi

log_info "============================================"
log_info "✅ RESTORE COMPLETED SUCCESSFULLY!"
log_info "============================================"
log_info ""
log_info "Safety backup saved to: $SAFETY_BACKUP"
log_info "You can delete it if everything works fine."
log_info ""
