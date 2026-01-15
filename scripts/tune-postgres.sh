#!/bin/bash

# PostgreSQL Performance Tuning Script
# Optimizes PostgreSQL configuration for AURELLE platform

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
POSTGRES_CONF="/etc/postgresql/14/main/postgresql.conf"
POSTGRES_CONF_BACKUP="/etc/postgresql/14/main/postgresql.conf.backup.$(date +%Y%m%d-%H%M%S)"

# Detect system resources
echo "=== PostgreSQL Performance Tuning ==="
echo ""
echo "Step 1: Detecting system resources..."
echo ""

# Get total RAM in MB
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
TOTAL_RAM_GB=$(awk "BEGIN {printf \"%.1f\", $TOTAL_RAM_MB / 1024}")

# Get CPU cores
CPU_CORES=$(nproc)

echo -e "${BLUE}System Information:${NC}"
echo "  Total RAM: ${TOTAL_RAM_GB}GB (${TOTAL_RAM_MB}MB)"
echo "  CPU Cores: ${CPU_CORES}"
echo ""

# Calculate optimal settings based on PostgreSQL best practices
# shared_buffers: 25% of RAM
SHARED_BUFFERS_MB=$((TOTAL_RAM_MB / 4))

# effective_cache_size: 50-75% of RAM (we'll use 60%)
EFFECTIVE_CACHE_SIZE_MB=$((TOTAL_RAM_MB * 60 / 100))

# maintenance_work_mem: RAM / 16 (capped at 2GB)
MAINTENANCE_WORK_MEM_MB=$((TOTAL_RAM_MB / 16))
if [ $MAINTENANCE_WORK_MEM_MB -gt 2048 ]; then
    MAINTENANCE_WORK_MEM_MB=2048
fi

# work_mem: RAM / (max_connections * 2) - we'll use max_connections=100
WORK_MEM_MB=$((TOTAL_RAM_MB / 200))
if [ $WORK_MEM_MB -lt 4 ]; then
    WORK_MEM_MB=4
fi

# wal_buffers: -1 (auto, typically 1/32 of shared_buffers)
# max_wal_size: 4GB for good performance
# min_wal_size: 1GB
# checkpoint_completion_target: 0.9 (spread checkpoints over 90% of checkpoint interval)

echo -e "${BLUE}Calculated Optimal Settings:${NC}"
echo "  shared_buffers = ${SHARED_BUFFERS_MB}MB"
echo "  effective_cache_size = ${EFFECTIVE_CACHE_SIZE_MB}MB"
echo "  maintenance_work_mem = ${MAINTENANCE_WORK_MEM_MB}MB"
echo "  work_mem = ${WORK_MEM_MB}MB"
echo "  wal_buffers = 16MB"
echo "  max_wal_size = 4GB"
echo "  min_wal_size = 1GB"
echo "  checkpoint_completion_target = 0.9"
echo "  max_connections = 100"
echo "  max_worker_processes = ${CPU_CORES}"
echo "  max_parallel_workers_per_gather = $((CPU_CORES / 2))"
echo "  max_parallel_workers = ${CPU_CORES}"
echo ""

# Step 2: Backup existing configuration
echo "Step 2: Backing up current PostgreSQL configuration..."
if [ -f "$POSTGRES_CONF" ]; then
    sudo cp "$POSTGRES_CONF" "$POSTGRES_CONF_BACKUP"
    echo -e "${GREEN}✓${NC} Backup created: $POSTGRES_CONF_BACKUP"
else
    echo -e "${RED}✗${NC} PostgreSQL config file not found at: $POSTGRES_CONF"
    echo "Please update POSTGRES_CONF variable in this script with correct path."
    exit 1
fi
echo ""

# Step 3: Apply tuning settings
echo "Step 3: Applying performance tuning settings..."
echo ""

# Create a tuning configuration file
TUNING_CONF="/etc/postgresql/14/main/conf.d/aurelle-tuning.conf"

# Ensure conf.d directory exists
sudo mkdir -p /etc/postgresql/14/main/conf.d

# Write tuning settings
sudo tee "$TUNING_CONF" > /dev/null << EOF
# AURELLE PostgreSQL Performance Tuning
# Auto-generated on $(date)
# System: ${TOTAL_RAM_GB}GB RAM, ${CPU_CORES} CPU cores

# ============ MEMORY SETTINGS ============

# Amount of memory PostgreSQL uses for caching data
# Recommendation: 25% of total RAM
shared_buffers = ${SHARED_BUFFERS_MB}MB

# PostgreSQL's estimate of how much memory is available for disk caching
# Recommendation: 50-75% of total RAM
effective_cache_size = ${EFFECTIVE_CACHE_SIZE_MB}MB

# Memory for maintenance operations (VACUUM, CREATE INDEX, etc.)
# Recommendation: RAM / 16, capped at 2GB
maintenance_work_mem = ${MAINTENANCE_WORK_MEM_MB}MB

# Memory for query operations (sorts, hash joins, etc.)
# Recommendation: RAM / (max_connections * 2)
work_mem = ${WORK_MEM_MB}MB

# ============ WAL (Write-Ahead Logging) SETTINGS ============

# Memory for WAL buffers (-1 = auto, typically 1/32 of shared_buffers)
wal_buffers = 16MB

# Maximum size of WAL between checkpoints (higher = better performance)
max_wal_size = 4GB

# Minimum size of WAL
min_wal_size = 1GB

# Spread checkpoints over this fraction of checkpoint interval (0.9 = 90%)
checkpoint_completion_target = 0.9

# ============ CONNECTION SETTINGS ============

# Maximum number of concurrent connections
max_connections = 100

# ============ QUERY PLANNER SETTINGS ============

# Cost of random page access (lower for SSD)
# Default: 4.0, SSD: 1.1, HDD: 4.0
random_page_cost = 1.1

# Cost of sequential page access
seq_page_cost = 1.0

# Planner's estimate of the cost of a disk page fetch
cpu_tuple_cost = 0.01

# Target for query planner statistics (higher = better stats, slower ANALYZE)
default_statistics_target = 100

# ============ PARALLEL QUERY SETTINGS ============

# Maximum number of background worker processes
max_worker_processes = ${CPU_CORES}

# Maximum number of parallel workers per query executor node
max_parallel_workers_per_gather = $((CPU_CORES / 2))

# Maximum number of parallel workers
max_parallel_workers = ${CPU_CORES}

# ============ LOGGING SETTINGS ============

# Log slow queries (queries taking longer than this)
log_min_duration_statement = 1000  # Log queries > 1 second

# Log checkpoint statistics
log_checkpoints = on

# Log connections
log_connections = on

# Log disconnections
log_disconnections = on

# Log lock waits longer than this
log_lock_waits = on
deadlock_timeout = 1s

# ============ AUTOVACUUM SETTINGS ============

# Enable autovacuum daemon
autovacuum = on

# Maximum number of autovacuum workers
autovacuum_max_workers = 3

# Time between autovacuum runs
autovacuum_naptime = 1min

# Minimum number of tuple updates/deletes before analyze
autovacuum_analyze_threshold = 50

# Minimum number of tuple updates/deletes before vacuum
autovacuum_vacuum_threshold = 50

# Fraction of table size to add to autovacuum_analyze_threshold
autovacuum_analyze_scale_factor = 0.05

# Fraction of table size to add to autovacuum_vacuum_threshold
autovacuum_vacuum_scale_factor = 0.1

# Maximum memory for autovacuum workers
autovacuum_work_mem = -1  # Use maintenance_work_mem

# ============ OTHER SETTINGS ============

# Track query planning time
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all

# Shared preload libraries (required for pg_stat_statements)
shared_preload_libraries = 'pg_stat_statements'

# pg_stat_statements settings
pg_stat_statements.max = 10000
pg_stat_statements.track = all
EOF

echo -e "${GREEN}✓${NC} Tuning configuration written to: $TUNING_CONF"
echo ""

# Step 4: Ensure include directive in main config
echo "Step 4: Ensuring conf.d directory is included..."
if ! sudo grep -q "^include_dir = 'conf.d'" "$POSTGRES_CONF"; then
    if sudo grep -q "^#include_dir = 'conf.d'" "$POSTGRES_CONF"; then
        # Uncomment existing include_dir
        sudo sed -i "s/^#include_dir = 'conf.d'/include_dir = 'conf.d'/" "$POSTGRES_CONF"
        echo -e "${GREEN}✓${NC} Enabled conf.d directory include"
    else
        # Add include_dir at the end
        echo "include_dir = 'conf.d'" | sudo tee -a "$POSTGRES_CONF" > /dev/null
        echo -e "${GREEN}✓${NC} Added conf.d directory include"
    fi
else
    echo -e "${GREEN}✓${NC} conf.d directory already included"
fi
echo ""

# Step 5: Validate configuration
echo "Step 5: Validating PostgreSQL configuration..."
if sudo -u postgres /usr/lib/postgresql/14/bin/postgres -C config_file > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Configuration validation passed"
else
    echo -e "${RED}✗${NC} Configuration validation failed"
    echo "Restoring backup..."
    sudo cp "$POSTGRES_CONF_BACKUP" "$POSTGRES_CONF"
    exit 1
fi
echo ""

# Step 6: Restart PostgreSQL
echo "Step 6: Restarting PostgreSQL to apply changes..."
read -p "Do you want to restart PostgreSQL now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl restart postgresql

    # Wait for PostgreSQL to start
    sleep 3

    if sudo systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✓${NC} PostgreSQL restarted successfully"
    else
        echo -e "${RED}✗${NC} PostgreSQL failed to start"
        echo "Restoring backup..."
        sudo cp "$POSTGRES_CONF_BACKUP" "$POSTGRES_CONF"
        sudo systemctl restart postgresql
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  Changes will take effect after manual restart"
    echo "To restart PostgreSQL later, run: sudo systemctl restart postgresql"
fi
echo ""

# Step 7: Verify settings
echo "Step 7: Verifying applied settings..."
echo ""

# Function to check a PostgreSQL setting
check_setting() {
    local setting_name="$1"
    local value=$(sudo -u postgres psql -t -c "SHOW $setting_name;" 2>/dev/null | xargs)
    echo "  $setting_name: $value"
}

echo -e "${BLUE}Current PostgreSQL Settings:${NC}"
check_setting "shared_buffers"
check_setting "effective_cache_size"
check_setting "maintenance_work_mem"
check_setting "work_mem"
check_setting "max_wal_size"
check_setting "checkpoint_completion_target"
check_setting "random_page_cost"
check_setting "max_connections"
check_setting "max_worker_processes"
check_setting "max_parallel_workers"
echo ""

echo "=== Tuning Complete ==="
echo ""
echo -e "${GREEN}✓${NC} PostgreSQL has been optimized for your system"
echo ""
echo "Next steps:"
echo "  1. Run: sudo -u postgres psql -c 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'"
echo "  2. Monitor query performance with: sudo -u postgres psql -c 'SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;'"
echo "  3. Check database size: sudo -u postgres psql -c '\\l+'"
echo "  4. Check table sizes: sudo -u postgres psql -d aurelle -c '\\dt+'"
echo ""
echo "Backup location: $POSTGRES_CONF_BACKUP"
echo "Tuning config: $TUNING_CONF"
echo ""
