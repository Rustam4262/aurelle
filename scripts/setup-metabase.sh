#!/bin/bash

# Metabase Installation Script for AURELLE
# Installs and configures Metabase for analytics dashboards

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Metabase Installation for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
METABASE_VERSION="${METABASE_VERSION:-v0.48.0}"
METABASE_DIR="/opt/metabase"
METABASE_JAR="$METABASE_DIR/metabase.jar"
METABASE_PORT="3000"
METABASE_DOMAIN="${METABASE_DOMAIN:-metrics.aurelle.uz}"
METABASE_DB_NAME="metabase_db"
METABASE_DB_USER="metabase_user"
METABASE_DB_PASSWORD=$(openssl rand -base64 32)

LOG_FILE="/var/log/metabase-setup.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Metabase Installation Started ==="

# Step 1: Check prerequisites
echo -e "${BLUE}Step 1/10:${NC} Checking prerequisites..."

# Check PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    echo -e "${RED}✗${NC} PostgreSQL is not running"
    log "ERROR: PostgreSQL is not running"
    exit 1
fi

echo -e "${GREEN}✓${NC} PostgreSQL is running"

# Check available disk space (need at least 2GB)
AVAILABLE_SPACE=$(df -BG /opt | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 2 ]; then
    echo -e "${RED}✗${NC} Insufficient disk space. Need at least 2GB, available: ${AVAILABLE_SPACE}GB"
    exit 1
fi

echo -e "${GREEN}✓${NC} Sufficient disk space: ${AVAILABLE_SPACE}GB"

# Step 2: Install Java 11
echo ""
echo -e "${BLUE}Step 2/10:${NC} Installing Java 11..."

if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
    if [ "$JAVA_VERSION" -ge 11 ]; then
        echo -e "${GREEN}✓${NC} Java $JAVA_VERSION is already installed"
        log "Java $JAVA_VERSION already installed"
    else
        echo -e "${YELLOW}⚠${NC} Java version is too old, installing Java 11..."
        apt-get update
        apt-get install -y openjdk-11-jre-headless
    fi
else
    apt-get update
    apt-get install -y openjdk-11-jre-headless
fi

# Verify Java installation
if ! command -v java &> /dev/null; then
    echo -e "${RED}✗${NC} Java installation failed"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
echo -e "${GREEN}✓${NC} Java $JAVA_VERSION installed"
log "Java $JAVA_VERSION installed"

# Step 3: Create Metabase PostgreSQL database
echo ""
echo -e "${BLUE}Step 3/10:${NC} Creating Metabase database..."

# Load main database credentials
if [ -f "/etc/aurelle-db.conf" ]; then
    source /etc/aurelle-db.conf
    POSTGRES_USER="$DB_USER"
    POSTGRES_PASSWORD="$DB_PASSWORD"
else
    echo -e "${YELLOW}⚠${NC} Database credentials not found, using defaults"
    POSTGRES_USER="postgres"
    read -sp "Enter PostgreSQL password: " POSTGRES_PASSWORD
    echo ""
fi

# Create Metabase database and user
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE $METABASE_DB_NAME;

-- Create user
CREATE USER $METABASE_DB_USER WITH PASSWORD '$METABASE_DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $METABASE_DB_NAME TO $METABASE_DB_USER;

-- Connect to Metabase DB and grant schema permissions
\c $METABASE_DB_NAME
GRANT ALL ON SCHEMA public TO $METABASE_DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Metabase database created"
    log "Metabase database created: $METABASE_DB_NAME"
else
    echo -e "${RED}✗${NC} Failed to create Metabase database"
    exit 1
fi

# Step 4: Create Metabase directory
echo ""
echo -e "${BLUE}Step 4/10:${NC} Creating Metabase directory..."

mkdir -p "$METABASE_DIR"
mkdir -p "$METABASE_DIR/plugins"

echo -e "${GREEN}✓${NC} Directory created: $METABASE_DIR"

# Step 5: Download Metabase
echo ""
echo -e "${BLUE}Step 5/10:${NC} Downloading Metabase..."

if [ -f "$METABASE_JAR" ]; then
    echo -e "${YELLOW}⚠${NC} Metabase JAR already exists, skipping download"
else
    METABASE_URL="https://downloads.metabase.com/${METABASE_VERSION}/metabase.jar"

    echo "Downloading from: $METABASE_URL"
    wget -O "$METABASE_JAR" "$METABASE_URL"

    if [ $? -eq 0 ] && [ -f "$METABASE_JAR" ]; then
        FILE_SIZE=$(du -h "$METABASE_JAR" | awk '{print $1}')
        echo -e "${GREEN}✓${NC} Metabase downloaded (Size: $FILE_SIZE)"
        log "Metabase downloaded: $METABASE_JAR"
    else
        echo -e "${RED}✗${NC} Failed to download Metabase"
        exit 1
    fi
fi

# Step 6: Create Metabase user
echo ""
echo -e "${BLUE}Step 6/10:${NC} Creating Metabase system user..."

if id "metabase" &>/dev/null; then
    echo -e "${YELLOW}⚠${NC} User 'metabase' already exists"
else
    useradd -r -s /bin/false -d "$METABASE_DIR" metabase
    echo -e "${GREEN}✓${NC} User 'metabase' created"
fi

# Set ownership
chown -R metabase:metabase "$METABASE_DIR"

# Step 7: Create systemd service
echo ""
echo -e "${BLUE}Step 7/10:${NC} Creating systemd service..."

cat > /etc/systemd/system/metabase.service <<EOF
[Unit]
Description=Metabase Analytics Dashboard
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=metabase
Group=metabase
WorkingDirectory=$METABASE_DIR

# Environment variables
Environment="MB_DB_TYPE=postgres"
Environment="MB_DB_DBNAME=$METABASE_DB_NAME"
Environment="MB_DB_PORT=5432"
Environment="MB_DB_USER=$METABASE_DB_USER"
Environment="MB_DB_PASS=$METABASE_DB_PASSWORD"
Environment="MB_DB_HOST=localhost"
Environment="MB_JETTY_PORT=$METABASE_PORT"
Environment="MB_JETTY_HOST=127.0.0.1"
Environment="JAVA_OPTS=-Xmx2g -Xms512m"

# Start Metabase
ExecStart=/usr/bin/java -jar $METABASE_JAR

# Restart policy
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=metabase

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$METABASE_DIR

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓${NC} Systemd service created"
log "Systemd service created"

# Reload systemd
systemctl daemon-reload

# Step 8: Configure Nginx reverse proxy
echo ""
echo -e "${BLUE}Step 8/10:${NC} Configuring Nginx reverse proxy..."

if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Nginx not installed, installing..."
    apt-get install -y nginx
fi

# Create Nginx configuration
cat > /etc/nginx/sites-available/metabase <<EOF
# Metabase Analytics Dashboard
server {
    listen 80;
    server_name $METABASE_DOMAIN;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $METABASE_DOMAIN;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/$METABASE_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$METABASE_DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/metabase_access.log;
    error_log /var/log/nginx/metabase_error.log;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:$METABASE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;

        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # WebSocket support for live updates
    location /api/notify {
        proxy_pass http://127.0.0.1:$METABASE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Client max body size
    client_max_body_size 100M;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/metabase /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Nginx configuration created"
    log "Nginx configured for $METABASE_DOMAIN"
else
    echo -e "${RED}✗${NC} Nginx configuration test failed"
    exit 1
fi

# Step 9: Setup SSL with Let's Encrypt
echo ""
echo -e "${BLUE}Step 9/10:${NC} Setting up SSL certificate..."

if [ ! -d "/etc/letsencrypt/live/$METABASE_DOMAIN" ]; then
    echo "Obtaining SSL certificate for $METABASE_DOMAIN..."

    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx
    fi

    # Temporarily disable SSL in Nginx
    sed -i 's/listen 443 ssl/listen 443/' /etc/nginx/sites-available/metabase
    sed -i 's/ssl_certificate/#ssl_certificate/g' /etc/nginx/sites-available/metabase
    systemctl reload nginx

    # Obtain certificate
    certbot --nginx -d "$METABASE_DOMAIN" --non-interactive --agree-tos --email "admin@aurelle.uz" --redirect

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} SSL certificate obtained"
        log "SSL certificate obtained for $METABASE_DOMAIN"
    else
        echo -e "${YELLOW}⚠${NC} SSL certificate setup failed, continuing with HTTP only"
        log "WARNING: SSL setup failed"
    fi

    # Restore SSL config
    sed -i 's/listen 443 /listen 443 ssl /' /etc/nginx/sites-available/metabase
    sed -i 's/#ssl_certificate/ssl_certificate/g' /etc/nginx/sites-available/metabase
else
    echo -e "${GREEN}✓${NC} SSL certificate already exists"
fi

# Reload Nginx
systemctl reload nginx

# Step 10: Start Metabase
echo ""
echo -e "${BLUE}Step 10/10:${NC} Starting Metabase..."

systemctl enable metabase
systemctl start metabase

# Wait for Metabase to start (can take 1-2 minutes)
echo "Waiting for Metabase to start (this may take 1-2 minutes)..."

MAX_WAIT=180
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if systemctl is-active --quiet metabase; then
        # Check if Metabase is responding
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$METABASE_PORT/api/health || echo "000")

        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓${NC} Metabase is running"
            log "Metabase started successfully"
            break
        fi
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo -n "."
done

echo ""

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠${NC} Metabase startup timeout, check logs: sudo journalctl -u metabase -n 50"
    log "WARNING: Metabase startup timeout"
else
    echo -e "${GREEN}✓${NC} Metabase is ready"
fi

# Step 11: Configure firewall
echo ""
echo -e "${BLUE}Configuring firewall...${NC}"

if command -v ufw &> /dev/null; then
    # Allow HTTP and HTTPS if not already allowed
    ufw allow 80/tcp comment "HTTP for Metabase"
    ufw allow 443/tcp comment "HTTPS for Metabase"
    echo -e "${GREEN}✓${NC} Firewall configured"
else
    echo -e "${YELLOW}⚠${NC} UFW not installed, skipping firewall configuration"
fi

# Step 12: Save credentials
echo ""
echo -e "${BLUE}Saving credentials...${NC}"

cat > /etc/metabase.conf <<EOF
# Metabase Configuration
# Generated on $(date)

METABASE_URL=https://$METABASE_DOMAIN
METABASE_DB_NAME=$METABASE_DB_NAME
METABASE_DB_USER=$METABASE_DB_USER
METABASE_DB_PASSWORD=$METABASE_DB_PASSWORD
METABASE_PORT=$METABASE_PORT
EOF

chmod 600 /etc/metabase.conf

echo -e "${GREEN}✓${NC} Credentials saved to /etc/metabase.conf"
log "Credentials saved"

# Step 13: Create viewer user for read-only access
echo ""
echo -e "${BLUE}Creating PostgreSQL viewer user...${NC}"

VIEWER_PASSWORD=$(openssl rand -base64 32)

# Load main database credentials
source /etc/aurelle-db.conf

sudo -u postgres psql <<EOF
-- Create viewer user
CREATE USER metabase_viewer WITH PASSWORD '$VIEWER_PASSWORD';

-- Grant read-only access to application database
\c aurelle_db
GRANT CONNECT ON DATABASE aurelle_db TO metabase_viewer;
GRANT USAGE ON SCHEMA public TO metabase_viewer;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_viewer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_viewer;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Viewer user created"

    # Save viewer credentials
    cat >> /etc/metabase.conf <<EOF

# Read-only database user for dashboards
VIEWER_DB_USER=metabase_viewer
VIEWER_DB_PASSWORD=$VIEWER_PASSWORD
EOF

    log "Viewer user created: metabase_viewer"
else
    echo -e "${YELLOW}⚠${NC} Failed to create viewer user"
fi

# Step 14: Display summary
echo ""
echo "================================================================"
echo -e "${GREEN}✓ Metabase Installation Complete!${NC}"
echo "================================================================"
echo ""
echo "Access Information:"
echo "  URL: https://$METABASE_DOMAIN"
echo "  Local: http://127.0.0.1:$METABASE_PORT"
echo ""
echo "First-time setup:"
echo "  1. Open: https://$METABASE_DOMAIN"
echo "  2. Create admin account"
echo "  3. Add database connection:"
echo "     - Database type: PostgreSQL"
echo "     - Name: AURELLE Production"
echo "     - Host: localhost"
echo "     - Port: 5432"
echo "     - Database: aurelle_db"
echo "     - Username: metabase_viewer"
echo "     - Password: [See /etc/metabase.conf]"
echo ""
echo "Service Management:"
echo "  Start:   sudo systemctl start metabase"
echo "  Stop:    sudo systemctl stop metabase"
echo "  Restart: sudo systemctl restart metabase"
echo "  Status:  sudo systemctl status metabase"
echo "  Logs:    sudo journalctl -u metabase -f"
echo ""
echo "Configuration:"
echo "  Service: /etc/systemd/system/metabase.service"
echo "  Nginx: /etc/nginx/sites-available/metabase"
echo "  Credentials: /etc/metabase.conf"
echo "  Directory: $METABASE_DIR"
echo ""
echo "Next Steps:"
echo "  1. Complete Metabase setup wizard"
echo "  2. Connect to AURELLE database"
echo "  3. Create dashboards (see METRICS_DASHBOARD_GUIDE.md)"
echo "  4. Set up automated reports"
echo ""

log "=== Metabase Installation Completed Successfully ==="
log ""

exit 0
