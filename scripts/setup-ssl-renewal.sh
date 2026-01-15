#!/bin/bash

# SSL Certificate Auto-Renewal Setup Script
# Configures automatic renewal for Let's Encrypt certificates

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== SSL Certificate Auto-Renewal Setup ==="
echo ""

# Step 1: Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Step 2: Check if Certbot is installed
echo "Step 1: Checking Certbot installation..."
if ! command -v certbot &> /dev/null; then
    echo -e "${RED}✗${NC} Certbot is not installed"
    echo "Please run: sudo bash scripts/install-certbot.sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} Certbot is installed"
echo ""

# Step 3: Test renewal (dry run)
echo "Step 2: Testing certificate renewal (dry run)..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Renewal test successful"
else
    echo -e "${RED}✗${NC} Renewal test failed"
    echo "Please check your certificate configuration"
    exit 1
fi
echo ""

# Step 4: Create renewal script
echo "Step 3: Creating renewal script..."

cat > /usr/local/bin/certbot-renew-aurelle << 'EOF'
#!/bin/bash

# AURELLE SSL Certificate Renewal Script
# Automatically renews Let's Encrypt certificates and reloads Nginx

LOG_FILE="/var/log/certbot-renewal.log"
TELEGRAM_SCRIPT="/path/to/aurelle/scripts/telegram-send.sh"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting certificate renewal check ==="

# Run certbot renewal
/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx" 2>&1 | tee -a "$LOG_FILE"

RENEWAL_STATUS=$?

if [ $RENEWAL_STATUS -eq 0 ]; then
    log "✓ Certificate renewal check completed successfully"

    # Check if any certificates were actually renewed
    if grep -q "renewed successfully" "$LOG_FILE"; then
        log "✓ Certificates were renewed"

        # Send Telegram notification (if available)
        if [ -f "$TELEGRAM_SCRIPT" ]; then
            bash "$TELEGRAM_SCRIPT" success "SSL Certificates Renewed" "SSL certificates for aurelle.uz have been renewed successfully."
        fi
    else
        log "ℹ No certificates needed renewal (not yet due)"
    fi
else
    log "✗ Certificate renewal check failed with status: $RENEWAL_STATUS"

    # Send Telegram alert (if available)
    if [ -f "$TELEGRAM_SCRIPT" ]; then
        bash "$TELEGRAM_SCRIPT" critical "SSL Renewal Failed" "Certificate renewal failed. Please check the logs at $LOG_FILE"
    fi
fi

# Clean up old log entries (keep last 1000 lines)
tail -1000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"

log "=== Renewal check complete ==="
log ""
EOF

chmod +x /usr/local/bin/certbot-renew-aurelle
echo -e "${GREEN}✓${NC} Renewal script created: /usr/local/bin/certbot-renew-aurelle"
echo ""

# Step 5: Create cron job
echo "Step 4: Setting up cron job for daily renewal..."

# Backup existing crontab
crontab -l > /tmp/crontab-backup-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null || true

# Remove old certbot renewal entries
crontab -l 2>/dev/null | grep -v "certbot" | grep -v "letsencrypt" | crontab - 2>/dev/null || true

# Add new cron job (run daily at 3 AM and 3 PM)
(crontab -l 2>/dev/null; echo "# AURELLE SSL Certificate Renewal (twice daily)"; echo "0 3,15 * * * /usr/local/bin/certbot-renew-aurelle") | crontab -

echo -e "${GREEN}✓${NC} Cron job installed (runs twice daily: 3 AM and 3 PM)"
echo ""

# Step 6: Enable and start systemd timer (if available)
echo "Step 5: Configuring systemd timer..."

if systemctl list-unit-files | grep -q "certbot.timer"; then
    # Enable certbot timer
    systemctl enable certbot.timer
    systemctl start certbot.timer

    # Update timer to run twice daily
    mkdir -p /etc/systemd/system/certbot.timer.d

    cat > /etc/systemd/system/certbot.timer.d/override.conf << 'EOF'
[Timer]
# Run twice daily instead of default schedule
OnCalendar=
OnCalendar=03:00
OnCalendar=15:00
RandomizedDelaySec=1h
EOF

    systemctl daemon-reload
    systemctl restart certbot.timer

    echo -e "${GREEN}✓${NC} Systemd timer configured (runs twice daily)"
else
    echo -e "${YELLOW}⚠${NC}  Systemd timer not available (using cron only)"
fi
echo ""

# Step 7: Create monitoring script
echo "Step 6: Creating certificate expiration monitoring script..."

cat > /usr/local/bin/check-ssl-expiration << 'EOF'
#!/bin/bash

# SSL Certificate Expiration Check
# Monitors certificate expiration and sends alerts

DOMAINS="aurelle.uz staging.aurelle.uz"
WARNING_DAYS=30
CRITICAL_DAYS=14
TELEGRAM_SCRIPT="/path/to/aurelle/scripts/telegram-send.sh"

for domain in $DOMAINS; do
    # Get certificate expiration date
    expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -z "$expiry_date" ]; then
        echo "Failed to check certificate for $domain"
        continue
    fi

    # Convert to epoch
    expiry_epoch=$(date -d "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))

    echo "$domain: $days_until_expiry days until expiration"

    # Send alerts
    if [ $days_until_expiry -le $CRITICAL_DAYS ]; then
        if [ -f "$TELEGRAM_SCRIPT" ]; then
            bash "$TELEGRAM_SCRIPT" critical "SSL Certificate Expiring Soon" "Certificate for $domain expires in $days_until_expiry days!"
        fi
    elif [ $days_until_expiry -le $WARNING_DAYS ]; then
        if [ -f "$TELEGRAM_SCRIPT" ]; then
            bash "$TELEGRAM_SCRIPT" warning "SSL Certificate Expiring" "Certificate for $domain expires in $days_until_expiry days"
        fi
    fi
done
EOF

chmod +x /usr/local/bin/check-ssl-expiration
echo -e "${GREEN}✓${NC} Expiration monitoring script created"
echo ""

# Step 8: Add expiration check to cron (weekly)
echo "Step 7: Setting up weekly expiration checks..."

(crontab -l 2>/dev/null; echo "# AURELLE SSL Expiration Check (weekly on Monday at 9 AM)"; echo "0 9 * * 1 /usr/local/bin/check-ssl-expiration") | crontab -

echo -e "${GREEN}✓${NC} Weekly expiration check configured"
echo ""

# Step 9: Show current cron jobs
echo "Step 8: Verifying cron jobs..."
echo ""
echo -e "${BLUE}Current cron jobs:${NC}"
crontab -l | grep -A1 "AURELLE SSL"
echo ""

# Step 10: Show systemd timer status (if available)
if systemctl list-unit-files | grep -q "certbot.timer"; then
    echo -e "${BLUE}Systemd timer status:${NC}"
    systemctl status certbot.timer --no-pager | head -10
    echo ""
    echo -e "${BLUE}Next renewal time:${NC}"
    systemctl list-timers | grep certbot
    echo ""
fi

echo "=== Auto-Renewal Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} SSL certificate auto-renewal is now configured"
echo ""
echo "Renewal Schedule:"
echo "  - Automatic renewal check: Twice daily (3 AM and 3 PM)"
echo "  - Certificates renewed when < 30 days until expiration"
echo "  - Nginx automatically reloaded after renewal"
echo "  - Expiration monitoring: Weekly (Monday 9 AM)"
echo ""
echo "Manual Operations:"
echo ""
echo "  Test renewal:"
echo "    sudo certbot renew --dry-run"
echo ""
echo "  Force renewal:"
echo "    sudo certbot renew --force-renewal"
echo ""
echo "  Run renewal script manually:"
echo "    sudo /usr/local/bin/certbot-renew-aurelle"
echo ""
echo "  Check expiration:"
echo "    sudo /usr/local/bin/check-ssl-expiration"
echo ""
echo "  View renewal logs:"
echo "    tail -f /var/log/certbot-renewal.log"
echo "    tail -f /var/log/letsencrypt/letsencrypt.log"
echo ""
echo "  List certificates:"
echo "    sudo certbot certificates"
echo ""
echo "  View cron jobs:"
echo "    crontab -l | grep -i ssl"
echo ""
echo "  View systemd timer:"
echo "    systemctl status certbot.timer"
echo "    systemctl list-timers | grep certbot"
echo ""
