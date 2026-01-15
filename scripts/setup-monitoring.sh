#!/bin/bash

# Monitoring Setup Script
# Sets up all monitoring scripts and cron jobs

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_USER="${CRON_USER:-$(whoami)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== AURELLE Monitoring Setup ==="
echo ""

# Step 1: Make all scripts executable
echo "Step 1: Making monitoring scripts executable..."
chmod +x "$SCRIPT_DIR"/monitor-*.sh
chmod +x "$SCRIPT_DIR"/telegram-send.sh
echo -e "${GREEN}✓${NC} Scripts are now executable"
echo ""

# Step 2: Test Telegram notification
echo "Step 2: Testing Telegram notification..."
if bash "$SCRIPT_DIR/telegram-send.sh" info "Monitoring Setup" "Testing Telegram notifications from $(hostname)"; then
    echo -e "${GREEN}✓${NC} Telegram notification sent successfully"
else
    echo -e "${RED}✗${NC} Telegram notification failed"
    echo "Please check your Telegram bot token and chat ID"
fi
echo ""

# Step 3: Create cron jobs
echo "Step 3: Setting up cron jobs..."

# Backup existing crontab
crontab -l > /tmp/aurelle-crontab-backup-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null || true

# Create new crontab entries
cat > /tmp/aurelle-monitoring-cron.txt << EOF
# AURELLE Infrastructure Monitoring
# Auto-generated on $(date)

# Disk usage check - Every hour
0 * * * * $SCRIPT_DIR/monitor-disk.sh >> /var/log/aurelle-monitoring/disk.log 2>&1

# Memory check - Every 30 minutes
*/30 * * * * $SCRIPT_DIR/monitor-memory.sh >> /var/log/aurelle-monitoring/memory.log 2>&1

# CPU check - Every 15 minutes (checks sustained usage over 5 min)
*/15 * * * * $SCRIPT_DIR/monitor-cpu.sh >> /var/log/aurelle-monitoring/cpu.log 2>&1

# PM2 process check - Every 5 minutes
*/5 * * * * $SCRIPT_DIR/monitor-pm2.sh >> /var/log/aurelle-monitoring/pm2.log 2>&1

# Database connection check - Every 5 minutes
*/5 * * * * $SCRIPT_DIR/monitor-database.sh >> /var/log/aurelle-monitoring/database.log 2>&1

# Health endpoint check - Every 5 minutes
*/5 * * * * $SCRIPT_DIR/monitor-health.sh >> /var/log/aurelle-monitoring/health.log 2>&1

# SSL certificate check - Every day at 9 AM
0 9 * * * $SCRIPT_DIR/monitor-ssl.sh >> /var/log/aurelle-monitoring/ssl.log 2>&1

# Log cleanup - Every week on Sunday at 3 AM
0 3 * * 0 find /var/log/aurelle-monitoring -name "*.log" -mtime +30 -delete

EOF

# Combine with existing crontab
(crontab -l 2>/dev/null | grep -v "AURELLE Infrastructure Monitoring" | grep -v "aurelle-monitoring"; cat /tmp/aurelle-monitoring-cron.txt) | crontab -

echo -e "${GREEN}✓${NC} Cron jobs installed"
echo ""
echo "Cron schedule:"
echo "  - Disk usage: Every hour"
echo "  - Memory: Every 30 minutes"
echo "  - CPU: Every 15 minutes"
echo "  - PM2 processes: Every 5 minutes"
echo "  - Database: Every 5 minutes"
echo "  - Health endpoint: Every 5 minutes"
echo "  - SSL certificates: Daily at 9 AM"
echo ""

# Step 4: Create log directory
echo "Step 4: Creating log directory..."
sudo mkdir -p /var/log/aurelle-monitoring
sudo chown $CRON_USER:$CRON_USER /var/log/aurelle-monitoring
echo -e "${GREEN}✓${NC} Log directory created: /var/log/aurelle-monitoring"
echo ""

# Step 5: Run initial health check
echo "Step 5: Running initial health checks..."
echo ""

echo "Checking disk usage..."
bash "$SCRIPT_DIR/monitor-disk.sh"
echo ""

echo "Checking PM2 processes..."
bash "$SCRIPT_DIR/monitor-pm2.sh"
echo ""

echo "Checking database connection..."
bash "$SCRIPT_DIR/monitor-database.sh"
echo ""

# Step 6: Show next steps
echo "=== Setup Complete ==="
echo ""
echo "Monitoring is now active! You will receive Telegram alerts for:"
echo "  🔴 Critical: Disk > 90%, Memory > 92%, PM2 crashes, DB failures, SSL expired"
echo "  🟡 Warning: Disk > 85%, Memory > 90%, CPU > 80% (5min), SSL < 30 days"
echo "  🟢 Success: Issue recovered"
echo ""
echo "Log files location: /var/log/aurelle-monitoring/"
echo ""
echo "To view cron jobs:"
echo "  crontab -l | grep aurelle"
echo ""
echo "To view logs:"
echo "  tail -f /var/log/aurelle-monitoring/disk.log"
echo "  tail -f /var/log/aurelle-monitoring/pm2.log"
echo ""
echo "To manually run a check:"
echo "  bash $SCRIPT_DIR/monitor-disk.sh"
echo "  bash $SCRIPT_DIR/monitor-pm2.sh"
echo ""
echo "To remove monitoring:"
echo "  crontab -l | grep -v aurelle-monitoring | crontab -"
echo ""

# Send setup complete notification
bash "$SCRIPT_DIR/telegram-send.sh" success "Monitoring Setup Complete" "Infrastructure monitoring is now active on $(hostname)"

echo -e "${GREEN}✓${NC} Setup notification sent to Telegram"
