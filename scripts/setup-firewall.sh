#!/bin/bash

# Firewall Setup Script (UFW)
# Configures firewall rules for AURELLE server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Firewall Setup (UFW) for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
SSH_PORT="${SSH_PORT:-2222}"
HTTP_PORT="80"
HTTPS_PORT="443"

# Step 1: Check if UFW is installed
echo "Step 1: Checking UFW installation..."

if ! command -v ufw &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  UFW is not installed"
    echo ""
    read -p "Install UFW now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Installing UFW..."
        apt-get update
        apt-get install -y ufw

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} UFW installed successfully"
        else
            echo -e "${RED}✗${NC} Failed to install UFW"
            exit 1
        fi
    else
        echo "Please install UFW manually: sudo apt-get install ufw"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} UFW is installed"
fi
echo ""

# Step 2: Check current UFW status
echo "Step 2: Checking current firewall status..."

UFW_STATUS=$(ufw status | head -1 | awk '{print $2}')
echo "Current status: $UFW_STATUS"

if [ "$UFW_STATUS" = "active" ]; then
    echo ""
    echo -e "${YELLOW}⚠${NC}  UFW is currently active with existing rules"
    echo ""
    echo "Current rules:"
    ufw status numbered
    echo ""
    read -p "Reset and reconfigure firewall? (yes/NO) " -r
    if [ "$REPLY" != "yes" ]; then
        echo "Keeping existing rules. Exiting."
        exit 0
    fi
fi
echo ""

# Step 3: Display proposed firewall rules
echo "Step 3: Proposed firewall configuration..."
echo ""
echo -e "${BLUE}Rules to be configured:${NC}"
echo ""
echo "  ✓ ALLOW: SSH (port $SSH_PORT/tcp)"
echo "  ✓ ALLOW: HTTP (port $HTTP_PORT/tcp)"
echo "  ✓ ALLOW: HTTPS (port $HTTPS_PORT/tcp)"
echo "  ✗ DENY: All other incoming traffic"
echo "  ✓ ALLOW: All outgoing traffic"
echo ""
echo -e "${BLUE}Default policies:${NC}"
echo "  - Incoming: DENY (default)"
echo "  - Outgoing: ALLOW (default)"
echo "  - Routed: DENY (default)"
echo ""

# Step 4: Confirm SSH port
echo "Step 4: SSH port verification..."
echo ""
echo -e "${YELLOW}⚠ CRITICAL:${NC} Verify your SSH port is correct!"
echo ""
echo "  Current setting: Port $SSH_PORT"
echo ""

# Try to detect actual SSH port
SSHD_PORT=$(grep "^Port " /etc/ssh/sshd_config | awk '{print $2}')
if [ -n "$SSHD_PORT" ] && [ "$SSHD_PORT" != "$SSH_PORT" ]; then
    echo -e "${YELLOW}⚠${NC}  SSH config shows port: $SSHD_PORT (different from default $SSH_PORT)"
    echo ""
    read -p "Use port $SSHD_PORT instead? (Y/n) " -r
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        SSH_PORT=$SSHD_PORT
        echo "Using SSH port: $SSH_PORT"
    fi
fi

echo ""
read -p "Is SSH port $SSH_PORT correct? (Y/n) " -r
if [[ $REPLY =~ ^[Nn]$ ]]; then
    read -p "Enter correct SSH port: " CUSTOM_SSH_PORT
    if [[ "$CUSTOM_SSH_PORT" =~ ^[0-9]+$ ]]; then
        SSH_PORT=$CUSTOM_SSH_PORT
        echo "Using SSH port: $SSH_PORT"
    else
        echo -e "${RED}✗${NC} Invalid port number"
        exit 1
    fi
fi
echo ""

# Step 5: Warning
echo -e "${RED}⚠ WARNING:${NC}"
echo ""
echo "  If you set the wrong SSH port, you will be LOCKED OUT!"
echo ""
echo "  Current SSH connection: Port $(netstat -tnlp 2>/dev/null | grep sshd | awk '{print $4}' | cut -d':' -f2 | head -1 || echo 'unknown')"
echo "  Configured SSH port: $SSH_PORT"
echo ""
read -p "Continue with firewall configuration? (yes/NO) " -r
if [ "$REPLY" != "yes" ]; then
    echo "Cancelled. No changes made."
    exit 0
fi
echo ""

# Step 6: Disable UFW (to safely configure)
echo "Step 5: Preparing firewall configuration..."

if [ "$UFW_STATUS" = "active" ]; then
    echo "Disabling UFW temporarily..."
    ufw --force disable
fi

# Step 7: Reset UFW rules
echo "Resetting all rules..."
yes | ufw reset > /dev/null 2>&1

echo -e "${GREEN}✓${NC} Firewall reset complete"
echo ""

# Step 8: Set default policies
echo "Step 6: Setting default policies..."

ufw default deny incoming
ufw default allow outgoing
ufw default deny routed

echo -e "${GREEN}✓${NC} Default policies set"
echo ""

# Step 9: Add firewall rules
echo "Step 7: Adding firewall rules..."

# SSH
echo "  Adding SSH rule (port $SSH_PORT)..."
ufw allow $SSH_PORT/tcp comment 'SSH'

# HTTP
echo "  Adding HTTP rule (port $HTTP_PORT)..."
ufw allow $HTTP_PORT/tcp comment 'HTTP'

# HTTPS
echo "  Adding HTTPS rule (port $HTTPS_PORT)..."
ufw allow $HTTPS_PORT/tcp comment 'HTTPS'

echo -e "${GREEN}✓${NC} Firewall rules added"
echo ""

# Step 10: Additional rules (optional)
echo "Step 8: Optional additional rules..."
echo ""
read -p "Allow PostgreSQL access from localhost only? (y/N) " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ufw allow from 127.0.0.1 to any port 5432 comment 'PostgreSQL localhost'
    echo -e "${GREEN}✓${NC} PostgreSQL localhost rule added"
fi

echo ""
read -p "Allow ping (ICMP) for monitoring? (Y/n) " -r
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    ufw allow from any to any proto icmp comment 'ICMP ping'
    echo -e "${GREEN}✓${NC} ICMP (ping) rule added"
fi

echo ""

# Step 11: Review rules before enabling
echo "Step 9: Reviewing firewall configuration..."
echo ""
echo -e "${BLUE}Configured rules:${NC}"
echo ""
ufw show added | grep -v "^$"
echo ""

read -p "Enable firewall with these rules? (yes/NO) " -r
if [ "$REPLY" != "yes" ]; then
    echo ""
    echo "Firewall configured but NOT enabled."
    echo "To enable manually: sudo ufw enable"
    exit 0
fi
echo ""

# Step 12: Enable UFW
echo "Step 10: Enabling firewall..."
echo ""
echo -e "${RED}⚠ IMPORTANT:${NC} Keep this terminal open!"
echo "  Test SSH connection in a NEW terminal before closing this one."
echo ""
read -p "Press Enter to enable firewall..." -r
echo ""

yes | ufw enable

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Firewall enabled successfully"
else
    echo -e "${RED}✗${NC} Failed to enable firewall"
    exit 1
fi

echo ""

# Step 13: Display final status
echo "=== Firewall Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} UFW firewall is now active and configured"
echo ""
echo "Current firewall status:"
echo ""
ufw status verbose
echo ""

echo "Allowed services:"
echo "  ✓ SSH (port $SSH_PORT)"
echo "  ✓ HTTP (port $HTTP_PORT)"
echo "  ✓ HTTPS (port $HTTPS_PORT)"
echo ""

echo -e "${YELLOW}⚠ NEXT STEPS (CRITICAL):${NC}"
echo ""
echo "1. Test SSH connection in a NEW terminal (DO NOT close this one):"
echo "   ssh -p $SSH_PORT YOUR_USER@YOUR_SERVER_IP"
echo ""
echo "2. If connection fails:"
echo "   - Disable firewall: sudo ufw disable"
echo "   - Check SSH port: sudo grep '^Port' /etc/ssh/sshd_config"
echo "   - Reconfigure firewall with correct port"
echo ""
echo "3. If connection succeeds:"
echo "   - You can safely close this terminal"
echo "   - Setup Fail2ban for brute-force protection:"
echo "     sudo bash scripts/setup-fail2ban.sh"
echo ""
echo "Useful commands:"
echo "  - View status: sudo ufw status verbose"
echo "  - View numbered rules: sudo ufw status numbered"
echo "  - Delete rule: sudo ufw delete [number]"
echo "  - Disable firewall: sudo ufw disable"
echo "  - Reload firewall: sudo ufw reload"
echo ""

# Step 14: Enable logging
echo "Enabling firewall logging..."
ufw logging on
echo -e "${GREEN}✓${NC} Firewall logging enabled"
echo ""
echo "View firewall logs:"
echo "  sudo tail -f /var/log/ufw.log"
echo ""

