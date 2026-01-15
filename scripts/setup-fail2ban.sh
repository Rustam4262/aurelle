#!/bin/bash

# Fail2ban Setup Script
# Configures Fail2ban to protect against brute-force attacks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Fail2ban Setup for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
SSH_PORT="${SSH_PORT:-2222}"
TELEGRAM_SCRIPT="/var/www/aurelle/scripts/telegram-send.sh"

# Step 1: Install Fail2ban
echo "Step 1: Checking Fail2ban installation..."

if ! command -v fail2ban-client &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Fail2ban is not installed"
    echo ""
    read -p "Install Fail2ban now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "Installing Fail2ban..."
        apt-get update
        apt-get install -y fail2ban

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Fail2ban installed successfully"
        else
            echo -e "${RED}✗${NC} Failed to install Fail2ban"
            exit 1
        fi
    else
        echo "Please install Fail2ban manually: sudo apt-get install fail2ban"
        exit 1
    fi
else
    FAIL2BAN_VERSION=$(fail2ban-client version)
    echo -e "${GREEN}✓${NC} Fail2ban is installed: $FAIL2BAN_VERSION"
fi
echo ""

# Step 2: Detect SSH port
echo "Step 2: Detecting SSH configuration..."

SSHD_PORT=$(grep "^Port " /etc/ssh/sshd_config | awk '{print $2}')
if [ -n "$SSHD_PORT" ]; then
    SSH_PORT=$SSHD_PORT
fi

echo "SSH port detected: $SSH_PORT"
echo ""

# Step 3: Create Fail2ban local configuration
echo "Step 3: Creating Fail2ban configuration..."

# Backup existing configuration
if [ -f "/etc/fail2ban/jail.local" ]; then
    BACKUP_FILE="/etc/fail2ban/jail.local.backup.$(date +%Y%m%d-%H%M%S)"
    cp /etc/fail2ban/jail.local "$BACKUP_FILE"
    echo "Existing configuration backed up to: $BACKUP_FILE"
fi

# Create jail.local configuration
cat > /etc/fail2ban/jail.local << EOF
# AURELLE Fail2ban Configuration
# Generated: $(date)

[DEFAULT]
# Ban settings
bantime = 3600
findtime = 600
maxretry = 5

# Ban action
banaction = ufw
banaction_allports = ufw

# Email settings (disabled - using Telegram)
destemail = root@localhost
sendername = Fail2ban
mta = mail

# Action
action = %(action_)s

# Ignore local
ignoreip = 127.0.0.1/8 ::1

# ============================================
# SSH Protection
# ============================================

[sshd]
enabled = true
port = $SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
findtime = 600

[sshd-ddos]
enabled = true
port = $SSH_PORT
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
bantime = 3600
findtime = 300

# ============================================
# Web Server Protection
# ============================================

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 3600

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 3600
findtime = 600

# ============================================
# Additional Protection
# ============================================

[recidive]
# Ban repeat offenders for longer
enabled = true
filter = recidive
logpath = /var/log/fail2ban.log
bantime = 604800
findtime = 86400
maxretry = 3
EOF

echo -e "${GREEN}✓${NC} Fail2ban configuration created"
echo ""

# Step 4: Create custom filters
echo "Step 4: Creating custom filters..."

# Create nginx-limit-req filter if it doesn't exist
cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << EOF
# Fail2ban filter for nginx rate limiting
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

echo -e "${GREEN}✓${NC} Custom filters created"
echo ""

# Step 5: Create Telegram notification action (if telegram script exists)
if [ -f "$TELEGRAM_SCRIPT" ]; then
    echo "Step 5: Configuring Telegram notifications..."

    cat > /etc/fail2ban/action.d/telegram-notify.conf << 'EOF'
# Fail2ban Telegram Notification Action
[Definition]

actionstart = bash /var/www/aurelle/scripts/telegram-send.sh "warning" "Fail2ban Started" "Fail2ban has been started on <fq-hostname>"

actionstop = bash /var/www/aurelle/scripts/telegram-send.sh "info" "Fail2ban Stopped" "Fail2ban has been stopped on <fq-hostname>"

actioncheck =

actionban = bash /var/www/aurelle/scripts/telegram-send.sh "warning" "IP Banned by Fail2ban" "IP: <ip>
Jail: <name>
Failures: <failures>
Time: <time>"

actionunban = bash /var/www/aurelle/scripts/telegram-send.sh "info" "IP Unbanned by Fail2ban" "IP: <ip>
Jail: <name>
Time: <time>"

[Init]
EOF

    # Update jail.local to include telegram notifications
    sed -i 's/^action = %(action_)s$/action = %(action_)s\n         telegram-notify/' /etc/fail2ban/jail.local

    echo -e "${GREEN}✓${NC} Telegram notifications configured"
    echo ""
else
    echo "Step 5: Telegram notifications..."
    echo -e "${YELLOW}⚠${NC}  Telegram script not found at: $TELEGRAM_SCRIPT"
    echo "  Telegram notifications will not be enabled"
    echo ""
fi

# Step 6: Test configuration
echo "Step 6: Testing Fail2ban configuration..."

fail2ban-client -t 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Fail2ban configuration is valid"
else
    echo -e "${RED}✗${NC} Fail2ban configuration has errors!"
    echo ""
    echo "Please check the configuration and try again."
    exit 1
fi
echo ""

# Step 7: Enable and start Fail2ban
echo "Step 7: Starting Fail2ban service..."

systemctl enable fail2ban
systemctl restart fail2ban

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Fail2ban service started successfully"
else
    echo -e "${RED}✗${NC} Failed to start Fail2ban service"
    echo ""
    echo "Check logs: sudo journalctl -u fail2ban -n 50"
    exit 1
fi

# Wait for service to start
sleep 3
echo ""

# Step 8: Display status
echo "=== Fail2ban Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} Fail2ban is now active and protecting your server"
echo ""

echo "Active jails:"
echo ""
fail2ban-client status
echo ""

echo "Configuration summary:"
echo ""
echo "  SSH Protection:"
echo "    Port: $SSH_PORT"
echo "    Max retries: 3 attempts"
echo "    Ban time: 2 hours (7200s)"
echo "    Find time: 10 minutes (600s)"
echo ""
echo "  Web Server Protection:"
echo "    ✓ HTTP authentication failures"
echo "    ✓ No-script attempts"
echo "    ✓ Bad bot detection"
echo "    ✓ Proxy attempts"
echo "    ✓ Rate limiting violations"
echo ""
echo "  Repeat Offenders:"
echo "    ✓ Recidive jail (ban for 7 days)"
echo ""

if [ -f "$TELEGRAM_SCRIPT" ]; then
    echo "  Notifications:"
    echo "    ✓ Telegram notifications enabled"
    echo ""
fi

echo "Useful commands:"
echo ""
echo "  View all jails status:"
echo "    sudo fail2ban-client status"
echo ""
echo "  View specific jail (e.g., sshd):"
echo "    sudo fail2ban-client status sshd"
echo ""
echo "  View banned IPs:"
echo "    sudo fail2ban-client banned"
echo ""
echo "  Unban an IP:"
echo "    sudo fail2ban-client set sshd unbanip <IP_ADDRESS>"
echo ""
echo "  View fail2ban log:"
echo "    sudo tail -f /var/log/fail2ban.log"
echo ""
echo "  Reload configuration:"
echo "    sudo fail2ban-client reload"
echo ""
echo "  Test regex filters:"
echo "    sudo fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf"
echo ""

# Step 9: Test ban (optional)
echo "Test Fail2ban:"
echo ""
echo "  To test SSH protection, try failed SSH logins:"
echo "    ssh wrong_user@YOUR_SERVER_IP -p $SSH_PORT"
echo "    (Try 3+ times with wrong password)"
echo ""
echo "  Check if IP gets banned:"
echo "    sudo fail2ban-client status sshd"
echo ""

