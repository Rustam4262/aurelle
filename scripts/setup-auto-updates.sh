#!/bin/bash

# Automatic Security Updates Setup Script
# Configures unattended-upgrades for automatic security updates

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Automatic Security Updates Setup for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
TELEGRAM_SCRIPT="/var/www/aurelle/scripts/telegram-send.sh"

# Step 1: Install unattended-upgrades
echo "Step 1: Checking unattended-upgrades installation..."

if ! dpkg -l | grep -q "^ii  unattended-upgrades"; then
    echo -e "${YELLOW}⚠${NC}  unattended-upgrades is not installed"
    echo ""
    read -p "Install unattended-upgrades now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "Installing unattended-upgrades..."
        apt-get update
        apt-get install -y unattended-upgrades apt-listchanges

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} unattended-upgrades installed successfully"
        else
            echo -e "${RED}✗${NC} Failed to install unattended-upgrades"
            exit 1
        fi
    else
        echo "Please install unattended-upgrades manually:"
        echo "  sudo apt-get install unattended-upgrades apt-listchanges"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} unattended-upgrades is installed"
fi
echo ""

# Step 2: Backup existing configuration
echo "Step 2: Backing up existing configuration..."

if [ -f "/etc/apt/apt.conf.d/50unattended-upgrades" ]; then
    BACKUP_FILE="/etc/apt/apt.conf.d/50unattended-upgrades.backup.$(date +%Y%m%d-%H%M%S)"
    cp /etc/apt/apt.conf.d/50unattended-upgrades "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE"
fi

if [ -f "/etc/apt/apt.conf.d/20auto-upgrades" ]; then
    BACKUP_FILE="/etc/apt/apt.conf.d/20auto-upgrades.backup.$(date +%Y%m%d-%H%M%S)"
    cp /etc/apt/apt.conf.d/20auto-upgrades "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE"
fi
echo ""

# Step 3: Configure unattended-upgrades
echo "Step 3: Configuring automatic updates..."

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
// AURELLE Automatic Updates Configuration
// Generated: by setup script

Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
    "${distro_id}:${distro_codename}-updates";
};

// Packages that should NOT be automatically upgraded
Unattended-Upgrade::Package-Blacklist {
    // "nginx";
    // "postgresql";
    // "nodejs";
};

// Automatically reboot if required
Unattended-Upgrade::Automatic-Reboot "false";

// If automatic reboot is enabled, reboot at specific time
Unattended-Upgrade::Automatic-Reboot-Time "03:00";

// Automatically reboot even if users are logged in
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";

// Remove unused dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";

// Automatically remove old kernel packages
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Send email notifications
Unattended-Upgrade::Mail "";
Unattended-Upgrade::MailReport "on-change";

// Logging
Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::SyslogFacility "daemon";

// Verbose logging for debugging
// Unattended-Upgrade::Debug "true";

// Skip updates that require a reboot
Unattended-Upgrade::InstallOnShutdown "false";

// Update package lists automatically
Update-Package-Lists "1";

// Download upgrades automatically
Download-Upgradeable-Packages "1";

// Install upgrades automatically
AutocleanInterval "7";

// Only upgrade packages, don't install new packages
Unattended-Upgrade::OnlyOnACPower "false";

// Bandwidth limit (in kb/s)
// Acquire::http::Dl-Limit "1000";
EOF

echo -e "${GREEN}✓${NC} Configuration file created: /etc/apt/apt.conf.d/50unattended-upgrades"
echo ""

# Step 4: Configure auto-upgrades schedule
echo "Step 4: Configuring update schedule..."

cat > /etc/apt/apt.conf.d/20auto-upgrades << EOF
// AURELLE Auto-Upgrades Configuration
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo -e "${GREEN}✓${NC} Configuration file created: /etc/apt/apt.conf.d/20auto-upgrades"
echo ""

# Step 5: Configure reboot policy
echo "Step 5: Configuring automatic reboot policy..."
echo ""
echo "Some updates (kernel, critical system packages) require a reboot."
echo ""
read -p "Allow automatic reboot if required? (y/N) " -r

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "Enter reboot time (HH:MM format, e.g., 03:00): " REBOOT_TIME
    REBOOT_TIME=${REBOOT_TIME:-03:00}

    sed -i 's/Unattended-Upgrade::Automatic-Reboot "false"/Unattended-Upgrade::Automatic-Reboot "true"/' /etc/apt/apt.conf.d/50unattended-upgrades
    sed -i "s/Unattended-Upgrade::Automatic-Reboot-Time \"03:00\"/Unattended-Upgrade::Automatic-Reboot-Time \"$REBOOT_TIME\"/" /etc/apt/apt.conf.d/50unattended-upgrades

    echo -e "${GREEN}✓${NC} Automatic reboot enabled at $REBOOT_TIME"
else
    echo -e "${YELLOW}⚠${NC}  Automatic reboot disabled (manual reboot required)"
fi
echo ""

# Step 6: Create reboot notification script
if [ -f "$TELEGRAM_SCRIPT" ]; then
    echo "Step 6: Creating reboot notification..."

    cat > /usr/local/bin/reboot-notify << 'EOF'
#!/bin/bash
# Notify before automatic reboot

TELEGRAM_SCRIPT="/var/www/aurelle/scripts/telegram-send.sh"

if [ -f "$TELEGRAM_SCRIPT" ]; then
    bash "$TELEGRAM_SCRIPT" "warning" "Server Reboot Required" "Server will reboot in 5 minutes for automatic updates.

Hostname: $(hostname)
Time: $(date)
Reason: Automatic security updates

Updates installed:
$(tail -50 /var/log/unattended-upgrades/unattended-upgrades.log | grep "Upgraded:")"
fi

# Wait 5 minutes before rebooting
sleep 300
EOF

    chmod +x /usr/local/bin/reboot-notify

    # Add to unattended-upgrades configuration
    if ! grep -q "reboot-notify" /etc/apt/apt.conf.d/50unattended-upgrades; then
        cat >> /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'

// Execute command before reboot
Unattended-Upgrade::Automatic-Reboot-Command "/usr/local/bin/reboot-notify";
EOF
    fi

    echo -e "${GREEN}✓${NC} Reboot notification configured"
    echo ""
fi

# Step 7: Create update notification script
if [ -f "$TELEGRAM_SCRIPT" ]; then
    echo "Step 7: Creating update notification..."

    cat > /etc/apt/apt.conf.d/51unattended-upgrades-telegram << 'EOF'
// Telegram notification for updates
DPkg::Post-Invoke {
    "if [ -f /var/log/unattended-upgrades/unattended-upgrades.log ]; then "
    "  UPDATES=$(tail -50 /var/log/unattended-upgrades/unattended-upgrades.log | grep 'Upgraded:' | tail -10); "
    "  if [ -n \"$UPDATES\" ]; then "
    "    /var/www/aurelle/scripts/telegram-send.sh 'info' 'Security Updates Installed' \"Updates applied on $(hostname):
$UPDATES\"; "
    "  fi; "
    "fi";
};
EOF

    echo -e "${GREEN}✓${NC} Update notification configured"
    echo ""
fi

# Step 8: Enable and configure apt-listchanges
echo "Step 8: Configuring apt-listchanges..."

if command -v apt-listchanges &> /dev/null; then
    # Configure to send notifications for security updates
    cat > /etc/apt/listchanges.conf << EOF
[apt]
frontend=pager
email_address=root
confirm=false
save_seen=/var/lib/apt/listchanges.db
which=news
EOF

    echo -e "${GREEN}✓${NC} apt-listchanges configured"
else
    echo -e "${YELLOW}⚠${NC}  apt-listchanges not found, skipping"
fi
echo ""

# Step 9: Test configuration
echo "Step 9: Testing configuration..."

unattended-upgrade --dry-run --debug 2>&1 | head -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓${NC} Configuration test successful"
else
    echo ""
    echo -e "${RED}✗${NC} Configuration test failed"
    echo "Check logs for details"
    exit 1
fi
echo ""

# Step 10: Enable service
echo "Step 10: Enabling unattended-upgrades service..."

systemctl enable unattended-upgrades
systemctl restart unattended-upgrades

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Service enabled and started"
else
    echo -e "${RED}✗${NC} Failed to start service"
    exit 1
fi
echo ""

# Step 11: Display status
echo "=== Automatic Security Updates Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} Automatic security updates are now enabled"
echo ""

echo "Configuration summary:"
echo ""
echo "  Update Schedule:"
echo "    ✓ Check for updates: Daily"
echo "    ✓ Download updates: Automatically"
echo "    ✓ Install updates: Automatically"
echo "    ✓ Clean old packages: Weekly"
echo ""

echo "  What gets updated:"
echo "    ✓ Security updates (high priority)"
echo "    ✓ Stable updates (low priority)"
echo "    ✓ Kernel updates"
echo "    ✓ System packages"
echo ""

echo "  Excluded packages:"
echo "    (None - all packages will be updated)"
echo "    To exclude packages, edit:"
echo "    /etc/apt/apt.conf.d/50unattended-upgrades"
echo ""

if grep -q 'Automatic-Reboot "true"' /etc/apt/apt.conf.d/50unattended-upgrades; then
    REBOOT_TIME=$(grep "Automatic-Reboot-Time" /etc/apt/apt.conf.d/50unattended-upgrades | cut -d'"' -f2)
    echo "  Automatic Reboot:"
    echo "    ✓ Enabled (if updates require reboot)"
    echo "    ✓ Time: $REBOOT_TIME"
    if [ -f "$TELEGRAM_SCRIPT" ]; then
        echo "    ✓ Telegram notification: 5 minutes before reboot"
    fi
else
    echo "  Automatic Reboot:"
    echo "    ✗ Disabled (manual reboot required)"
fi
echo ""

if [ -f "$TELEGRAM_SCRIPT" ]; then
    echo "  Notifications:"
    echo "    ✓ Telegram notifications enabled"
    echo "    ✓ Update summaries sent after installation"
fi
echo ""

echo "Log files:"
echo "  Updates log: /var/log/unattended-upgrades/unattended-upgrades.log"
echo "  DPkg log: /var/log/unattended-upgrades/unattended-upgrades-dpkg.log"
echo "  Apt history: /var/log/apt/history.log"
echo ""

echo "Useful commands:"
echo ""
echo "  View recent updates:"
echo "    sudo tail -50 /var/log/unattended-upgrades/unattended-upgrades.log"
echo ""
echo "  Check if reboot is required:"
echo "    ls /var/run/reboot-required 2>/dev/null && cat /var/run/reboot-required.pkgs"
echo ""
echo "  Run updates manually (dry-run):"
echo "    sudo unattended-upgrade --dry-run --debug"
echo ""
echo "  Run updates manually:"
echo "    sudo unattended-upgrade --debug"
echo ""
echo "  Check service status:"
echo "    sudo systemctl status unattended-upgrades"
echo ""
echo "  View pending updates:"
echo "    sudo apt list --upgradable"
echo ""
echo "  Disable automatic updates (temporary):"
echo "    sudo systemctl stop unattended-upgrades"
echo ""
echo "  Re-enable automatic updates:"
echo "    sudo systemctl start unattended-upgrades"
echo ""

# Step 12: Check for pending updates now
echo "Checking for available updates..."
apt-get update > /dev/null 2>&1
UPDATES=$(apt list --upgradable 2>/dev/null | grep -c "upgradable")

if [ "$UPDATES" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠${NC}  $UPDATES package(s) available for update"
    echo ""
    read -p "Install available updates now? (y/N) " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Running unattended-upgrade..."
        unattended-upgrade --debug
        echo ""
        echo -e "${GREEN}✓${NC} Updates completed"
    fi
else
    echo ""
    echo -e "${GREEN}✓${NC} System is up to date"
fi
echo ""

