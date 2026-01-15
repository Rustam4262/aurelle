#!/bin/bash

# SSH Hardening Script
# Secures SSH configuration: disable root login, key-only auth, change port

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== SSH Hardening for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
SSH_PORT="${SSH_PORT:-2222}"
SSH_CONFIG="/etc/ssh/sshd_config"
SSH_CONFIG_BACKUP="${SSH_CONFIG}.backup.$(date +%Y%m%d-%H%M%S)"

# Step 1: Backup current SSH configuration
echo "Step 1: Backing up SSH configuration..."
cp "$SSH_CONFIG" "$SSH_CONFIG_BACKUP"
echo -e "${GREEN}✓${NC} Backup created: $SSH_CONFIG_BACKUP"
echo ""

# Step 2: Check if SSH keys are configured for current user
echo "Step 2: Checking SSH key authentication..."

CURRENT_USER="${SUDO_USER:-$USER}"
if [ "$CURRENT_USER" = "root" ]; then
    echo -e "${YELLOW}⚠${NC}  Running as root. Please specify the user for SSH key check:"
    read -p "Username: " CURRENT_USER
fi

USER_HOME=$(eval echo "~$CURRENT_USER")
AUTHORIZED_KEYS="$USER_HOME/.ssh/authorized_keys"

if [ -f "$AUTHORIZED_KEYS" ] && [ -s "$AUTHORIZED_KEYS" ]; then
    KEY_COUNT=$(grep -c "^ssh-" "$AUTHORIZED_KEYS" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓${NC} SSH keys found for user '$CURRENT_USER': $KEY_COUNT key(s)"
    echo ""
else
    echo -e "${RED}✗${NC} No SSH keys found for user '$CURRENT_USER'"
    echo ""
    echo -e "${YELLOW}⚠ CRITICAL WARNING:${NC}"
    echo "  You must setup SSH key authentication BEFORE disabling password auth!"
    echo "  Otherwise, you will be locked out of the server."
    echo ""
    echo "To setup SSH keys:"
    echo "  1. On your local machine, generate a key (if you don't have one):"
    echo "     ssh-keygen -t ed25519 -C \"your_email@example.com\""
    echo ""
    echo "  2. Copy the key to the server:"
    echo "     ssh-copy-id -i ~/.ssh/id_ed25519.pub $CURRENT_USER@YOUR_SERVER_IP"
    echo ""
    echo "  3. Test the key authentication:"
    echo "     ssh -i ~/.ssh/id_ed25519 $CURRENT_USER@YOUR_SERVER_IP"
    echo ""
    echo "  4. Once confirmed working, re-run this script"
    echo ""
    read -p "Do you want to continue WITHOUT SSH keys? (yes/NO) " -r
    if [ "$REPLY" != "yes" ]; then
        echo "Exiting. Please setup SSH keys first."
        exit 1
    fi
    echo ""
    echo -e "${YELLOW}⚠${NC}  Proceeding WITHOUT disabling password authentication"
    SKIP_PASSWORD_DISABLE=true
fi

# Step 3: Display proposed changes
echo "Step 3: Proposed SSH hardening changes..."
echo ""
echo -e "${BLUE}Current settings → New settings:${NC}"
echo ""

# Get current values
CURRENT_PORT=$(grep "^Port " "$SSH_CONFIG" | awk '{print $2}')
CURRENT_ROOT_LOGIN=$(grep "^PermitRootLogin " "$SSH_CONFIG" | awk '{print $2}')
CURRENT_PASSWORD_AUTH=$(grep "^PasswordAuthentication " "$SSH_CONFIG" | awk '{print $2}')
CURRENT_PUBKEY_AUTH=$(grep "^PubkeyAuthentication " "$SSH_CONFIG" | awk '{print $2}')

echo "  Port: ${CURRENT_PORT:-22 (default)} → $SSH_PORT"
echo "  PermitRootLogin: ${CURRENT_ROOT_LOGIN:-yes (default)} → no"

if [ "$SKIP_PASSWORD_DISABLE" = true ]; then
    echo "  PasswordAuthentication: ${CURRENT_PASSWORD_AUTH:-yes (default)} → yes (UNCHANGED - no SSH keys)"
else
    echo "  PasswordAuthentication: ${CURRENT_PASSWORD_AUTH:-yes (default)} → no"
fi

echo "  PubkeyAuthentication: ${CURRENT_PUBKEY_AUTH:-yes (default)} → yes"
echo "  PermitEmptyPasswords: → no"
echo "  X11Forwarding: → no"
echo "  MaxAuthTries: → 3"
echo "  ClientAliveInterval: → 300"
echo "  ClientAliveCountMax: → 2"
echo "  AllowUsers: → $CURRENT_USER"
echo ""

# Step 4: Confirm changes
echo -e "${YELLOW}⚠ IMPORTANT:${NC}"
echo "  1. SSH port will change from ${CURRENT_PORT:-22} to $SSH_PORT"
echo "  2. Root login will be disabled"
if [ "$SKIP_PASSWORD_DISABLE" != true ]; then
    echo "  3. Password authentication will be disabled (SSH keys only)"
fi
echo ""
echo "Make sure you have:"
echo "  - SSH keys configured (if disabling password auth)"
echo "  - Firewall rules updated for port $SSH_PORT"
echo "  - Noted the new port for future connections"
echo ""
read -p "Continue with SSH hardening? (yes/NO) " -r
if [ "$REPLY" != "yes" ]; then
    echo "Cancelled. No changes made."
    exit 0
fi
echo ""

# Step 5: Apply hardening configurations
echo "Step 4: Applying SSH hardening..."

# Create new configuration
cat > "${SSH_CONFIG}.new" << EOF
# AURELLE SSH Hardening Configuration
# Generated: $(date)
# Backup: $SSH_CONFIG_BACKUP

# Port configuration
Port $SSH_PORT

# Authentication
PermitRootLogin no
PubkeyAuthentication yes
EOF

if [ "$SKIP_PASSWORD_DISABLE" = true ]; then
    cat >> "${SSH_CONFIG}.new" << EOF
PasswordAuthentication yes
EOF
else
    cat >> "${SSH_CONFIG}.new" << EOF
PasswordAuthentication no
EOF
fi

cat >> "${SSH_CONFIG}.new" << EOF
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security settings
X11Forwarding no
MaxAuthTries 3
MaxSessions 10
ClientAliveInterval 300
ClientAliveCountMax 2

# User restrictions
AllowUsers $CURRENT_USER

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Protocol
Protocol 2

# Host keys
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Ciphers and algorithms (strong cryptography)
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group-exchange-sha256
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256

# Subsystems
Subsystem sftp /usr/lib/openssh/sftp-server

# Banner (optional)
# Banner /etc/ssh/banner

# Override default of no subsystems
PrintMotd no
AcceptEnv LANG LC_*
EOF

# Move new configuration in place
mv "${SSH_CONFIG}.new" "$SSH_CONFIG"

echo -e "${GREEN}✓${NC} SSH configuration updated"
echo ""

# Step 6: Test configuration
echo "Step 5: Testing SSH configuration..."
sshd -t 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} SSH configuration is valid"
else
    echo -e "${RED}✗${NC} SSH configuration has errors!"
    echo ""
    echo "Restoring backup..."
    cp "$SSH_CONFIG_BACKUP" "$SSH_CONFIG"
    echo "Backup restored. Please check the errors above."
    exit 1
fi
echo ""

# Step 7: Inform about firewall
echo "Step 6: Firewall configuration..."
echo ""
echo -e "${YELLOW}⚠ IMPORTANT:${NC} Update firewall rules BEFORE restarting SSH!"
echo ""
echo "If using ufw:"
echo "  sudo ufw allow $SSH_PORT/tcp comment 'SSH'"
echo "  sudo ufw delete allow 22/tcp  # After confirming new port works"
echo ""
echo "If using iptables:"
echo "  sudo iptables -A INPUT -p tcp --dport $SSH_PORT -j ACCEPT"
echo "  sudo iptables -D INPUT -p tcp --dport 22 -j ACCEPT  # After confirming new port works"
echo ""
read -p "Have you updated firewall rules for port $SSH_PORT? (yes/NO) " -r
if [ "$REPLY" != "yes" ]; then
    echo ""
    echo -e "${RED}Please update firewall rules first!${NC}"
    echo ""
    echo "Configuration applied but SSH NOT restarted."
    echo "After updating firewall:"
    echo "  sudo systemctl restart sshd"
    echo ""
    exit 0
fi
echo ""

# Step 8: Restart SSH service
echo "Step 7: Restarting SSH service..."
echo ""
echo -e "${YELLOW}⚠ CRITICAL:${NC} SSH service will restart now."
echo "  Your current SSH session should remain active."
echo "  Open a NEW terminal and test connection BEFORE closing this session:"
echo ""
echo "  ssh -p $SSH_PORT $CURRENT_USER@YOUR_SERVER_IP"
echo ""
read -p "Restart SSH service now? (yes/NO) " -r
if [ "$REPLY" != "yes" ]; then
    echo ""
    echo "SSH configuration applied but NOT restarted."
    echo "To restart manually:"
    echo "  sudo systemctl restart sshd"
    exit 0
fi

echo ""
echo "Restarting SSH service..."
systemctl restart sshd

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} SSH service restarted successfully"
else
    echo -e "${RED}✗${NC} Failed to restart SSH service"
    echo ""
    echo "Restoring backup configuration..."
    cp "$SSH_CONFIG_BACKUP" "$SSH_CONFIG"
    systemctl restart sshd
    echo "Backup restored and SSH restarted."
    exit 1
fi

echo ""
echo "=== SSH Hardening Complete ==="
echo ""
echo -e "${GREEN}✓${NC} SSH has been hardened"
echo ""
echo "Changes applied:"
echo "  ✓ SSH port changed to: $SSH_PORT"
echo "  ✓ Root login disabled"
if [ "$SKIP_PASSWORD_DISABLE" != true ]; then
    echo "  ✓ Password authentication disabled (SSH keys only)"
fi
echo "  ✓ Weak ciphers disabled"
echo "  ✓ Connection timeout configured"
echo "  ✓ User access restricted to: $CURRENT_USER"
echo ""
echo -e "${YELLOW}⚠ NEXT STEPS (CRITICAL):${NC}"
echo ""
echo "1. Test SSH connection in a NEW terminal (DO NOT close this one):"
echo "   ssh -p $SSH_PORT $CURRENT_USER@YOUR_SERVER_IP"
echo ""
echo "2. If connection fails:"
echo "   - Restore backup: sudo cp $SSH_CONFIG_BACKUP $SSH_CONFIG"
echo "   - Restart SSH: sudo systemctl restart sshd"
echo ""
echo "3. If connection succeeds:"
echo "   - Update your SSH client config (~/.ssh/config):"
echo "     Host aurelle"
echo "       HostName YOUR_SERVER_IP"
echo "       Port $SSH_PORT"
echo "       User $CURRENT_USER"
echo "       IdentityFile ~/.ssh/id_ed25519"
echo ""
echo "4. Update firewall to remove old port 22:"
echo "   sudo ufw delete allow 22/tcp"
echo ""
echo "5. Configure Fail2ban for brute-force protection:"
echo "   sudo bash scripts/setup-fail2ban.sh"
echo ""
echo "Backup saved: $SSH_CONFIG_BACKUP"
echo ""

