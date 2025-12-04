#!/bin/bash

# ==========================================
# DATABASE BACKUP SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
KEEP_DAYS=7  # Keep backups for 7 days

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_NAME=${POSTGRES_DB:-beauty_salon_db}
DB_USER=${POSTGRES_USER:-beauty_user}
CONTAINER_NAME="beauty_db_prod"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Starting database backup..."
log_info "Database: $DB_NAME"
log_info "Backup file: $BACKUP_FILE"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    log_error "Database container is not running!"
    exit 1
fi

# Create backup
log_info "Creating backup..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Compress backup
log_info "Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Check if backup was created successfully
if [ -f "$COMPRESSED_FILE" ]; then
    SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log_info "Backup created successfully!"
    log_info "File: $COMPRESSED_FILE"
    log_info "Size: $SIZE"
else
    log_error "Backup failed!"
    exit 1
fi

# Delete old backups
log_info "Cleaning up old backups (keeping last $KEEP_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$KEEP_DAYS -delete

# List recent backups
log_info "Recent backups:"
ls -lh "$BACKUP_DIR"/backup_*.sql.gz | tail -5

log_info "Backup completed successfully!"
