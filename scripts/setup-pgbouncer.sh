#!/bin/bash

# PgBouncer Setup Script
# Installs and configures PgBouncer connection pooler for PostgreSQL

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
DB_USER="${DB_USER:-postgres}"
PGBOUNCER_PORT="${PGBOUNCER_PORT:-6432}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "=== PgBouncer Setup for AURELLE ==="
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  PgBouncer Port: $PGBOUNCER_PORT"
echo "  PostgreSQL Port: $POSTGRES_PORT"
echo ""

# Step 1: Check if PgBouncer is already installed
echo "Step 1: Checking if PgBouncer is installed..."
if command -v pgbouncer &> /dev/null; then
    PGBOUNCER_VERSION=$(pgbouncer --version 2>&1 | head -n1)
    echo -e "${GREEN}✓${NC} PgBouncer is already installed: $PGBOUNCER_VERSION"
else
    echo -e "${YELLOW}⚠${NC}  PgBouncer is not installed"
    echo ""
    read -p "Do you want to install PgBouncer? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Installing PgBouncer..."
        sudo apt-get update
        sudo apt-get install -y pgbouncer

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} PgBouncer installed successfully"
        else
            echo -e "${RED}✗${NC} Failed to install PgBouncer"
            exit 1
        fi
    else
        echo "Please install PgBouncer manually: sudo apt-get install pgbouncer"
        exit 1
    fi
fi
echo ""

# Step 2: Stop PgBouncer if running
echo "Step 2: Stopping PgBouncer (if running)..."
sudo systemctl stop pgbouncer 2>/dev/null || true
echo -e "${GREEN}✓${NC} PgBouncer stopped"
echo ""

# Step 3: Backup existing configuration
echo "Step 3: Backing up existing configuration..."
if [ -f /etc/pgbouncer/pgbouncer.ini ]; then
    sudo cp /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.backup.$(date +%Y%m%d-%H%M%S)
    echo -e "${GREEN}✓${NC} Backup created"
else
    echo -e "${YELLOW}⚠${NC}  No existing configuration found"
fi
echo ""

# Step 4: Copy PgBouncer configuration
echo "Step 4: Installing PgBouncer configuration..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_SOURCE="$SCRIPT_DIR/../configs/pgbouncer.ini"

if [ -f "$CONFIG_SOURCE" ]; then
    sudo cp "$CONFIG_SOURCE" /etc/pgbouncer/pgbouncer.ini
    sudo chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
    sudo chmod 640 /etc/pgbouncer/pgbouncer.ini
    echo -e "${GREEN}✓${NC} Configuration installed"
else
    echo -e "${RED}✗${NC} Configuration file not found at: $CONFIG_SOURCE"
    exit 1
fi
echo ""

# Step 5: Create userlist.txt (authentication file)
echo "Step 5: Creating authentication file..."

# Get the PostgreSQL user password hash
echo "Getting PostgreSQL user credentials..."
echo ""
echo -e "${YELLOW}Note:${NC} You need to provide the password for PostgreSQL user '$DB_USER'"
echo "This password will be stored in /etc/pgbouncer/userlist.txt"
echo ""

# Try to get password hash from PostgreSQL
PG_PASSWORD_HASH=$(sudo -u postgres psql -t -c "SELECT rolpassword FROM pg_authid WHERE rolname = '$DB_USER';" | xargs)

if [ -z "$PG_PASSWORD_HASH" ]; then
    echo -e "${RED}✗${NC} Failed to get password hash for user '$DB_USER'"
    echo "Please ensure the user exists and has a password set"
    exit 1
fi

# Create userlist.txt
echo "Creating userlist.txt..."
sudo tee /etc/pgbouncer/userlist.txt > /dev/null << EOF
"$DB_USER" "$PG_PASSWORD_HASH"
EOF

sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
sudo chmod 640 /etc/pgbouncer/userlist.txt
echo -e "${GREEN}✓${NC} Authentication file created"
echo ""

# Step 6: Create log directory
echo "Step 6: Creating log directory..."
sudo mkdir -p /var/log/postgresql
sudo chown postgres:postgres /var/log/postgresql
echo -e "${GREEN}✓${NC} Log directory created"
echo ""

# Step 7: Update systemd service
echo "Step 7: Configuring systemd service..."

# Ensure PgBouncer runs as postgres user
sudo tee /etc/systemd/system/pgbouncer.service > /dev/null << 'EOF'
[Unit]
Description=PgBouncer PostgreSQL connection pooler
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=forking
User=postgres
Group=postgres

ExecStart=/usr/sbin/pgbouncer -d /etc/pgbouncer/pgbouncer.ini
ExecReload=/bin/kill -SIGHUP $MAINPID
PIDFile=/var/run/postgresql/pgbouncer.pid

# Restart on failure
Restart=on-failure
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/postgresql /var/run/postgresql

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo -e "${GREEN}✓${NC} Systemd service configured"
echo ""

# Step 8: Start PgBouncer
echo "Step 8: Starting PgBouncer..."
sudo systemctl start pgbouncer

sleep 2

if sudo systemctl is-active --quiet pgbouncer; then
    echo -e "${GREEN}✓${NC} PgBouncer started successfully"
else
    echo -e "${RED}✗${NC} PgBouncer failed to start"
    echo "Checking logs..."
    sudo journalctl -u pgbouncer -n 20 --no-pager
    exit 1
fi
echo ""

# Step 9: Enable PgBouncer to start on boot
echo "Step 9: Enabling PgBouncer to start on boot..."
sudo systemctl enable pgbouncer
echo -e "${GREEN}✓${NC} PgBouncer enabled"
echo ""

# Step 10: Test connection
echo "Step 10: Testing PgBouncer connection..."
echo ""

# Test connection to PgBouncer
if psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1 AS test;" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Connection test successful"
else
    echo -e "${RED}✗${NC} Connection test failed"
    echo "Please check PgBouncer logs: sudo journalctl -u pgbouncer -f"
fi
echo ""

# Step 11: Show connection statistics
echo "Step 11: Displaying PgBouncer statistics..."
echo ""

echo -e "${BLUE}PgBouncer Status:${NC}"
psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER pgbouncer -c "SHOW POOLS;" 2>/dev/null || echo "Unable to connect to admin interface"
echo ""

echo -e "${BLUE}PgBouncer Configuration:${NC}"
psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER pgbouncer -c "SHOW CONFIG;" 2>/dev/null | head -20 || echo "Unable to connect to admin interface"
echo ""

echo "=== Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} PgBouncer is now running and ready to use"
echo ""
echo "Connection Details:"
echo "  Host: 127.0.0.1"
echo "  Port: $PGBOUNCER_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo "Update your application connection string:"
echo "  Before: postgresql://$DB_USER@localhost:$POSTGRES_PORT/$DB_NAME"
echo "  After:  postgresql://$DB_USER@localhost:$PGBOUNCER_PORT/$DB_NAME"
echo ""
echo "Useful Commands:"
echo ""
echo "  Check PgBouncer status:"
echo "    sudo systemctl status pgbouncer"
echo ""
echo "  View PgBouncer logs:"
echo "    sudo journalctl -u pgbouncer -f"
echo ""
echo "  Connect to PgBouncer admin interface:"
echo "    psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER pgbouncer"
echo ""
echo "  View pool statistics:"
echo "    psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER pgbouncer -c 'SHOW POOLS;'"
echo ""
echo "  View client connections:"
echo "    psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER pgbouncer -c 'SHOW CLIENTS;'"
echo ""
echo "  View server connections:"
echo "    psql -h 127.0.0.1 -p $PGBOUNCER_PORT -U $DB_USER pgbouncer -c 'SHOW SERVERS;'"
echo ""
echo "  Reload configuration:"
echo "    sudo systemctl reload pgbouncer"
echo ""
echo "  Restart PgBouncer:"
echo "    sudo systemctl restart pgbouncer"
echo ""
echo "Next Steps:"
echo ""
echo "  1. Update your .env file with PgBouncer connection:"
echo "     DATABASE_URL=postgresql://$DB_USER:PASSWORD@localhost:$PGBOUNCER_PORT/$DB_NAME"
echo ""
echo "  2. Restart your application to use PgBouncer"
echo ""
echo "  3. Monitor connection pooling performance:"
echo "     Watch for reduced database connections and improved response times"
echo ""
