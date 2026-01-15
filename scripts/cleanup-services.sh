#!/bin/bash

# Service Cleanup Script
# Removes or disables unnecessary services to reduce attack surface

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Service Cleanup for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Step 1: Identify running services
echo "Step 1: Scanning system services..."
echo ""

# Get list of all enabled services
ENABLED_SERVICES=$(systemctl list-unit-files --type=service --state=enabled --no-pager | grep ".service" | awk '{print $1}' | sed 's/.service//')

# Services that are commonly unnecessary on a web server
POTENTIALLY_UNNECESSARY=(
    "bluetooth"
    "cups"
    "cups-browsed"
    "avahi-daemon"
    "ModemManager"
    "whoopsie"
    "apport"
    "rsync"
    "rpcbind"
    "nfs-common"
    "snapd"
)

# Services that should NEVER be disabled
CRITICAL_SERVICES=(
    "ssh"
    "sshd"
    "systemd-resolved"
    "systemd-networkd"
    "systemd-journald"
    "systemd-logind"
    "systemd-udevd"
    "cron"
    "rsyslog"
    "dbus"
    "postgresql"
    "nginx"
    "fail2ban"
    "ufw"
    "unattended-upgrades"
)

echo -e "${BLUE}Analyzing services...${NC}"
echo ""

# Services found that can be disabled
FOUND_SERVICES=()

for service in "${POTENTIALLY_UNNECESSARY[@]}"; do
    if echo "$ENABLED_SERVICES" | grep -q "^$service$"; then
        FOUND_SERVICES+=("$service")
    fi
done

if [ ${#FOUND_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No unnecessary services found"
    echo "Your system appears to be clean."
    echo ""
    exit 0
fi

echo -e "${YELLOW}Found ${#FOUND_SERVICES[@]} potentially unnecessary service(s):${NC}"
echo ""

# Display found services with descriptions
for service in "${FOUND_SERVICES[@]}"; do
    DESCRIPTION=""
    case $service in
        bluetooth)
            DESCRIPTION="Bluetooth support (not needed on server)"
            ;;
        cups|cups-browsed)
            DESCRIPTION="Printing service (not needed on server)"
            ;;
        avahi-daemon)
            DESCRIPTION="Network service discovery (not needed on server)"
            ;;
        ModemManager)
            DESCRIPTION="Modem management (not needed on server)"
            ;;
        whoopsie)
            DESCRIPTION="Ubuntu error reporting (privacy concern)"
            ;;
        apport)
            DESCRIPTION="Crash reporting (can be disabled)"
            ;;
        rsync)
            DESCRIPTION="File synchronization daemon (usually not needed as service)"
            ;;
        rpcbind)
            DESCRIPTION="RPC portmapper (only needed for NFS)"
            ;;
        nfs-common)
            DESCRIPTION="NFS client (only needed if mounting NFS shares)"
            ;;
        snapd)
            DESCRIPTION="Snap package manager (can be disabled if not using snaps)"
            ;;
    esac

    STATUS=$(systemctl is-active $service 2>/dev/null || echo "inactive")
    echo "  - $service [$STATUS]"
    echo "    $DESCRIPTION"
    echo ""
done

# Step 2: Confirm service removal
echo "Step 2: Service removal options..."
echo ""
echo -e "${YELLOW}⚠ WARNING:${NC}"
echo "  Disabling services will stop and prevent them from starting on boot."
echo "  Only disable services you're sure you don't need."
echo ""

read -p "Do you want to review and disable these services? (yes/NO) " -r
if [ "$REPLY" != "yes" ]; then
    echo "Cancelled. No changes made."
    exit 0
fi
echo ""

# Step 3: Disable services interactively
echo "Step 3: Disabling services..."
echo ""

DISABLED_COUNT=0
SKIPPED_COUNT=0

for service in "${FOUND_SERVICES[@]}"; do
    # Check if service is actually enabled
    if ! systemctl is-enabled $service &>/dev/null; then
        echo -e "${BLUE}$service${NC} - already disabled, skipping"
        continue
    fi

    echo -e "${YELLOW}Service: $service${NC}"

    # Get service description
    DESCRIPTION=$(systemctl show $service -p Description --value 2>/dev/null || echo "No description")
    echo "Description: $DESCRIPTION"

    # Check if service is currently running
    if systemctl is-active $service &>/dev/null; then
        echo "Status: Running"
    else
        echo "Status: Stopped"
    fi

    echo ""
    read -p "Disable this service? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping and disabling $service..."

        # Stop service
        systemctl stop $service 2>/dev/null

        # Disable service
        systemctl disable $service 2>/dev/null

        # Mask service (prevent from being started)
        systemctl mask $service 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} $service disabled and masked"
            DISABLED_COUNT=$((DISABLED_COUNT + 1))
        else
            echo -e "${RED}✗${NC} Failed to disable $service"
        fi
    else
        echo -e "${BLUE}⊙${NC} Skipped $service"
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    fi

    echo ""
done

# Step 4: Remove unnecessary packages (optional)
echo "Step 4: Package removal..."
echo ""
echo "Some services can be completely removed to free up space."
echo ""

REMOVABLE_PACKAGES=()

for service in "${FOUND_SERVICES[@]}"; do
    case $service in
        bluetooth)
            if dpkg -l | grep -q "^ii  bluez"; then
                REMOVABLE_PACKAGES+=("bluez")
            fi
            ;;
        cups)
            if dpkg -l | grep -q "^ii  cups"; then
                REMOVABLE_PACKAGES+=("cups" "cups-client" "cups-common")
            fi
            ;;
        avahi-daemon)
            if dpkg -l | grep -q "^ii  avahi-daemon"; then
                REMOVABLE_PACKAGES+=("avahi-daemon" "avahi-utils")
            fi
            ;;
        ModemManager)
            if dpkg -l | grep -q "^ii  modemmanager"; then
                REMOVABLE_PACKAGES+=("modemmanager")
            fi
            ;;
        whoopsie)
            if dpkg -l | grep -q "^ii  whoopsie"; then
                REMOVABLE_PACKAGES+=("whoopsie")
            fi
            ;;
        apport)
            if dpkg -l | grep -q "^ii  apport"; then
                REMOVABLE_PACKAGES+=("apport" "apport-symptoms")
            fi
            ;;
    esac
done

if [ ${#REMOVABLE_PACKAGES[@]} -gt 0 ]; then
    echo "Packages that can be removed:"
    echo ""
    for pkg in "${REMOVABLE_PACKAGES[@]}"; do
        echo "  - $pkg"
    done
    echo ""

    read -p "Remove these packages? (y/N) " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Removing packages..."
        apt-get purge -y "${REMOVABLE_PACKAGES[@]}"
        apt-get autoremove -y

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Packages removed successfully"
        else
            echo -e "${RED}✗${NC} Some packages failed to remove"
        fi
    else
        echo "Packages kept (services are disabled but packages remain)"
    fi
else
    echo "No removable packages found."
fi
echo ""

# Step 5: Check for listening ports
echo "Step 5: Checking for open ports..."
echo ""

if command -v netstat &> /dev/null; then
    LISTENING_PORTS=$(netstat -tulpn | grep LISTEN)
elif command -v ss &> /dev/null; then
    LISTENING_PORTS=$(ss -tulpn | grep LISTEN)
else
    echo -e "${YELLOW}⚠${NC}  netstat/ss not available, skipping port check"
    LISTENING_PORTS=""
fi

if [ -n "$LISTENING_PORTS" ]; then
    echo -e "${BLUE}Services listening on network ports:${NC}"
    echo ""
    echo "$LISTENING_PORTS" | awk '{print $4, $7}' | sort -u
    echo ""
    echo "Review these ports and ensure only necessary services are exposed."
fi
echo ""

# Step 6: Summary
echo "=== Service Cleanup Complete ==="
echo ""
echo "Summary:"
echo "  Services disabled: $DISABLED_COUNT"
echo "  Services skipped: $SKIPPED_COUNT"
echo ""

if [ $DISABLED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Attack surface reduced by disabling unnecessary services"
    echo ""
    echo "Disabled services:"
    for service in "${FOUND_SERVICES[@]}"; do
        if systemctl is-masked $service &>/dev/null; then
            echo "  ✓ $service"
        fi
    done
fi
echo ""

echo "Useful commands:"
echo ""
echo "  List all enabled services:"
echo "    systemctl list-unit-files --type=service --state=enabled"
echo ""
echo "  List all running services:"
echo "    systemctl list-units --type=service --state=running"
echo ""
echo "  Check service status:"
echo "    sudo systemctl status <service-name>"
echo ""
echo "  Re-enable a service (if needed):"
echo "    sudo systemctl unmask <service-name>"
echo "    sudo systemctl enable <service-name>"
echo "    sudo systemctl start <service-name>"
echo ""
echo "  View listening ports:"
echo "    sudo ss -tulpn | grep LISTEN"
echo ""

# Step 7: Security recommendations
echo "Additional security recommendations:"
echo ""
echo "  1. Review running processes:"
echo "     ps aux | grep -v '^root' | head -20"
echo ""
echo "  2. Check for unnecessary cronjobs:"
echo "     crontab -l"
echo "     ls -la /etc/cron.*/"
echo ""
echo "  3. Review installed packages:"
echo "     dpkg -l | grep '^ii' | wc -l  # Total installed"
echo "     apt list --installed | less   # Full list"
echo ""
echo "  4. Monitor system logs:"
echo "     sudo journalctl -xe"
echo "     sudo tail -f /var/log/syslog"
echo ""

