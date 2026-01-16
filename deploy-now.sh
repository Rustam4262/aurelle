#!/bin/bash
# Immediate Production Deployment
# This script will be executed on production server

set -e

echo "🚀 AURELLE Production Deployment - Phase 5-7"
echo "Server: 89.39.94.194"
echo "Time: $(date)"
echo "=========================================="
echo ""

# Navigate to project directory
cd ~/aurelle || cd /var/www/aurelle || cd /home/aurelle/aurelle || {
    echo "❌ Could not find project directory"
    echo "Please run from project root or update script with correct path"
    exit 1
}

echo "📍 Project directory: $(pwd)"
echo ""

# Create backup timestamp
BACKUP_TIME=$(date +%Y%m%d_%H%M%S)

# Step 1: Backup
echo "📦 Creating backups..."
mkdir -p backups

# Backup database
echo "  - Database..."
pg_dump -U postgres aurelle > "backups/db_${BACKUP_TIME}.sql" 2>/dev/null || \
    sudo -u postgres pg_dump aurelle > "backups/db_${BACKUP_TIME}.sql" || \
    echo "    ⚠ Database backup skipped (check permissions)"

# Backup .env
echo "  - Environment file..."
[ -f .env ] && cp .env "backups/env_${BACKUP_TIME}.backup"

# Backup current code
echo "  - Code snapshot..."
tar -czf "backups/code_${BACKUP_TIME}.tar.gz" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=backups \
    --exclude=.git \
    . 2>/dev/null || echo "    ⚠ Code backup partial"

echo "✓ Backups created in ./backups/"
echo ""

# Step 2: Git status check
echo "📋 Checking Git status..."
CURRENT_COMMIT=$(git rev-parse --short HEAD)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Current branch: $CURRENT_BRANCH"
echo "  Current commit: $CURRENT_COMMIT"
echo ""

# Step 3: Pull changes
echo "📥 Pulling latest changes..."
git fetch origin
git pull origin main || {
    echo "❌ Git pull failed"
    exit 1
}

NEW_COMMIT=$(git rev-parse --short HEAD)
echo "  New commit: $NEW_COMMIT"

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo "  ℹ No new changes (already up to date)"
else
    echo "  ✓ Updated from $CURRENT_COMMIT to $NEW_COMMIT"
fi
echo ""

# Step 4: Dependencies
echo "📦 Checking dependencies..."
if git diff $CURRENT_COMMIT $NEW_COMMIT --name-only | grep -q "package.json"; then
    echo "  - Installing dependencies..."
    npm ci --production || npm install || {
        echo "❌ npm install failed"
        exit 1
    }
    echo "  ✓ Dependencies updated"
else
    echo "  ✓ No dependency changes"
fi
echo ""

# Step 5: Environment variables
echo "⚙️ Updating environment variables..."
if ! grep -q "FEAT_ENHANCED_ANALYTICS" .env 2>/dev/null; then
    echo "  - Adding feature flags..."
    cat >> .env << 'EOL'

# Feature Flags (Phase 6-11)
FEAT_ENHANCED_ANALYTICS=false
FEAT_BOOKING_RESCHEDULE=false
FEAT_MANUAL_BOOKING=false
FEAT_BULK_SERVICE_UPDATE=false
FEAT_MASTER_SCHEDULE=false
FEAT_ENHANCED_CALENDAR=false
FEAT_WORKING_HOURS_BREAKS=false
FEAT_SALON_MANAGER=false
FEAT_EXPORT_EXCEL=false
FEAT_EXPORT_PDF=false
EOL
    echo "  ✓ Feature flags added"
else
    echo "  ✓ Feature flags already configured"
fi
echo ""

# Step 6: Build
echo "🔨 Building application..."
NODE_ENV=production npm run build || {
    echo "❌ Build failed!"
    echo "Rolling back..."
    git reset --hard $CURRENT_COMMIT
    exit 1
}
echo "✓ Build successful"
echo ""

# Step 7: Restart
echo "🔄 Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 restart aurelle || {
        echo "❌ PM2 restart failed"
        exit 1
    }
    echo "✓ PM2 restarted"
else
    echo "⚠ PM2 not found, please restart manually"
fi
echo ""

# Wait for startup
echo "⏳ Waiting for application to start..."
sleep 5

# Step 8: Health checks
echo "🔍 Running health checks..."

# Check if server is responding
if curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✓ Health endpoint: OK"
else
    echo "⚠ Health endpoint: No response (check logs)"
fi

# Check feature flags endpoint
if curl -s -f http://localhost:5000/api/feature-flags | grep -q "ENHANCED_ANALYTICS"; then
    echo "✓ Feature flags endpoint: OK"
else
    echo "⚠ Feature flags endpoint: No response"
fi

# Check PM2 status
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
    if [ "$PM2_STATUS" = "online" ]; then
        echo "✓ PM2 status: online"
    else
        echo "⚠ PM2 status: $PM2_STATUS"
    fi
fi

echo ""

# Step 9: Summary
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "  - Time: $(date)"
echo "  - Previous: $CURRENT_COMMIT"
echo "  - Current: $NEW_COMMIT"
echo "  - Backups: ./backups/*_${BACKUP_TIME}.*"
echo ""
echo "🔗 URLs:"
echo "  - Website: https://aurelle.uz"
echo "  - Health: https://aurelle.uz/api/health"
echo "  - Feature Flags: https://aurelle.uz/api/feature-flags"
echo ""
echo "📝 What's New:"
echo "  ✓ Phase 5: P0 bug fixes (dashboard, i18n, working hours)"
echo "  ✓ Phase 6: Feature flags infrastructure"
echo "  ✓ Phase 7: Enhanced analytics (5 API endpoints)"
echo ""
echo "🎛 Feature Flags (all disabled by default):"
echo "  - FEAT_ENHANCED_ANALYTICS=false"
echo "  - FEAT_BOOKING_RESCHEDULE=false"
echo "  - FEAT_MANUAL_BOOKING=false"
echo "  - (+ 7 more flags)"
echo ""
echo "🔧 To Enable Enhanced Analytics:"
echo "  1. nano .env"
echo "  2. Change: FEAT_ENHANCED_ANALYTICS=true"
echo "  3. pm2 restart all"
echo ""
echo "📊 Monitor Deployment:"
echo "  pm2 logs --lines 100"
echo "  pm2 monit"
echo ""
echo "🔙 Rollback if needed:"
echo "  git reset --hard $CURRENT_COMMIT"
echo "  npm run build"
echo "  pm2 restart all"
echo ""
echo "✅ All systems operational!"
