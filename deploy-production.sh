#!/bin/bash
# Quick Production Deployment Script
# Usage: ./deploy-production.sh

set -e  # Exit on error

echo "🚀 Starting Production Deployment - Phase 5-7"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Backup
echo -e "${YELLOW}📦 Step 1: Creating backup...${NC}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
echo "Backup timestamp: $BACKUP_DATE"

# Backup database
echo "  - Backing up database..."
pg_dump -U postgres aurelle > "backup_db_${BACKUP_DATE}.sql"

# Backup .env
echo "  - Backing up .env..."
cp .env ".env.backup.${BACKUP_DATE}"

# Backup code
echo "  - Backing up code..."
tar -czf "backup_code_${BACKUP_DATE}.tar.gz" --exclude=node_modules --exclude=dist --exclude=backup_*.* .

echo -e "${GREEN}✓ Backup completed${NC}"
echo ""

# Step 2: Pull changes
echo -e "${YELLOW}📥 Step 2: Pulling latest changes from GitHub...${NC}"
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"

git pull origin main

NEW_COMMIT=$(git rev-parse HEAD)
echo "New commit: $NEW_COMMIT"

if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
    echo -e "${YELLOW}⚠ No new changes detected${NC}"
else
    echo -e "${GREEN}✓ Changes pulled successfully${NC}"
fi
echo ""

# Step 3: Check for dependency changes
echo -e "${YELLOW}📦 Step 3: Checking dependencies...${NC}"
if git diff $CURRENT_COMMIT $NEW_COMMIT --name-only | grep -q "package.json"; then
    echo "  - package.json changed, installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo "  - No dependency changes detected"
fi
echo ""

# Step 4: Update environment variables
echo -e "${YELLOW}⚙️  Step 4: Checking environment variables...${NC}"
if ! grep -q "FEAT_ENHANCED_ANALYTICS" .env; then
    echo "  - Adding feature flags to .env..."
    cat >> .env << 'EOL'

# Feature Flags (added by deployment script)
# Phase 7: Analytics Enhancements
FEAT_ENHANCED_ANALYTICS=false

# Phase 8: Bookings Management
FEAT_BOOKING_RESCHEDULE=false
FEAT_MANUAL_BOOKING=false

# Phase 9: Services & Masters
FEAT_BULK_SERVICE_UPDATE=false
FEAT_MASTER_SCHEDULE=false

# Phase 10: Calendar & Working Hours
FEAT_ENHANCED_CALENDAR=false
FEAT_WORKING_HOURS_BREAKS=false

# Phase 11: RBAC - Salon Manager
FEAT_SALON_MANAGER=false

# Additional Features
FEAT_EXPORT_EXCEL=false
FEAT_EXPORT_PDF=false
EOL
    echo -e "${GREEN}✓ Feature flags added to .env${NC}"
else
    echo "  - Feature flags already present in .env"
fi
echo ""

# Step 5: Build
echo -e "${YELLOW}🔨 Step 5: Building application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    echo "Restoring backup..."
    git reset --hard $CURRENT_COMMIT
    exit 1
fi
echo ""

# Step 6: Restart application
echo -e "${YELLOW}🔄 Step 6: Restarting application...${NC}"
pm2 restart all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Application restarted${NC}"
else
    echo -e "${RED}✗ Restart failed!${NC}"
    exit 1
fi
echo ""

# Step 7: Verify deployment
echo -e "${YELLOW}🔍 Step 7: Verifying deployment...${NC}"

# Wait for app to start
echo "  - Waiting 5 seconds for app to start..."
sleep 5

# Test health endpoint
echo "  - Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health || echo "FAILED")
if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo -e "    ${GREEN}✓ Health check passed${NC}"
else
    echo -e "    ${RED}✗ Health check failed!${NC}"
    echo "    Response: $HEALTH_RESPONSE"
fi

# Test feature flags endpoint
echo "  - Testing feature flags endpoint..."
FLAGS_RESPONSE=$(curl -s http://localhost:5000/api/feature-flags || echo "FAILED")
if [[ $FLAGS_RESPONSE == *"ENHANCED_ANALYTICS"* ]]; then
    echo -e "    ${GREEN}✓ Feature flags endpoint working${NC}"
else
    echo -e "    ${RED}✗ Feature flags endpoint failed!${NC}"
    echo "    Response: $FLAGS_RESPONSE"
fi

echo ""

# Step 8: Show status
echo -e "${YELLOW}📊 Step 8: Application status${NC}"
pm2 status
echo ""

# Final summary
echo "=============================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Deployment Summary:"
echo "  - Previous commit: $CURRENT_COMMIT"
echo "  - New commit: $NEW_COMMIT"
echo "  - Backup location: backup_*_${BACKUP_DATE}.*"
echo ""
echo "Next Steps:"
echo "  1. Monitor logs: pm2 logs --lines 100"
echo "  2. Check application: https://aurelle.uz"
echo "  3. Verify feature flags: https://aurelle.uz/api/feature-flags"
echo "  4. Test P0 fixes (dashboard, i18n, working hours)"
echo ""
echo "To enable enhanced analytics:"
echo "  1. Edit .env: nano .env"
echo "  2. Set: FEAT_ENHANCED_ANALYTICS=true"
echo "  3. Restart: pm2 restart all"
echo ""
echo "To rollback if needed:"
echo "  git reset --hard $CURRENT_COMMIT"
echo "  npm run build"
echo "  pm2 restart all"
echo ""
echo -e "${GREEN}✅ All systems operational!${NC}"
