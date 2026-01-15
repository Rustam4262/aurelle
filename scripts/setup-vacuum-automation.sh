#!/bin/bash

# VACUUM Automation Setup Script
# Sets up automated database maintenance with VACUUM and ANALYZE

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
POSTGRES_USER="postgres"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_USER="${CRON_USER:-$(whoami)}"

echo "=== PostgreSQL VACUUM Automation Setup ==="
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  PostgreSQL User: $POSTGRES_USER"
echo "  Cron User: $CRON_USER"
echo ""

# Step 1: Create vacuum maintenance script
echo "Step 1: Creating VACUUM maintenance script..."
echo ""

VACUUM_SCRIPT="$SCRIPT_DIR/vacuum-database.sh"

cat > "$VACUUM_SCRIPT" << 'EOF_VACUUM'
#!/bin/bash

# Database VACUUM Script
# Performs VACUUM and ANALYZE on database tables

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
LOG_FILE="/var/log/aurelle-monitoring/vacuum.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Database VACUUM ==="

# Full VACUUM ANALYZE on all tables
log "Running VACUUM ANALYZE on all tables..."
sudo -u postgres psql -d "$DB_NAME" -c "VACUUM ANALYZE;" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "✓ VACUUM ANALYZE completed successfully"
else
    log "✗ VACUUM ANALYZE failed"
    exit 1
fi

# Get bloat information for monitoring
log "Checking table bloat..."
sudo -u postgres psql -d "$DB_NAME" << 'EOSQL' >> "$LOG_FILE" 2>&1
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    n_live_tup,
    n_dead_tup,
    CASE
        WHEN n_live_tup > 0
        THEN ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
        ELSE 0
    END AS dead_tuple_percent,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
EOSQL

log "=== VACUUM Complete ==="
log ""
EOF_VACUUM

chmod +x "$VACUUM_SCRIPT"
echo -e "${GREEN}✓${NC} VACUUM script created: $VACUUM_SCRIPT"
echo ""

# Step 2: Create full VACUUM script (weekly deep clean)
echo "Step 2: Creating VACUUM FULL script (for weekly deep clean)..."
echo ""

VACUUM_FULL_SCRIPT="$SCRIPT_DIR/vacuum-full-database.sh"

cat > "$VACUUM_FULL_SCRIPT" << 'EOF_VACUUM_FULL'
#!/bin/bash

# Database VACUUM FULL Script
# Performs full VACUUM to reclaim disk space (requires table lock)
# WARNING: VACUUM FULL requires exclusive lock and can take significant time

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
LOG_FILE="/var/log/aurelle-monitoring/vacuum-full.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting VACUUM FULL ==="
log "WARNING: This operation locks tables and may take significant time"

# Check current database size
DB_SIZE_BEFORE=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
log "Database size before: $DB_SIZE_BEFORE"

# Perform VACUUM FULL on each table (to avoid long locks)
log "Running VACUUM FULL on high-traffic tables..."

TABLES=("bookings" "reviews" "notifications" "audit_logs" "chat_messages")

for table in "${TABLES[@]}"; do
    log "VACUUM FULL on $table..."
    sudo -u postgres psql -d "$DB_NAME" -c "VACUUM FULL $table;" >> "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
        log "✓ VACUUM FULL on $table completed"
    else
        log "✗ VACUUM FULL on $table failed"
    fi
done

# Run ANALYZE to update statistics
log "Running ANALYZE..."
sudo -u postgres psql -d "$DB_NAME" -c "ANALYZE;" >> "$LOG_FILE" 2>&1

# Check database size after
DB_SIZE_AFTER=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
log "Database size after: $DB_SIZE_AFTER"

log "=== VACUUM FULL Complete ==="
log ""
EOF_VACUUM_FULL

chmod +x "$VACUUM_FULL_SCRIPT"
echo -e "${GREEN}✓${NC} VACUUM FULL script created: $VACUUM_FULL_SCRIPT"
echo ""

# Step 3: Create reindex script
echo "Step 3: Creating REINDEX script..."
echo ""

REINDEX_SCRIPT="$SCRIPT_DIR/reindex-database.sh"

cat > "$REINDEX_SCRIPT" << 'EOF_REINDEX'
#!/bin/bash

# Database REINDEX Script
# Rebuilds indexes to eliminate bloat and improve performance

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
LOG_FILE="/var/log/aurelle-monitoring/reindex.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Database REINDEX ==="

# REINDEX database (concurrent mode to avoid locks where possible)
log "Running REINDEX on database..."
sudo -u postgres psql -d "$DB_NAME" -c "REINDEX DATABASE CONCURRENTLY $DB_NAME;" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "✓ REINDEX completed successfully"
else
    log "✗ REINDEX failed, trying non-concurrent mode..."
    sudo -u postgres psql -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;" >> "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
        log "✓ REINDEX (non-concurrent) completed successfully"
    else
        log "✗ REINDEX failed"
        exit 1
    fi
fi

# Update statistics after reindex
log "Running ANALYZE..."
sudo -u postgres psql -d "$DB_NAME" -c "ANALYZE;" >> "$LOG_FILE" 2>&1

log "=== REINDEX Complete ==="
log ""
EOF_REINDEX

chmod +x "$REINDEX_SCRIPT"
echo -e "${GREEN}✓${NC} REINDEX script created: $REINDEX_SCRIPT"
echo ""

# Step 4: Setup cron jobs
echo "Step 4: Setting up cron jobs for automated maintenance..."
echo ""

# Backup existing crontab
crontab -l > /tmp/aurelle-vacuum-crontab-backup-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null || true

# Create new crontab entries
cat > /tmp/aurelle-vacuum-cron.txt << EOF
# AURELLE Database VACUUM Automation
# Auto-generated on $(date)

# Daily VACUUM ANALYZE - Every day at 2 AM (low traffic time)
0 2 * * * $VACUUM_SCRIPT >> /var/log/aurelle-monitoring/vacuum.log 2>&1

# Weekly VACUUM FULL - Every Sunday at 3 AM (deep clean during low traffic)
0 3 * * 0 $VACUUM_FULL_SCRIPT >> /var/log/aurelle-monitoring/vacuum-full.log 2>&1

# Monthly REINDEX - First day of month at 4 AM (rebuild indexes)
0 4 1 * * $REINDEX_SCRIPT >> /var/log/aurelle-monitoring/reindex.log 2>&1

EOF

# Combine with existing crontab (remove old vacuum entries first)
(crontab -l 2>/dev/null | grep -v "AURELLE Database VACUUM" | grep -v "vacuum-database.sh" | grep -v "vacuum-full-database.sh" | grep -v "reindex-database.sh"; cat /tmp/aurelle-vacuum-cron.txt) | crontab -

echo -e "${GREEN}✓${NC} Cron jobs installed"
echo ""
echo -e "${BLUE}Cron schedule:${NC}"
echo "  - Daily VACUUM ANALYZE: Every day at 2 AM"
echo "  - Weekly VACUUM FULL: Every Sunday at 3 AM"
echo "  - Monthly REINDEX: First day of month at 4 AM"
echo ""

# Step 5: Create log directory
echo "Step 5: Creating log directory..."
sudo mkdir -p /var/log/aurelle-monitoring
sudo chown $CRON_USER:$CRON_USER /var/log/aurelle-monitoring
echo -e "${GREEN}✓${NC} Log directory created: /var/log/aurelle-monitoring"
echo ""

# Step 6: Run initial VACUUM
echo "Step 6: Running initial VACUUM ANALYZE..."
echo ""

read -p "Do you want to run VACUUM ANALYZE now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash "$VACUUM_SCRIPT"
else
    echo -e "${YELLOW}⚠${NC}  Skipped initial VACUUM"
fi
echo ""

# Step 7: Check autovacuum settings
echo "Step 7: Verifying autovacuum configuration..."
echo ""

echo -e "${BLUE}Current autovacuum settings:${NC}"
sudo -u postgres psql -c "
SELECT
    name,
    setting,
    unit,
    short_desc
FROM pg_settings
WHERE name LIKE 'autovacuum%'
ORDER BY name;
"
echo ""

echo "=== Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} VACUUM automation is now configured"
echo ""
echo "What was configured:"
echo "  1. Daily VACUUM ANALYZE (2 AM) - Maintains table health"
echo "  2. Weekly VACUUM FULL (Sunday 3 AM) - Reclaims disk space"
echo "  3. Monthly REINDEX (1st of month, 4 AM) - Rebuilds indexes"
echo ""
echo "Manual operations:"
echo ""
echo "  Run VACUUM ANALYZE manually:"
echo "    bash $VACUUM_SCRIPT"
echo ""
echo "  Run VACUUM FULL manually (locks tables!):"
echo "    bash $VACUUM_FULL_SCRIPT"
echo ""
echo "  Run REINDEX manually:"
echo "    bash $REINDEX_SCRIPT"
echo ""
echo "  Check table bloat:"
echo "    sudo -u postgres psql -d $DB_NAME -c \"SELECT schemaname, tablename, n_live_tup, n_dead_tup, ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct FROM pg_stat_user_tables WHERE n_dead_tup > 0 ORDER BY n_dead_tup DESC;\""
echo ""
echo "  View vacuum logs:"
echo "    tail -f /var/log/aurelle-monitoring/vacuum.log"
echo ""
echo "  View cron jobs:"
echo "    crontab -l | grep vacuum"
echo ""
