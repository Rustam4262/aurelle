#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/var/backups/aurelle"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/aurelle_backup_$TIMESTAMP.sql"
RETENTION_DAYS=7

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Starting backup process...${NC}"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
echo -e "${BLUE}📦 Backing up database...${NC}"

# Read database credentials from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)

# Extract credentials from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')

# Perform backup
PGPASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') pg_dump -U $DB_USER -h $DB_HOST $DB_NAME > $BACKUP_FILE

# Compress backup
echo -e "${BLUE}🗜️  Compressing backup...${NC}"
gzip $BACKUP_FILE

# Delete old backups
echo -e "${BLUE}🗑️  Removing old backups (older than ${RETENTION_DAYS} days)...${NC}"
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)

echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}📁 File: $BACKUP_FILE.gz${NC}"
echo -e "${GREEN}💾 Size: $BACKUP_SIZE${NC}"

# List recent backups
echo -e "\n${BLUE}Recent backups:${NC}"
ls -lh $BACKUP_DIR/*.sql.gz | tail -5
