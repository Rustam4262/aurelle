#!/bin/bash

# Backup Automation Setup Script
# Configures automated backups with cron jobs

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Backup Automation Setup for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Step 1: Create log directory
echo "Step 1: Creating log directory..."
mkdir -p /var/log/aurelle-backups
chown -R root:root /var/log/aurelle-backups
chmod 755 /var/log/aurelle-backups
echo -e "${GREEN}✓${NC} Log directory created: /var/log/aurelle-backups"
echo ""

# Step 2: Create backup directories
echo "Step 2: Creating backup directories..."
mkdir -p /var/backups/aurelle/database
mkdir -p /var/backups/aurelle/files
chown -R root:root /var/backups/aurelle
chmod 700 /var/backups/aurelle
echo -e "${GREEN}✓${NC} Backup directories created:"
echo "  - /var/backups/aurelle/database"
echo "  - /var/backups/aurelle/files"
echo ""

# Step 3: Make scripts executable
echo "Step 3: Making backup scripts executable..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

chmod +x "$SCRIPT_DIR/backup-db.sh"
chmod +x "$SCRIPT_DIR/backup-files.sh"
chmod +x "$SCRIPT_DIR/upload-to-cloud.sh"
chmod +x "$SCRIPT_DIR/restore-db.sh"
chmod +x "$SCRIPT_DIR/restore-files.sh"
chmod +x "$SCRIPT_DIR/restore-test.sh"

echo -e "${GREEN}✓${NC} Scripts are now executable"
echo ""

# Step 4: Create combined backup script
echo "Step 4: Creating combined backup script..."

cat > /usr/local/bin/aurelle-backup-all << 'EOF'
#!/bin/bash
# AURELLE Combined Backup Script
# Runs database and files backups, then uploads to cloud

LOG_FILE="/var/log/aurelle-backups/combined.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Combined Backup Started ==="

# Backup database
log "Running database backup..."
DB_BACKUP=$(/path/to/aurelle/scripts/backup-db.sh)
DB_STATUS=$?

if [ $DB_STATUS -eq 0 ]; then
    log "✓ Database backup successful: $DB_BACKUP"
else
    log "✗ Database backup failed"
fi

# Backup files
log "Running files backup..."
FILES_BACKUP=$(/path/to/aurelle/scripts/backup-files.sh)
FILES_STATUS=$?

if [ $FILES_STATUS -eq 0 ]; then
    log "✓ Files backup successful: $FILES_BACKUP"
else
    log "✗ Files backup failed"
fi

# Upload to cloud
if [ $DB_STATUS -eq 0 ] || [ $FILES_STATUS -eq 0 ]; then
    log "Uploading backups to cloud..."
    /path/to/aurelle/scripts/upload-to-cloud.sh
    UPLOAD_STATUS=$?

    if [ $UPLOAD_STATUS -eq 0 ]; then
        log "✓ Cloud upload successful"
    else
        log "✗ Cloud upload failed"
    fi
fi

log "=== Combined Backup Completed ==="
log ""
EOF

# Update script path
PROJECT_PATH=$(dirname "$SCRIPT_DIR")
sed -i "s|/path/to/aurelle|$PROJECT_PATH|g" /usr/local/bin/aurelle-backup-all

chmod +x /usr/local/bin/aurelle-backup-all
echo -e "${GREEN}✓${NC} Combined backup script created: /usr/local/bin/aurelle-backup-all"
echo ""

# Step 5: Setup cron jobs
echo "Step 5: Setting up cron jobs..."

# Backup existing crontab
crontab -l > /tmp/aurelle-backup-crontab-backup-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null || true

# Create new crontab entries
cat > /tmp/aurelle-backup-cron.txt << EOF
# AURELLE Backup Automation
# Auto-generated on $(date)

# Daily backups at 3 AM (database + files + cloud upload)
0 3 * * * /usr/local/bin/aurelle-backup-all >> /var/log/aurelle-backups/cron.log 2>&1

# Weekly restore test (Sunday at 4 AM)
0 4 * * 0 $SCRIPT_DIR/restore-test.sh >> /var/log/aurelle-backups/restore-test.log 2>&1

# Monthly cleanup of old logs (first day of month at 5 AM)
0 5 1 * * find /var/log/aurelle-backups -name "*.log" -mtime +90 -delete

EOF

# Combine with existing crontab (remove old backup entries first)
(crontab -l 2>/dev/null | grep -v "AURELLE Backup" | grep -v "aurelle-backup" | grep -v "backup-db.sh" | grep -v "backup-files.sh" | grep -v "restore-test.sh"; cat /tmp/aurelle-backup-cron.txt) | crontab -

echo -e "${GREEN}✓${NC} Cron jobs installed"
echo ""
echo -e "${BLUE}Cron schedule:${NC}"
echo "  - Daily backup: Every day at 3 AM"
echo "  - Restore test: Every Sunday at 4 AM"
echo "  - Log cleanup: First day of month at 5 AM"
echo ""

# Step 6: Show current cron jobs
echo "Step 6: Verifying cron jobs..."
echo ""
echo -e "${BLUE}Current AURELLE backup cron jobs:${NC}"
crontab -l | grep -A5 "AURELLE Backup"
echo ""

# Step 7: Test backup scripts
echo "Step 7: Would you like to run a test backup now?"
echo ""
read -p "Run test backup? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running test backup..."
    echo ""

    # Test database backup
    echo "Testing database backup..."
    bash "$SCRIPT_DIR/backup-db.sh"
    echo ""

    # Test files backup
    echo "Testing files backup..."
    bash "$SCRIPT_DIR/backup-files.sh"
    echo ""

    echo -e "${GREEN}✓${NC} Test backup completed"
    echo ""

    # Ask about cloud upload
    if [ -f "/etc/aurelle-backup.conf" ]; then
        read -p "Upload test backups to cloud? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            bash "$SCRIPT_DIR/upload-to-cloud.sh"
            echo ""
        fi
    fi
else
    echo "Skipped test backup"
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} Backup automation is now configured"
echo ""
echo "What was configured:"
echo "  1. Daily automated backups (3 AM)"
echo "     - Database backup (pg_dump + gzip)"
echo "     - Files backup (tar + gzip)"
echo "     - Cloud upload to Backblaze B2"
echo ""
echo "  2. Weekly restore testing (Sunday 4 AM)"
echo "     - Automated validation of backups"
echo "     - Telegram notification with results"
echo ""
echo "  3. Retention policies:"
echo "     - Local: 7 days"
echo "     - Cloud (B2): 90 days"
echo ""
echo "  4. Log rotation (90 days)"
echo ""
echo "Manual operations:"
echo ""
echo "  Run backup manually:"
echo "    sudo /usr/local/bin/aurelle-backup-all"
echo ""
echo "  Run database backup only:"
echo "    sudo bash $SCRIPT_DIR/backup-db.sh"
echo ""
echo "  Run files backup only:"
echo "    sudo bash $SCRIPT_DIR/backup-files.sh"
echo ""
echo "  Upload to cloud:"
echo "    sudo bash $SCRIPT_DIR/upload-to-cloud.sh"
echo ""
echo "  Test restore:"
echo "    sudo bash $SCRIPT_DIR/restore-test.sh"
echo ""
echo "  Restore database:"
echo "    sudo bash $SCRIPT_DIR/restore-db.sh [backup-file]"
echo ""
echo "  Restore files:"
echo "    sudo bash $SCRIPT_DIR/restore-files.sh [backup-file]"
echo ""
echo "  View backup logs:"
echo "    tail -f /var/log/aurelle-backups/combined.log"
echo "    tail -f /var/log/aurelle-backups/database.log"
echo "    tail -f /var/log/aurelle-backups/files.log"
echo ""
echo "  List backups:"
echo "    ls -lh /var/backups/aurelle/database/"
echo "    ls -lh /var/backups/aurelle/files/"
echo ""
echo "  View cloud backups:"
echo "    rclone ls b2:aurelle-backups/"
echo ""
echo "  View cron jobs:"
echo "    crontab -l | grep aurelle"
echo ""
