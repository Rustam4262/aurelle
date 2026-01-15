#!/bin/bash

# Slow Query Analysis Script
# Analyzes PostgreSQL query performance and identifies bottlenecks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="${DB_NAME:-aurelle}"
POSTGRES_USER="postgres"
THRESHOLD_MS="${THRESHOLD_MS:-50}"  # Default: 50ms
REPORT_DIR="/var/log/aurelle-monitoring"

echo "=== PostgreSQL Slow Query Analysis ==="
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Database: $DB_NAME"
echo "  Threshold: ${THRESHOLD_MS}ms"
echo "  Report Directory: $REPORT_DIR"
echo ""

# Check if pg_stat_statements exists
EXTENSION_EXISTS=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements');" 2>/dev/null | xargs)

if [ "$EXTENSION_EXISTS" != "t" ]; then
    echo -e "${RED}✗${NC} pg_stat_statements extension is not installed"
    echo "Please run: ./setup-pg-stat-statements.sh"
    exit 1
fi

# Create report directory if it doesn't exist
sudo mkdir -p "$REPORT_DIR"

# Generate timestamp for report
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="$REPORT_DIR/slow_queries_${TIMESTAMP}.txt"

# Function to run query and format output
run_analysis() {
    local title="$1"
    local query="$2"

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${title}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    sudo -u postgres psql -d "$DB_NAME" -c "$query"
    echo ""
}

# Start report
{
    echo "AURELLE PostgreSQL Slow Query Analysis Report"
    echo "Generated: $(date)"
    echo "Database: $DB_NAME"
    echo "Threshold: ${THRESHOLD_MS}ms"
    echo ""
    echo "========================================"
    echo ""
} > "$REPORT_FILE"

# Analysis 1: Slowest Queries by Average Execution Time
echo -e "${YELLOW}Analysis 1: Slowest Queries (by average execution time)${NC}"
echo ""

QUERY1="
SELECT
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    calls,
    ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER(), 0))::numeric, 2) AS pct,
    ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE mean_exec_time > $THRESHOLD_MS
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;
"

run_analysis "Slowest Queries (Average Execution Time > ${THRESHOLD_MS}ms)" "$QUERY1" | tee -a "$REPORT_FILE"

# Analysis 2: Most Time-Consuming Queries (Total Time)
echo -e "${YELLOW}Analysis 2: Most Time-Consuming Queries (by total execution time)${NC}"
echo ""

QUERY2="
SELECT
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    calls,
    ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER(), 0))::numeric, 2) AS pct,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;
"

run_analysis "Most Time-Consuming Queries (Total Time)" "$QUERY2" | tee -a "$REPORT_FILE"

# Analysis 3: Most Frequently Called Queries
echo -e "${YELLOW}Analysis 3: Most Frequently Called Queries${NC}"
echo ""

QUERY3="
SELECT
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    ROUND((100 * total_exec_time / NULLIF(SUM(total_exec_time) OVER(), 0))::numeric, 2) AS pct,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY calls DESC
LIMIT 20;
"

run_analysis "Most Frequently Called Queries" "$QUERY3" | tee -a "$REPORT_FILE"

# Analysis 4: Queries with High Variability (stddev)
echo -e "${YELLOW}Analysis 4: Queries with High Performance Variability${NC}"
echo ""

QUERY4="
SELECT
    ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(min_exec_time::numeric, 2) AS min_ms,
    ROUND(max_exec_time::numeric, 2) AS max_ms,
    calls,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE stddev_exec_time > 0
  AND calls > 10
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY stddev_exec_time DESC
LIMIT 20;
"

run_analysis "Queries with High Performance Variability (High Stddev)" "$QUERY4" | tee -a "$REPORT_FILE"

# Analysis 5: Table Statistics (Size and Activity)
echo -e "${YELLOW}Analysis 5: Table Statistics (Size and Activity)${NC}"
echo ""

QUERY5="
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
    seq_scan,
    idx_scan,
    CASE
        WHEN seq_scan + idx_scan > 0
        THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0
    END AS index_usage_pct,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

run_analysis "Table Statistics (Size and Activity)" "$QUERY5" | tee -a "$REPORT_FILE"

# Analysis 6: Index Usage Statistics
echo -e "${YELLOW}Analysis 6: Index Usage Statistics${NC}"
echo ""

QUERY6="
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 10 THEN 'RARELY USED'
        ELSE 'ACTIVE'
    END AS usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
"

run_analysis "Index Usage Statistics" "$QUERY6" | tee -a "$REPORT_FILE"

# Analysis 7: Missing Indexes (Sequential Scans on Large Tables)
echo -e "${YELLOW}Analysis 7: Potential Missing Indexes (Large Tables with Sequential Scans)${NC}"
echo ""

QUERY7="
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    n_live_tup,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size,
    CASE
        WHEN seq_scan + idx_scan > 0
        THEN ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        ELSE 0
    END AS seq_scan_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 1000
  AND seq_scan > 0
ORDER BY seq_scan DESC, n_live_tup DESC
LIMIT 20;
"

run_analysis "Tables Potentially Missing Indexes (High Sequential Scans)" "$QUERY7" | tee -a "$REPORT_FILE"

# Analysis 8: Cache Hit Ratio
echo -e "${YELLOW}Analysis 8: Cache Hit Ratio (Should be > 99%)${NC}"
echo ""

QUERY8="
SELECT
    'index hit rate' AS metric,
    ROUND((SUM(idx_blks_hit)) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0) * 100, 2) AS ratio
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'table hit rate' AS metric,
    ROUND((SUM(heap_blks_hit)) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0) * 100, 2) AS ratio
FROM pg_statio_user_tables;
"

run_analysis "Cache Hit Ratio" "$QUERY8" | tee -a "$REPORT_FILE"

# Analysis 9: Database Size and Growth
echo -e "${YELLOW}Analysis 9: Database Size${NC}"
echo ""

QUERY9="
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = '$DB_NAME';
"

run_analysis "Database Size" "$QUERY9" | tee -a "$REPORT_FILE"

# Analysis 10: Blocking Queries (Current)
echo -e "${YELLOW}Analysis 10: Currently Blocking Queries${NC}"
echo ""

QUERY10="
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"

run_analysis "Currently Blocking Queries" "$QUERY10" | tee -a "$REPORT_FILE"

# Summary and Recommendations
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Analysis Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Count slow queries
SLOW_QUERY_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > $THRESHOLD_MS AND query NOT LIKE '%pg_stat_statements%';" | xargs)

echo -e "${BLUE}Statistics:${NC}"
echo "  Queries exceeding ${THRESHOLD_MS}ms threshold: $SLOW_QUERY_COUNT"
echo ""

# Get cache hit ratios
INDEX_HIT_RATE=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT ROUND((SUM(idx_blks_hit)) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0) * 100, 2) FROM pg_statio_user_indexes;" | xargs)
TABLE_HIT_RATE=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT ROUND((SUM(heap_blks_hit)) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0) * 100, 2) FROM pg_statio_user_tables;" | xargs)

echo "  Index cache hit rate: ${INDEX_HIT_RATE}%"
echo "  Table cache hit rate: ${TABLE_HIT_RATE}%"
echo ""

echo -e "${BLUE}Recommendations:${NC}"

if [ "$SLOW_QUERY_COUNT" -gt 10 ]; then
    echo -e "  ${RED}⚠${NC}  High number of slow queries detected (${SLOW_QUERY_COUNT})"
    echo "     - Review and optimize slow queries"
    echo "     - Consider adding missing indexes"
    echo "     - Analyze query execution plans with EXPLAIN ANALYZE"
fi

if (( $(echo "$INDEX_HIT_RATE < 99" | bc -l) )); then
    echo -e "  ${RED}⚠${NC}  Low index cache hit rate (${INDEX_HIT_RATE}%)"
    echo "     - Consider increasing shared_buffers"
    echo "     - Review index usage and add missing indexes"
fi

if (( $(echo "$TABLE_HIT_RATE < 99" | bc -l) )); then
    echo -e "  ${RED}⚠${NC}  Low table cache hit rate (${TABLE_HIT_RATE}%)"
    echo "     - Consider increasing shared_buffers and effective_cache_size"
fi

if [ "$SLOW_QUERY_COUNT" -le 10 ] && (( $(echo "$INDEX_HIT_RATE >= 99" | bc -l) )) && (( $(echo "$TABLE_HIT_RATE >= 99" | bc -l) )); then
    echo -e "  ${GREEN}✓${NC} Database performance looks good!"
    echo "     - Cache hit rates are excellent"
    echo "     - Limited number of slow queries"
fi

echo ""
echo -e "${BLUE}Report saved to:${NC} $REPORT_FILE"
echo ""

echo "=== Analysis Complete ==="
echo ""
echo "Next Steps:"
echo ""
echo "1. Review slow queries and optimize:"
echo "   - Add missing indexes"
echo "   - Rewrite inefficient queries"
echo "   - Use EXPLAIN ANALYZE to understand query plans"
echo ""
echo "2. For specific query analysis, use EXPLAIN:"
echo "   sudo -u postgres psql -d $DB_NAME"
echo "   EXPLAIN ANALYZE <your query>;"
echo ""
echo "3. Reset statistics to start fresh tracking:"
echo "   sudo -u postgres psql -d $DB_NAME -c 'SELECT pg_stat_statements_reset();'"
echo ""
echo "4. Run this analysis regularly (e.g., weekly) to monitor performance trends"
echo ""
