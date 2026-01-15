#!/bin/bash

# Backblaze B2 Setup Script
# Configures rclone for cloud backup storage

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Backblaze B2 Setup for AURELLE ==="
echo ""

# Step 1: Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Running as root. Rclone config will be created for root user."
    echo "To configure for a different user, run without sudo."
fi
echo ""

# Step 2: Check if rclone is installed
echo "Step 1: Checking rclone installation..."
if command -v rclone &> /dev/null; then
    RCLONE_VERSION=$(rclone --version | head -1)
    echo -e "${GREEN}✓${NC} Rclone is already installed: $RCLONE_VERSION"
else
    echo -e "${YELLOW}⚠${NC}  Rclone is not installed"
    echo ""
    read -p "Do you want to install rclone? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Installing rclone..."
        curl https://rclone.org/install.sh | sudo bash

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Rclone installed successfully"
        else
            echo -e "${RED}✗${NC} Failed to install rclone"
            exit 1
        fi
    else
        echo "Please install rclone manually: https://rclone.org/install/"
        exit 1
    fi
fi
echo ""

# Step 3: Provide instructions for Backblaze B2 setup
echo "Step 2: Backblaze B2 Account Setup"
echo ""
echo -e "${BLUE}Before continuing, you need:${NC}"
echo ""
echo "1. Backblaze B2 Account"
echo "   - Sign up at: https://www.backblaze.com/b2/sign-up.html"
echo "   - Free tier: 10GB storage + 1GB daily download"
echo ""
echo "2. Application Key"
echo "   - Go to: https://secure.backblaze.com/app_keys.htm"
echo "   - Click 'Add a New Application Key'"
echo "   - Name: 'aurelle-backups'"
echo "   - Allow access to: All buckets (or specific bucket)"
echo "   - Copy the 'keyID' and 'applicationKey'"
echo ""
echo "3. Bucket"
echo "   - Go to: https://secure.backblaze.com/b2_buckets.htm"
echo "   - Click 'Create a Bucket'"
echo "   - Unique Bucket Name: 'aurelle-backups' (or your choice)"
echo "   - Files: Private"
echo "   - Encryption: Disable (or enable if needed)"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Save your Application Key immediately!${NC}"
echo -e "${YELLOW}  It will only be shown once and cannot be recovered.${NC}"
echo ""

read -p "Press Enter when you have your Backblaze B2 credentials ready..."
echo ""

# Step 4: Interactive rclone configuration
echo "Step 3: Configuring rclone for Backblaze B2..."
echo ""
echo -e "${BLUE}Follow these steps:${NC}"
echo ""
echo "1. Choose 'n' for new remote"
echo "2. Name: 'b2' (or your choice)"
echo "3. Storage: Choose 'Backblaze B2' (option number may vary)"
echo "4. Account ID: Enter your Backblaze B2 'keyID'"
echo "5. Application Key: Enter your Backblaze B2 'applicationKey'"
echo "6. Hard delete: 'n' (keep deleted files in trash)"
echo "7. Advanced config: 'n'"
echo "8. Confirm: 'y'"
echo ""

read -p "Press Enter to start rclone configuration..."
echo ""

rclone config

echo ""
echo -e "${GREEN}✓${NC} Rclone configuration complete"
echo ""

# Step 5: Test connection
echo "Step 4: Testing Backblaze B2 connection..."
echo ""

# Ask for remote name
read -p "Enter the remote name you configured (default: b2): " REMOTE_NAME
REMOTE_NAME=${REMOTE_NAME:-b2}

echo ""
echo "Listing buckets..."
rclone lsd "${REMOTE_NAME}:"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓${NC} Successfully connected to Backblaze B2!"
else
    echo ""
    echo -e "${RED}✗${NC} Failed to connect to Backblaze B2"
    echo "Please check your credentials and try again"
    exit 1
fi
echo ""

# Step 6: Create backup bucket (if it doesn't exist)
echo "Step 5: Checking for backup bucket..."
BUCKET_NAME="aurelle-backups"

read -p "Enter bucket name to use (default: aurelle-backups): " INPUT_BUCKET
BUCKET_NAME=${INPUT_BUCKET:-aurelle-backups}

echo ""
echo "Checking if bucket '$BUCKET_NAME' exists..."

if rclone lsd "${REMOTE_NAME}:${BUCKET_NAME}" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Bucket '$BUCKET_NAME' exists"
else
    echo -e "${YELLOW}⚠${NC}  Bucket '$BUCKET_NAME' not found"
    echo ""
    echo "Please create the bucket manually in Backblaze B2 web interface:"
    echo "  https://secure.backblaze.com/b2_buckets.htm"
    echo ""
    echo "Or use rclone to create it:"
    echo "  rclone mkdir ${REMOTE_NAME}:${BUCKET_NAME}"
fi
echo ""

# Step 7: Create rclone configuration file for scripts
echo "Step 6: Creating rclone configuration for backup scripts..."

CONFIG_FILE="/etc/aurelle-backup.conf"
cat > "$CONFIG_FILE" << EOF
# AURELLE Backup Configuration
# Created: $(date)

# Backblaze B2 Settings
B2_REMOTE="$REMOTE_NAME"
B2_BUCKET="$BUCKET_NAME"
B2_RETENTION_DAYS="90"

# Local Backup Settings
LOCAL_BACKUP_DIR="/var/backups/aurelle"
LOCAL_RETENTION_DAYS="7"

# Database Settings
DB_NAME="aurelle"
DB_USER="postgres"

# Project Settings
PROJECT_ROOT="/var/www/aurelle"

# Notification Settings
TELEGRAM_SCRIPT="/path/to/aurelle/scripts/telegram-send.sh"
EOF

chmod 600 "$CONFIG_FILE"
echo -e "${GREEN}✓${NC} Configuration saved to: $CONFIG_FILE"
echo ""

# Step 8: Test upload
echo "Step 7: Testing upload to Backblaze B2..."
echo ""

TEST_FILE="/tmp/aurelle-backup-test-$(date +%s).txt"
echo "AURELLE Backup Test - $(date)" > "$TEST_FILE"

echo "Uploading test file..."
rclone copy "$TEST_FILE" "${REMOTE_NAME}:${BUCKET_NAME}/test/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Test upload successful"

    echo "Verifying test file..."
    if rclone ls "${REMOTE_NAME}:${BUCKET_NAME}/test/" | grep -q "$(basename "$TEST_FILE")"; then
        echo -e "${GREEN}✓${NC} Test file verified on B2"

        echo "Cleaning up test file..."
        rclone delete "${REMOTE_NAME}:${BUCKET_NAME}/test/$(basename "$TEST_FILE")"
        rm -f "$TEST_FILE"
        echo -e "${GREEN}✓${NC} Test file cleaned up"
    else
        echo -e "${RED}✗${NC} Test file not found on B2"
    fi
else
    echo -e "${RED}✗${NC} Test upload failed"
    rm -f "$TEST_FILE"
    exit 1
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} Backblaze B2 is ready for use"
echo ""
echo "Configuration:"
echo "  Remote name: $REMOTE_NAME"
echo "  Bucket: $BUCKET_NAME"
echo "  Config file: $CONFIG_FILE"
echo ""
echo "Next steps:"
echo ""
echo "  1. Test database backup with cloud upload:"
echo "     sudo bash scripts/backup-db.sh"
echo "     sudo bash scripts/upload-to-cloud.sh /var/backups/aurelle/database/aurelle_db_*.sql.gz"
echo ""
echo "  2. Setup automated backups:"
echo "     sudo bash scripts/setup-backup-automation.sh"
echo ""
echo "  3. Verify backups on Backblaze B2:"
echo "     rclone ls ${REMOTE_NAME}:${BUCKET_NAME}/"
echo ""
echo "Useful commands:"
echo ""
echo "  List files on B2:"
echo "    rclone ls ${REMOTE_NAME}:${BUCKET_NAME}/"
echo ""
echo "  Upload file to B2:"
echo "    rclone copy /path/to/file ${REMOTE_NAME}:${BUCKET_NAME}/path/"
echo ""
echo "  Download from B2:"
echo "    rclone copy ${REMOTE_NAME}:${BUCKET_NAME}/path/ /local/path/"
echo ""
echo "  Check B2 storage usage:"
echo "    rclone size ${REMOTE_NAME}:${BUCKET_NAME}/"
echo ""
echo "  Sync local to B2 (mirror):"
echo "    rclone sync /local/path/ ${REMOTE_NAME}:${BUCKET_NAME}/path/"
echo ""
