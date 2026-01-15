#!/bin/bash

# Redis Setup Script
# Installs and configures Redis for caching

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== Redis Setup for AURELLE ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗${NC} This script must be run as root or with sudo"
    exit 1
fi

# Configuration
REDIS_PASSWORD=$(openssl rand -base64 32)
REDIS_MAXMEMORY="512mb"
REDIS_POLICY="allkeys-lru"
REDIS_PORT="6379"
REDIS_BIND="127.0.0.1"

# Step 1: Check if Redis is already installed
echo "Step 1: Checking Redis installation..."

if command -v redis-server &> /dev/null; then
    REDIS_VERSION=$(redis-server --version | awk '{print $3}' | cut -d'=' -f2)
    echo -e "${YELLOW}⚠${NC}  Redis is already installed: $REDIS_VERSION"
    echo ""
    read -p "Reinstall and reconfigure Redis? (y/N) " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing Redis installation"
        echo ""
    else
        echo "Reinstalling Redis..."
        systemctl stop redis-server 2>/dev/null
        apt-get remove --purge -y redis-server redis-tools
    fi
fi

# Step 2: Install Redis
if ! command -v redis-server &> /dev/null; then
    echo "Step 2: Installing Redis..."

    apt-get update
    apt-get install -y redis-server redis-tools

    if [ $? -eq 0 ]; then
        REDIS_VERSION=$(redis-server --version | awk '{print $3}' | cut -d'=' -f2)
        echo -e "${GREEN}✓${NC} Redis installed successfully: $REDIS_VERSION"
    else
        echo -e "${RED}✗${NC} Failed to install Redis"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Redis is installed"
fi
echo ""

# Step 3: Stop Redis service
echo "Step 3: Stopping Redis service..."
systemctl stop redis-server
echo -e "${GREEN}✓${NC} Redis service stopped"
echo ""

# Step 4: Backup existing configuration
echo "Step 4: Backing up Redis configuration..."

if [ -f "/etc/redis/redis.conf" ]; then
    BACKUP_FILE="/etc/redis/redis.conf.backup.$(date +%Y%m%d-%H%M%S)"
    cp /etc/redis/redis.conf "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE"
fi
echo ""

# Step 5: Configure Redis
echo "Step 5: Configuring Redis..."

cat > /etc/redis/redis.conf << EOF
# AURELLE Redis Configuration
# Generated: $(date)

# Network
bind $REDIS_BIND
protected-mode yes
port $REDIS_PORT
tcp-backlog 511
timeout 0
tcp-keepalive 300

# General
daemonize no
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16

# Snapshotting (persistence)
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Replication
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
repl-disable-tcp-nodelay no

# Security
requirepass $REDIS_PASSWORD

# Limits
maxclients 10000

# Memory Management
maxmemory $REDIS_MAXMEMORY
maxmemory-policy $REDIS_POLICY
maxmemory-samples 5

# Lazy Freeing
lazyfree-lazy-eviction no
lazyfree-lazy-expire no
lazyfree-lazy-server-del no
replica-lazy-flush no

# Append Only File (AOF)
appendonly no
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Slow Log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Latency Monitor
latency-monitor-threshold 0

# Event Notification
notify-keyspace-events ""

# Advanced
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
EOF

echo -e "${GREEN}✓${NC} Redis configuration created"
echo ""

# Step 6: Save Redis password
echo "Step 6: Saving Redis credentials..."

CREDENTIALS_FILE="/etc/aurelle-redis.conf"
cat > "$CREDENTIALS_FILE" << EOF
# AURELLE Redis Credentials
# Generated: $(date)

REDIS_HOST="$REDIS_BIND"
REDIS_PORT="$REDIS_PORT"
REDIS_PASSWORD="$REDIS_PASSWORD"
REDIS_URL="redis://:$REDIS_PASSWORD@$REDIS_BIND:$REDIS_PORT"
EOF

chmod 600 "$CREDENTIALS_FILE"
chown root:root "$CREDENTIALS_FILE"

echo -e "${GREEN}✓${NC} Credentials saved to: $CREDENTIALS_FILE"
echo ""

# Step 7: Configure systemd service
echo "Step 7: Configuring systemd service..."

cat > /etc/systemd/system/redis-server.service << EOF
[Unit]
Description=Advanced key-value store
After=network.target
Documentation=http://redis.io/documentation

[Service]
Type=notify
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/bin/redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD shutdown
Restart=always
User=redis
Group=redis
RuntimeDirectory=redis
RuntimeDirectoryMode=0755

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=-/var/lib/redis
ReadWritePaths=-/var/log/redis
ReadWritePaths=-/var/run/redis

# Limits
LimitNOFILE=10032

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo -e "${GREEN}✓${NC} Systemd service configured"
echo ""

# Step 8: Create Redis CLI wrapper with authentication
echo "Step 8: Creating authenticated Redis CLI wrapper..."

cat > /usr/local/bin/redis-cli-auth << EOF
#!/bin/bash
# Authenticated Redis CLI wrapper for AURELLE

source /etc/aurelle-redis.conf
exec redis-cli -h \$REDIS_HOST -p \$REDIS_PORT -a \$REDIS_PASSWORD "\$@"
EOF

chmod +x /usr/local/bin/redis-cli-auth

echo -e "${GREEN}✓${NC} Redis CLI wrapper created: /usr/local/bin/redis-cli-auth"
echo ""

# Step 9: Set proper permissions
echo "Step 9: Setting permissions..."

chown -R redis:redis /var/lib/redis
chown -R redis:redis /var/log/redis
chmod 750 /var/lib/redis
chmod 750 /var/log/redis

echo -e "${GREEN}✓${NC} Permissions set"
echo ""

# Step 10: Start Redis service
echo "Step 10: Starting Redis service..."

systemctl enable redis-server
systemctl start redis-server

sleep 2

if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✓${NC} Redis service started successfully"
else
    echo -e "${RED}✗${NC} Failed to start Redis service"
    echo "Check logs: sudo journalctl -u redis-server -n 50"
    exit 1
fi
echo ""

# Step 11: Test Redis connection
echo "Step 11: Testing Redis connection..."

redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD PING 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Redis is responding"
else
    echo -e "${RED}✗${NC} Redis is not responding"
    exit 1
fi

# Test set/get
redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD SET test_key "AURELLE" EX 10 > /dev/null 2>&1
TEST_VALUE=$(redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD GET test_key 2>/dev/null)

if [ "$TEST_VALUE" = "AURELLE" ]; then
    echo -e "${GREEN}✓${NC} Redis read/write test passed"
    redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD DEL test_key > /dev/null 2>&1
else
    echo -e "${RED}✗${NC} Redis read/write test failed"
fi
echo ""

# Step 12: Display Redis info
echo "Step 12: Redis information..."

echo -e "${BLUE}Redis Status:${NC}"
redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD INFO server 2>/dev/null | grep -E "^redis_version|^os|^process_id"

echo ""
echo -e "${BLUE}Memory Status:${NC}"
redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD INFO memory 2>/dev/null | grep -E "^used_memory_human|^maxmemory_human|^maxmemory_policy"

echo ""
echo -e "${BLUE}Stats:${NC}"
redis-cli -h $REDIS_BIND -p $REDIS_PORT -a $REDIS_PASSWORD INFO stats 2>/dev/null | grep -E "^total_connections_received|^total_commands_processed|^keyspace"

echo ""

# Step 13: Configure firewall
echo "Step 13: Configuring firewall..."

if command -v ufw &> /dev/null; then
    # Redis is localhost-only, no firewall rule needed
    echo -e "${GREEN}✓${NC} Redis is bound to localhost only (no firewall rule needed)"
else
    echo -e "${YELLOW}⚠${NC}  UFW not installed, skipping firewall configuration"
fi
echo ""

# Step 14: Create monitoring script
echo "Step 14: Creating monitoring script..."

cat > /usr/local/bin/redis-monitor << 'EOF'
#!/bin/bash
# Redis Monitoring Script

source /etc/aurelle-redis.conf

echo "=== Redis Monitoring ==="
echo ""

# Server Info
echo "Server:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO server | grep -E "^redis_version|^uptime_in_seconds|^process_id"

echo ""
echo "Memory:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO memory | grep -E "^used_memory_human|^used_memory_peak_human|^maxmemory_human|^mem_fragmentation_ratio"

echo ""
echo "Stats:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO stats | grep -E "^total_connections|^total_commands|^instantaneous_ops|^keyspace_hits|^keyspace_misses|^evicted_keys"

echo ""
echo "Clients:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO clients | grep -E "^connected_clients|^blocked_clients"

echo ""
echo "Keyspace:"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD INFO keyspace

echo ""
echo "Slowlog (last 5):"
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD SLOWLOG GET 5
EOF

chmod +x /usr/local/bin/redis-monitor

echo -e "${GREEN}✓${NC} Monitoring script created: /usr/local/bin/redis-monitor"
echo ""

# Step 15: Display completion summary
echo "=== Redis Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} Redis is installed and configured"
echo ""

echo "Configuration:"
echo "  Host: $REDIS_BIND (localhost only)"
echo "  Port: $REDIS_PORT"
echo "  Password: [saved in $CREDENTIALS_FILE]"
echo "  Max Memory: $REDIS_MAXMEMORY"
echo "  Eviction Policy: $REDIS_POLICY"
echo ""

echo "Connection URL:"
echo "  redis://:PASSWORD@$REDIS_BIND:$REDIS_PORT"
echo ""

echo "Credentials file:"
echo "  $CREDENTIALS_FILE"
echo "  (Use 'source $CREDENTIALS_FILE' to load credentials)"
echo ""

echo "Service management:"
echo "  Status: sudo systemctl status redis-server"
echo "  Start: sudo systemctl start redis-server"
echo "  Stop: sudo systemctl stop redis-server"
echo "  Restart: sudo systemctl restart redis-server"
echo "  Logs: sudo journalctl -u redis-server -f"
echo ""

echo "Redis CLI:"
echo "  Authenticated CLI: redis-cli-auth"
echo "  Example: redis-cli-auth PING"
echo "  Example: redis-cli-auth GET key"
echo ""

echo "Monitoring:"
echo "  Quick info: redis-cli-auth INFO"
echo "  Monitoring script: sudo redis-monitor"
echo "  Memory stats: redis-cli-auth INFO memory"
echo "  Stats: redis-cli-auth INFO stats"
echo ""

echo "Useful commands:"
echo "  Test connection: redis-cli-auth PING"
echo "  Set value: redis-cli-auth SET key value"
echo "  Get value: redis-cli-auth GET key"
echo "  Set with TTL: redis-cli-auth SETEX key 60 value"
echo "  Check keys: redis-cli-auth KEYS '*'"
echo "  Flush all: redis-cli-auth FLUSHALL"
echo "  Monitor commands: redis-cli-auth MONITOR"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update application .env file:"
echo "     REDIS_URL=redis://:$REDIS_PASSWORD@$REDIS_BIND:$REDIS_PORT"
echo ""
echo "  2. Install Redis client in application:"
echo "     npm install ioredis"
echo ""
echo "  3. Integrate Redis caching (see documentation)"
echo ""
echo "  4. Test application with Redis caching"
echo ""
echo "  5. Setup Redis backup (if needed):"
echo "     sudo bash scripts/backup-redis.sh"
echo ""

# Display password (only once during setup)
echo -e "${RED}IMPORTANT - Redis Password (save this):${NC}"
echo "$REDIS_PASSWORD"
echo ""
echo "This password is also saved in: $CREDENTIALS_FILE"
echo ""

