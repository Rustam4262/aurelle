#!/bin/bash

# ==========================================
# DATABASE RESTORE SCRIPT
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

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_NAME=${POSTGRES_DB:-beauty_salon_db}
DB_USER=${POSTGRES_USER:-beauty_user}
CONTAINER_NAME="beauty_db_prod"
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

# Warning
log_warn "==========================================

"
log_warn "WARNING: This will OVERWRITE the current database!"
log_warn "Database: $DB_NAME"
log_warn "Backup file: $BACKUP_FILE"
log_warn ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

# Create backup of current database before restore
log_info "Creating backup of current database before restore..."
./deploy/scripts/backup.sh

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    log_error "Database container is not running!"
    exit 1
fi

# Decompress if needed
TEMP_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Decompressing backup..."
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
fi

# Restore database
log_info "Restoring database..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$TEMP_FILE"

# Clean up temp file if it was decompressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    rm -f "$TEMP_FILE"
fi

log_info "Database restored successfully!"
log_info "Please restart the backend service:"
log_info "  docker-compose -f docker-compose.prod.yml restart backend"
