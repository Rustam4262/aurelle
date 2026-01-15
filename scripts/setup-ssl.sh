#!/bin/bash

# SSL Certificate Setup Script
# Obtains and configures Let's Encrypt SSL certificates for AURELLE

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAINS="${DOMAINS:-aurelle.uz www.aurelle.uz}"
STAGING_DOMAIN="${STAGING_DOMAIN:-staging.aurelle.uz}"
EMAIL="${SSL_EMAIL:-admin@aurelle.uz}"
WEBROOT="/var/www/html"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== SSL Certificate Setup for AURELLE ==="
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Production Domains: $DOMAINS"
echo "  Staging Domain: $STAGING_DOMAIN"
echo "  Email: $EMAIL"
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

# Step 3: Check if Nginx is installed and running
echo "Step 2: Checking Nginx status..."
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}✗${NC} Nginx is not installed"
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    echo -e "${YELLOW}⚠${NC}  Nginx is not running, starting..."
    systemctl start nginx
fi
echo -e "${GREEN}✓${NC} Nginx is running"
echo ""

# Step 4: Verify DNS resolution
echo "Step 3: Verifying DNS resolution..."

verify_dns() {
    local domain="$1"
    echo -n "  Checking $domain... "

    # Try to resolve the domain
    if host "$domain" &> /dev/null; then
        local ip=$(host "$domain" | grep "has address" | awk '{print $4}' | head -1)
        echo -e "${GREEN}✓${NC} Resolved to: $ip"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to resolve"
        return 1
    fi
}

DNS_OK=true
for domain in $DOMAINS $STAGING_DOMAIN; do
    if ! verify_dns "$domain"; then
        DNS_OK=false
    fi
done

if [ "$DNS_OK" = false ]; then
    echo ""
    echo -e "${RED}✗${NC} DNS resolution failed for some domains"
    echo "Please ensure all domains point to this server before continuing"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 5: Create temporary Nginx configuration for HTTP challenge
echo "Step 4: Creating temporary Nginx configuration for HTTP challenge..."

# Backup existing configurations
mkdir -p /etc/nginx/backups
if [ -f "$NGINX_AVAILABLE/aurelle" ]; then
    cp "$NGINX_AVAILABLE/aurelle" "/etc/nginx/backups/aurelle.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Create temporary HTTP-only configuration
cat > "$NGINX_AVAILABLE/aurelle-http-temp" << 'EOF'
# Temporary HTTP configuration for Let's Encrypt challenge
server {
    listen 80;
    listen [::]:80;

    server_name aurelle.uz www.aurelle.uz;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Temporary: allow access to root for validation
    location / {
        root /var/www/html;
        try_files $uri $uri/ =404;
    }
}

server {
    listen 80;
    listen [::]:80;

    server_name staging.aurelle.uz;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    location / {
        root /var/www/html;
        try_files $uri $uri/ =404;
    }
}
EOF

# Enable temporary configuration
ln -sf "$NGINX_AVAILABLE/aurelle-http-temp" "$NGINX_ENABLED/aurelle-http-temp"

# Remove old SSL config if exists
rm -f "$NGINX_ENABLED/aurelle" 2>/dev/null || true

# Test and reload Nginx
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Nginx configuration test failed"
    exit 1
fi

systemctl reload nginx
echo -e "${GREEN}✓${NC} Temporary Nginx configuration active"
echo ""

# Step 6: Obtain SSL certificates for production domains
echo "Step 5: Obtaining SSL certificate for production domains..."
echo "  Domains: $DOMAINS"
echo ""

# Build domain arguments
DOMAIN_ARGS=""
for domain in $DOMAINS; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $domain"
done

# Request certificate
certbot certonly \
    --webroot \
    -w "$WEBROOT" \
    $DOMAIN_ARGS \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Production SSL certificate obtained successfully"
else
    echo -e "${RED}✗${NC} Failed to obtain production SSL certificate"
    echo "Please check the error messages above"
    exit 1
fi
echo ""

# Step 7: Obtain SSL certificate for staging
echo "Step 6: Obtaining SSL certificate for staging domain..."
echo "  Domain: $STAGING_DOMAIN"
echo ""

certbot certonly \
    --webroot \
    -w "$WEBROOT" \
    -d "$STAGING_DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Staging SSL certificate obtained successfully"
else
    echo -e "${YELLOW}⚠${NC}  Failed to obtain staging SSL certificate (non-critical)"
fi
echo ""

# Step 8: Configure Nginx for HTTPS
echo "Step 7: Configuring Nginx for HTTPS..."

# Copy HTTPS configuration template
if [ -f "$SCRIPT_DIR/../configs/nginx-https.conf" ]; then
    cp "$SCRIPT_DIR/../configs/nginx-https.conf" "$NGINX_AVAILABLE/aurelle"
    echo -e "${GREEN}✓${NC} HTTPS configuration installed"
else
    echo -e "${YELLOW}⚠${NC}  HTTPS configuration template not found, using Certbot default"
fi

# Remove temporary configuration
rm -f "$NGINX_ENABLED/aurelle-http-temp"
rm -f "$NGINX_AVAILABLE/aurelle-http-temp"

# Enable HTTPS configuration
ln -sf "$NGINX_AVAILABLE/aurelle" "$NGINX_ENABLED/aurelle"

# Test Nginx configuration
nginx -t
if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Nginx configuration test failed"
    echo "Restoring backup..."
    rm -f "$NGINX_ENABLED/aurelle"
    exit 1
fi

# Reload Nginx
systemctl reload nginx
echo -e "${GREEN}✓${NC} Nginx reloaded with HTTPS configuration"
echo ""

# Step 9: Verify SSL certificates
echo "Step 8: Verifying SSL certificates..."

CERT_DIR="/etc/letsencrypt/live"
PRIMARY_DOMAIN=$(echo $DOMAINS | awk '{print $1}')

if [ -d "$CERT_DIR/$PRIMARY_DOMAIN" ]; then
    echo -e "${GREEN}✓${NC} Production certificate location: $CERT_DIR/$PRIMARY_DOMAIN"

    # Show certificate details
    echo ""
    echo -e "${BLUE}Certificate Details:${NC}"
    openssl x509 -in "$CERT_DIR/$PRIMARY_DOMAIN/cert.pem" -noout -text | grep -A2 "Validity"
    openssl x509 -in "$CERT_DIR/$PRIMARY_DOMAIN/cert.pem" -noout -text | grep "Subject:"
    openssl x509 -in "$CERT_DIR/$PRIMARY_DOMAIN/cert.pem" -noout -text | grep -A1 "Subject Alternative Name"
fi
echo ""

# Step 10: Test certificate renewal
echo "Step 9: Testing automatic renewal..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Certificate renewal test successful"
else
    echo -e "${YELLOW}⚠${NC}  Certificate renewal test failed (check configuration)"
fi
echo ""

# Step 11: Setup auto-renewal cron job
echo "Step 10: Setting up automatic renewal cron job..."

# Create renewal script
cat > /etc/cron.daily/certbot-renew << 'EOF'
#!/bin/bash
# Certbot renewal script
# Runs daily to check and renew certificates

/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"

# Log renewal attempts
if [ $? -eq 0 ]; then
    echo "[$(date)] Certificate renewal check completed successfully" >> /var/log/certbot-renewal.log
else
    echo "[$(date)] Certificate renewal check failed" >> /var/log/certbot-renewal.log
fi
EOF

chmod +x /etc/cron.daily/certbot-renew

echo -e "${GREEN}✓${NC} Auto-renewal cron job created: /etc/cron.daily/certbot-renew"
echo ""

# Step 12: Create systemd timer (alternative to cron)
echo "Step 11: Creating systemd renewal timer..."

# Check if certbot timer exists
if systemctl list-timers | grep -q certbot; then
    echo -e "${GREEN}✓${NC} Certbot systemd timer already exists"
else
    # Enable certbot timer if available
    systemctl enable certbot.timer 2>/dev/null || echo -e "${YELLOW}⚠${NC}  Certbot timer not available (using cron instead)"
fi
echo ""

echo "=== SSL Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} SSL certificates obtained and configured"
echo ""
echo "Certificate Information:"
certbot certificates
echo ""
echo "Next Steps:"
echo ""
echo "  1. Test your site:"
echo "     https://aurelle.uz"
echo "     https://www.aurelle.uz"
echo "     https://staging.aurelle.uz"
echo ""
echo "  2. Check SSL rating (wait 2-3 minutes after first test):"
echo "     https://www.ssllabs.com/ssltest/analyze.html?d=aurelle.uz"
echo ""
echo "  3. Verify auto-renewal:"
echo "     sudo certbot renew --dry-run"
echo ""
echo "  4. View certificate details:"
echo "     sudo certbot certificates"
echo ""
echo "  5. Monitor renewal logs:"
echo "     tail -f /var/log/letsencrypt/letsencrypt.log"
echo "     tail -f /var/log/certbot-renewal.log"
echo ""
echo "Certificate Renewal:"
echo "  - Automatic: Daily check via cron/systemd timer"
echo "  - Manual: sudo certbot renew"
echo "  - Certificates valid for 90 days, auto-renewed at 30 days"
echo ""
