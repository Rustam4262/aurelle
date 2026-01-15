#!/bin/bash

# Certbot Installation Script
# Installs Certbot for Let's Encrypt SSL certificates

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Certbot Installation for AURELLE ==="
echo ""

# Step 1: Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Step 2: Update package list
echo "Step 1: Updating package list..."
apt-get update -qq
echo -e "${GREEN}✓${NC} Package list updated"
echo ""

# Step 3: Check if Certbot is already installed
echo "Step 2: Checking if Certbot is already installed..."
if command -v certbot &> /dev/null; then
    CERTBOT_VERSION=$(certbot --version 2>&1)
    echo -e "${GREEN}✓${NC} Certbot is already installed: $CERTBOT_VERSION"

    read -p "Do you want to reinstall/upgrade Certbot? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation skipped"
        exit 0
    fi
else
    echo -e "${YELLOW}⚠${NC}  Certbot is not installed"
fi
echo ""

# Step 4: Install snapd (recommended method for Certbot)
echo "Step 3: Installing/updating snapd..."
apt-get install -y snapd
systemctl enable --now snapd.socket

# Wait for snapd to initialize
sleep 3

# Ensure snap is up to date
snap install core
snap refresh core

echo -e "${GREEN}✓${NC} Snapd installed and updated"
echo ""

# Step 5: Remove old certbot installations
echo "Step 4: Removing old Certbot installations (if any)..."
apt-get remove -y certbot python3-certbot-nginx 2>/dev/null || true
snap remove certbot 2>/dev/null || true
echo -e "${GREEN}✓${NC} Old installations removed"
echo ""

# Step 6: Install Certbot via snap
echo "Step 5: Installing Certbot via snap..."
snap install --classic certbot

# Create symbolic link
ln -sf /snap/bin/certbot /usr/bin/certbot

echo -e "${GREEN}✓${NC} Certbot installed successfully"
echo ""

# Step 7: Install Nginx plugin
echo "Step 6: Installing Certbot Nginx plugin..."
snap set certbot trust-plugin-with-root=ok
snap install certbot-dns-cloudflare 2>/dev/null || true

echo -e "${GREEN}✓${NC} Certbot Nginx plugin ready"
echo ""

# Step 8: Verify installation
echo "Step 7: Verifying installation..."
if certbot --version &> /dev/null; then
    CERTBOT_VERSION=$(certbot --version 2>&1)
    echo -e "${GREEN}✓${NC} Certbot installed successfully: $CERTBOT_VERSION"
else
    echo -e "${RED}✗${NC} Certbot installation failed"
    exit 1
fi
echo ""

# Step 9: Check Nginx installation
echo "Step 8: Checking Nginx installation..."
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1)
    echo -e "${GREEN}✓${NC} Nginx is installed: $NGINX_VERSION"
else
    echo -e "${RED}✗${NC} Nginx is not installed"
    echo "Please install Nginx first: sudo apt-get install nginx"
    exit 1
fi
echo ""

echo "=== Installation Complete ==="
echo ""
echo -e "${GREEN}✓${NC} Certbot is ready to use"
echo ""
echo "Next steps:"
echo ""
echo "  1. Ensure your domains point to this server:"
echo "     - aurelle.uz → Server IP"
echo "     - www.aurelle.uz → Server IP"
echo "     - staging.aurelle.uz → Server IP"
echo ""
echo "  2. Run the SSL setup script:"
echo "     sudo bash scripts/setup-ssl.sh"
echo ""
echo "  3. Test certificate renewal:"
echo "     sudo certbot renew --dry-run"
echo ""
echo "Useful Commands:"
echo ""
echo "  View installed certificates:"
echo "    sudo certbot certificates"
echo ""
echo "  Renew certificates manually:"
echo "    sudo certbot renew"
echo ""
echo "  Revoke a certificate:"
echo "    sudo certbot revoke --cert-path /etc/letsencrypt/live/aurelle.uz/cert.pem"
echo ""
