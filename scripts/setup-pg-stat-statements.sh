#!/bin/bash

# pg_stat_statements Extension Setup Script
# Enables query performance tracking in PostgreSQL

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
POSTGRES_USER="postgres"

echo "=== pg_stat_statements Extension Setup ==="
echo ""

# Step 1: Check if PostgreSQL is running
echo "Step 1: Checking PostgreSQL status..."
if ! sudo systemctl is-active --quiet postgresql; then
    echo -e "${RED}✗${NC} PostgreSQL is not running"
    echo "Please start PostgreSQL first: sudo systemctl start postgresql"
    exit 1
fi
echo -e "${GREEN}✓${NC} PostgreSQL is running"
echo ""

# Step 2: Check if extension is already loaded in shared_preload_libraries
echo "Step 2: Checking shared_preload_libraries configuration..."
SHARED_LIBS=$(sudo -u postgres psql -t -c "SHOW shared_preload_libraries;" | xargs)

if [[ $SHARED_LIBS == *"pg_stat_statements"* ]]; then
    echo -e "${GREEN}✓${NC} pg_stat_statements is already in shared_preload_libraries"
else
    echo -e "${YELLOW}⚠${NC}  pg_stat_statements is NOT in shared_preload_libraries"
    echo ""
    echo "The PostgreSQL tuning script (tune-postgres.sh) should add this automatically."
    echo "If not, you need to add the following to postgresql.conf:"
    echo "  shared_preload_libraries = 'pg_stat_statements'"
    echo ""
    echo "Then restart PostgreSQL:"
    echo "  sudo systemctl restart postgresql"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 3: Create extension in database
echo "Step 3: Creating pg_stat_statements extension in database '$DB_NAME'..."

# Check if database exists
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${RED}✗${NC} Database '$DB_NAME' does not exist"
    echo "Please create the database first or specify correct DB_NAME environment variable"
    exit 1
fi

# Create extension
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;" 2>&1 | grep -v "NOTICE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} pg_stat_statements extension created successfully"
else
    echo -e "${RED}✗${NC} Failed to create pg_stat_statements extension"
    exit 1
fi
echo ""

# Step 4: Verify extension is installed
echo "Step 4: Verifying extension installation..."
EXTENSION_EXISTS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements');" | xargs)

if [ "$EXTENSION_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓${NC} Extension verified successfully"
else
    echo -e "${RED}✗${NC} Extension verification failed"
    exit 1
fi
echo ""

# Step 5: Check current statistics
echo "Step 5: Checking current query statistics..."
QUERY_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_stat_statements;" | xargs)
echo "  Tracked queries: $QUERY_COUNT"
echo ""

# Step 6: Show example queries
echo "Step 6: Testing pg_stat_statements..."
echo ""
echo -e "${BLUE}Top 10 Slowest Queries (by mean execution time):${NC}"
sudo -u postgres psql -d "$DB_NAME" << 'EOF'
SELECT
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    calls,
    ROUND((100 * total_exec_time / SUM(total_exec_time) OVER())::numeric, 2) AS percentage,
    LEFT(query, 80) AS query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF

echo ""
echo -e "${BLUE}Top 10 Most Frequently Called Queries:${NC}"
sudo -u postgres psql -d "$DB_NAME" << 'EOF'
SELECT
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    LEFT(query, 80) AS query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 10;
EOF

echo ""

# Step 7: Create helper functions/views
echo "Step 7: Creating helper views for easier analysis..."

sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- View for slowest queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    calls,
    ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER(), 0))::numeric, 2) AS percentage,
    query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC;

-- View for most called queries
CREATE OR REPLACE VIEW frequent_queries AS
SELECT
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER(), 0))::numeric, 2) AS percentage,
    query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC;

-- View for queries with high total time
CREATE OR REPLACE VIEW expensive_queries AS
SELECT
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    calls,
    ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER(), 0))::numeric, 2) AS percentage,
    query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Helper views created successfully"
else
    echo -e "${YELLOW}⚠${NC}  Failed to create helper views (non-critical)"
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo -e "${GREEN}✓${NC} pg_stat_statements is ready to use"
echo ""
echo "Usage Examples:"
echo ""
echo "1. View slowest queries:"
echo "   sudo -u postgres psql -d $DB_NAME -c 'SELECT * FROM slow_queries LIMIT 10;'"
echo ""
echo "2. View most frequently called queries:"
echo "   sudo -u postgres psql -d $DB_NAME -c 'SELECT * FROM frequent_queries LIMIT 10;'"
echo ""
echo "3. View most expensive queries (by total time):"
echo "   sudo -u postgres psql -d $DB_NAME -c 'SELECT * FROM expensive_queries LIMIT 10;'"
echo ""
echo "4. Reset statistics (start fresh):"
echo "   sudo -u postgres psql -d $DB_NAME -c 'SELECT pg_stat_statements_reset();'"
echo ""
echo "5. Get statistics for a specific query pattern:"
echo "   sudo -u postgres psql -d $DB_NAME -c \"SELECT * FROM pg_stat_statements WHERE query LIKE '%bookings%' ORDER BY mean_exec_time DESC;\""
echo ""
echo "6. Export slow queries to CSV:"
echo "   sudo -u postgres psql -d $DB_NAME -c \"\\copy (SELECT * FROM slow_queries LIMIT 50) TO '/tmp/slow_queries.csv' CSV HEADER\""
echo ""
