# AURELLE Database Performance Tuning Guide

Complete guide for optimizing PostgreSQL database performance for the AURELLE Beauty Salon Platform.

**Generated:** 2026-01-11
**Target:** PostgreSQL 14+
**Goal:** Achieve consistent query performance < 50ms

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [PostgreSQL Configuration Tuning](#postgresql-configuration-tuning)
4. [Query Performance Monitoring](#query-performance-monitoring)
5. [Index Optimization](#index-optimization)
6. [Connection Pooling with PgBouncer](#connection-pooling-with-pgbouncer)
7. [Database Maintenance](#database-maintenance)
8. [Performance Analysis](#performance-analysis)
9. [Common Performance Issues](#common-performance-issues)
10. [Monitoring and Alerts](#monitoring-and-alerts)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### Performance Goals

- **Query Response Time:** < 50ms for 95th percentile
- **Connection Pool:** 25 connections per database
- **Cache Hit Ratio:** > 99% for both index and table access
- **Database Size:** Efficiently handle 100K+ records
- **Concurrent Users:** Support 100+ simultaneous users

### System Requirements

- **RAM:** Minimum 8GB (16GB recommended)
- **Storage:** SSD strongly recommended
- **CPU:** 4+ cores
- **PostgreSQL:** Version 14 or higher

---

## Quick Start

### 1. Initial Setup (Run Once)

```bash
# Step 1: Tune PostgreSQL configuration
cd /path/to/aurelle
bash scripts/tune-postgres.sh

# Step 2: Enable pg_stat_statements extension
bash scripts/setup-pg-stat-statements.sh

# Step 3: Add performance indexes
sudo -u postgres psql -d aurelle -f db/add-performance-indexes.sql

# Step 4: Setup VACUUM automation
bash scripts/setup-vacuum-automation.sh

# Step 5: (Optional) Setup PgBouncer connection pooling
bash scripts/setup-pgbouncer.sh
```

### 2. Regular Monitoring

```bash
# Analyze slow queries (run weekly)
bash scripts/analyze-slow-queries.sh

# Check database health (run daily)
sudo -u postgres psql -d aurelle -c "SELECT * FROM slow_queries LIMIT 10;"
```

---

## PostgreSQL Configuration Tuning

### Automatic Tuning

The `tune-postgres.sh` script automatically configures PostgreSQL based on your system resources:

```bash
bash scripts/tune-postgres.sh
```

**What it does:**
- Detects system RAM and CPU cores
- Calculates optimal settings
- Creates `/etc/postgresql/14/main/conf.d/aurelle-tuning.conf`
- Validates configuration
- Restarts PostgreSQL

### Key Configuration Parameters

#### Memory Settings

```ini
# 25% of total RAM for data caching
shared_buffers = 2GB

# 50-75% of total RAM for query planner estimates
effective_cache_size = 6GB

# RAM / 16 for maintenance operations (capped at 2GB)
maintenance_work_mem = 512MB

# RAM / (max_connections * 2) for query operations
work_mem = 32MB
```

#### WAL (Write-Ahead Logging) Settings

```ini
# Automatic WAL buffer sizing
wal_buffers = 16MB

# Larger WAL = better performance, less frequent checkpoints
max_wal_size = 4GB
min_wal_size = 1GB

# Spread checkpoints to avoid I/O spikes
checkpoint_completion_target = 0.9
```

#### Query Planner Settings

```ini
# Lower for SSD (1.1), higher for HDD (4.0)
random_page_cost = 1.1

# More accurate statistics = better query plans
default_statistics_target = 100
```

#### Parallel Query Settings

```ini
# Match CPU core count
max_worker_processes = 8
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
```

### Manual Configuration

If you need to tune manually, edit the configuration file:

```bash
sudo nano /etc/postgresql/14/main/conf.d/aurelle-tuning.conf
```

Then reload PostgreSQL:

```bash
sudo systemctl reload postgresql
```

To verify settings:

```bash
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
```

---

## Query Performance Monitoring

### Enable pg_stat_statements

The `pg_stat_statements` extension tracks all queries and their performance metrics.

**Setup:**

```bash
bash scripts/setup-pg-stat-statements.sh
```

**What it creates:**
- Extension in database
- Helper views: `slow_queries`, `frequent_queries`, `expensive_queries`
- Query statistics tracking

### View Slow Queries

```sql
-- Top 10 slowest queries
SELECT * FROM slow_queries LIMIT 10;

-- Queries slower than 50ms
SELECT
    avg_ms,
    calls,
    total_ms,
    percentage,
    query
FROM slow_queries
WHERE avg_ms > 50
LIMIT 20;
```

### View Most Frequent Queries

```sql
-- Top 10 most called queries
SELECT * FROM frequent_queries LIMIT 10;
```

### View Most Expensive Queries (Total Time)

```sql
-- Queries consuming the most total time
SELECT * FROM expensive_queries LIMIT 10;
```

### Reset Statistics

```sql
-- Start fresh tracking (useful after optimization)
SELECT pg_stat_statements_reset();
```

---

## Index Optimization

### Automated Index Creation

The `add-performance-indexes.sql` migration adds all recommended indexes:

```bash
sudo -u postgres psql -d aurelle -f db/add-performance-indexes.sql
```

### Index Strategy

#### 1. Bookings Table (High Traffic)

```sql
-- Composite indexes for common queries
CREATE INDEX idx_bookings_salon_date_status
  ON bookings (salon_id, booking_date, status);

CREATE INDEX idx_bookings_master_date_status
  ON bookings (master_id, booking_date, status);

-- Partial index for active bookings
CREATE INDEX idx_bookings_active
  ON bookings (booking_date, start_time)
  WHERE status IN ('pending', 'confirmed');
```

**Why:** These indexes optimize:
- Calendar availability queries
- Master scheduling
- Conflict detection
- Client booking history

#### 2. Reviews Table

```sql
-- Composite index for salon reviews
CREATE INDEX idx_reviews_salon_rating_created
  ON reviews (salon_id, rating, created_at DESC);

-- Composite index for master reviews
CREATE INDEX idx_reviews_master_rating_created
  ON reviews (master_id, rating, created_at DESC);
```

**Why:** Optimizes:
- Review listings sorted by date
- Average rating calculations
- Filtered reviews (e.g., 5-star only)

#### 3. Geospatial Queries (Salons)

```sql
-- GiST index for location-based search
CREATE INDEX idx_salons_location_gist
  ON salons USING gist (
    ll_to_earth(CAST(latitude AS float8), CAST(longitude AS float8))
  );
```

**Why:** Enables fast "salons near me" queries.

### Check Index Usage

```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Check Missing Indexes

```sql
-- Tables with high sequential scans (might need indexes)
SELECT
    schemaname,
    tablename,
    seq_scan,
    idx_scan,
    n_live_tup,
    CASE
        WHEN seq_scan + idx_scan > 0
        THEN ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        ELSE 0
    END AS seq_scan_pct
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND n_live_tup > 1000
ORDER BY seq_scan DESC;
```

---

## Connection Pooling with PgBouncer

### Why Use PgBouncer?

- **Reduces Connection Overhead:** Reuses database connections
- **Handles More Clients:** Support 200+ client connections with 25 server connections
- **Improves Performance:** Faster connection establishment
- **Prevents Exhaustion:** Protects database from too many connections

### Setup PgBouncer

```bash
bash scripts/setup-pgbouncer.sh
```

**What it does:**
- Installs PgBouncer
- Configures connection pooling (transaction mode)
- Sets pool size to 25 connections
- Creates systemd service
- Tests connection

### Configuration

**Key Settings** (in `configs/pgbouncer.ini`):

```ini
# Pooling mode (transaction = best for web apps)
pool_mode = transaction

# Maximum client connections
max_client_conn = 200

# Connections per database
default_pool_size = 25

# Minimum connections to keep
min_pool_size = 5
```

### Update Application

**Before PgBouncer:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/aurelle
```

**After PgBouncer:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:6432/aurelle
```

### Monitor PgBouncer

```bash
# View pool statistics
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "SHOW POOLS;"

# View client connections
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "SHOW CLIENTS;"

# View server connections
psql -h 127.0.0.1 -p 6432 -U postgres pgbouncer -c "SHOW SERVERS;"
```

---

## Database Maintenance

### Automated VACUUM

The `setup-vacuum-automation.sh` script sets up automated maintenance:

```bash
bash scripts/setup-vacuum-automation.sh
```

**Schedule:**
- **Daily VACUUM ANALYZE:** Every day at 2 AM
- **Weekly VACUUM FULL:** Every Sunday at 3 AM
- **Monthly REINDEX:** First day of month at 4 AM

### Manual VACUUM

```bash
# Regular VACUUM ANALYZE (non-blocking)
bash scripts/vacuum-database.sh

# VACUUM FULL (locks tables, reclaims disk space)
bash scripts/vacuum-full-database.sh

# REINDEX (rebuilds indexes)
bash scripts/reindex-database.sh
```

### Check Table Bloat

```sql
SELECT
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;
```

**Action Required When:**
- `dead_pct` > 10%: Run VACUUM ANALYZE
- `dead_pct` > 20%: Run VACUUM FULL (during maintenance window)

---

## Performance Analysis

### Automated Analysis

```bash
# Run comprehensive performance analysis
bash scripts/analyze-slow-queries.sh
```

**What it analyzes:**
1. Slowest queries (by average time)
2. Most time-consuming queries (by total time)
3. Most frequently called queries
4. Queries with high variability
5. Table statistics (size and activity)
6. Index usage statistics
7. Missing indexes detection
8. Cache hit ratios
9. Database size
10. Blocking queries

**Output:** Generates detailed report in `/var/log/aurelle-monitoring/slow_queries_TIMESTAMP.txt`

### Cache Hit Ratio

**Target:** > 99% for both index and table cache

```sql
-- Check cache hit ratios
SELECT
    'index hit rate' AS metric,
    ROUND((SUM(idx_blks_hit)) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0) * 100, 2) AS ratio
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'table hit rate' AS metric,
    ROUND((SUM(heap_blks_hit)) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0) * 100, 2) AS ratio
FROM pg_statio_user_tables;
```

**If < 99%:**
- Increase `shared_buffers`
- Increase `effective_cache_size`
- Add missing indexes
- Add more RAM

### Query Plan Analysis

Use `EXPLAIN ANALYZE` to understand how queries execute:

```sql
-- Analyze a specific query
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE salon_id = 'some-id'
  AND booking_date >= '2026-01-15'
  AND status = 'confirmed';
```

**Look for:**
- **Seq Scan** → Add index
- **High cost** → Optimize query or add index
- **Many rows** → Add WHERE filters

---

## Common Performance Issues

### Issue 1: Slow Booking Queries

**Symptom:** Booking availability queries taking > 100ms

**Solution:**

```sql
-- Ensure these indexes exist
CREATE INDEX IF NOT EXISTS idx_bookings_master_date_status
  ON bookings (master_id, booking_date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_salon_date_status
  ON bookings (salon_id, booking_date, status);

-- Run ANALYZE to update statistics
ANALYZE bookings;
```

### Issue 2: Slow Salon Search

**Symptom:** Map/search queries taking > 200ms

**Solution:**

```sql
-- Ensure geospatial index exists
CREATE INDEX IF NOT EXISTS idx_salons_location_gist
  ON salons USING gist (
    ll_to_earth(CAST(latitude AS float8), CAST(longitude AS float8))
  );

-- Ensure active salons index exists
CREATE INDEX IF NOT EXISTS idx_salons_active_rating
  ON salons (average_rating DESC) WHERE is_active = true;
```

### Issue 3: Too Many Database Connections

**Symptom:** `FATAL: too many connections` errors

**Solution:**

```bash
# Setup PgBouncer connection pooling
bash scripts/setup-pgbouncer.sh

# Update application to use PgBouncer port (6432)
DATABASE_URL=postgresql://user:pass@localhost:6432/aurelle
```

### Issue 4: High Table Bloat

**Symptom:** Large `n_dead_tup` count, slow queries

**Solution:**

```bash
# Run VACUUM ANALYZE immediately
bash scripts/vacuum-database.sh

# For severe bloat (> 20%), run VACUUM FULL during low traffic
bash scripts/vacuum-full-database.sh

# Ensure automated VACUUM is running
bash scripts/setup-vacuum-automation.sh
```

### Issue 5: Low Cache Hit Ratio

**Symptom:** Cache hit ratio < 99%

**Solution:**

```bash
# Increase shared_buffers and effective_cache_size
# Run tuning script to recalculate based on RAM
bash scripts/tune-postgres.sh

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql
```

---

## Monitoring and Alerts

### Daily Checks

```bash
# Run slow query analysis
bash scripts/analyze-slow-queries.sh

# Check cache hit ratio
sudo -u postgres psql -d aurelle -c "
SELECT 'index' AS type, ROUND(100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0), 2) AS hit_ratio FROM pg_statio_user_indexes
UNION ALL
SELECT 'table' AS type, ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0), 2) AS hit_ratio FROM pg_statio_user_tables;
"
```

### Weekly Checks

```bash
# Review slow queries
sudo -u postgres psql -d aurelle -c "SELECT * FROM slow_queries WHERE avg_ms > 50 LIMIT 20;"

# Check table bloat
sudo -u postgres psql -d aurelle -c "
SELECT tablename, n_dead_tup, ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;
"

# Check database size growth
sudo -u postgres psql -d aurelle -c "SELECT pg_size_pretty(pg_database_size('aurelle'));"
```

### Alerts Integration

The infrastructure monitoring system (Task #45) includes database monitoring:

```bash
# Database connection check (every 5 minutes)
# See: scripts/monitor-database.sh
```

**Telegram alerts sent for:**
- Database connection failures
- Slow health endpoint responses
- Connection pool exhaustion

---

## Troubleshooting

### PostgreSQL Not Starting After Tuning

```bash
# Check PostgreSQL logs
sudo tail -100 /var/log/postgresql/postgresql-14-main.log

# Validate configuration
sudo -u postgres /usr/lib/postgresql/14/bin/postgres -C config_file

# Restore backup if needed
sudo cp /etc/postgresql/14/main/postgresql.conf.backup.TIMESTAMP /etc/postgresql/14/main/postgresql.conf
sudo systemctl restart postgresql
```

### PgBouncer Connection Errors

```bash
# Check PgBouncer status
sudo systemctl status pgbouncer

# View PgBouncer logs
sudo journalctl -u pgbouncer -f

# Test direct PostgreSQL connection
psql -h localhost -p 5432 -U postgres -d aurelle

# Test PgBouncer connection
psql -h localhost -p 6432 -U postgres -d aurelle
```

### Slow Queries Not Appearing

```bash
# Verify pg_stat_statements is enabled
sudo -u postgres psql -d aurelle -c "SELECT COUNT(*) FROM pg_stat_statements;"

# If 0 or error, check extension
sudo -u postgres psql -d aurelle -c "SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';"

# If not installed, run setup script
bash scripts/setup-pg-stat-statements.sh
```

### High Memory Usage

```bash
# Check current memory settings
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW work_mem;"

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# If too high, reduce work_mem or use PgBouncer
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Query Response (p95) | < 50ms | < 100ms |
| Cache Hit Ratio | > 99% | > 95% |
| Database Connections | < 30 | < 80 |
| Dead Tuples | < 10% | < 20% |
| Index Usage | > 90% | > 70% |

### Testing Query Performance

```sql
-- Time a query
\timing on
SELECT * FROM bookings
WHERE booking_date >= CURRENT_DATE
  AND status IN ('pending', 'confirmed')
LIMIT 100;

-- Check if using indexes
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM bookings
WHERE booking_date >= CURRENT_DATE
  AND status IN ('pending', 'confirmed')
LIMIT 100;
```

---

## Additional Resources

### PostgreSQL Documentation

- [Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [Tuning Your PostgreSQL Server](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)

### Tools

- **PgBouncer:** Connection pooling
- **pg_stat_statements:** Query performance tracking
- **EXPLAIN ANALYZE:** Query plan analysis
- **pgAdmin:** GUI for database management
- **Netdata/Grafana:** Real-time monitoring dashboards

### Related Guides

- [Infrastructure Monitoring Guide](./INFRASTRUCTURE_MONITORING_GUIDE.md) - System monitoring and alerts
- [CI/CD Setup Guide](./CI_CD_SETUP_GUIDE.md) - Automated deployments
- [Sentry Setup Guide](./SENTRY_SETUP_GUIDE.md) - Error tracking

---

## Summary

### Files Created

1. **Scripts:**
   - `scripts/tune-postgres.sh` - Automatic PostgreSQL tuning
   - `scripts/setup-pg-stat-statements.sh` - Query monitoring setup
   - `scripts/analyze-slow-queries.sh` - Performance analysis
   - `scripts/setup-vacuum-automation.sh` - Automated maintenance
   - `scripts/vacuum-database.sh` - Manual VACUUM
   - `scripts/vacuum-full-database.sh` - Deep clean VACUUM FULL
   - `scripts/reindex-database.sh` - Index rebuilding
   - `scripts/setup-pgbouncer.sh` - Connection pooling setup

2. **Configurations:**
   - `configs/pgbouncer.ini` - PgBouncer connection pooler config
   - `/etc/postgresql/14/main/conf.d/aurelle-tuning.conf` - PostgreSQL tuning (auto-generated)

3. **Migrations:**
   - `db/add-performance-indexes.sql` - Performance indexes

4. **Documentation:**
   - `DATABASE_PERFORMANCE_GUIDE.md` - This guide

### Quick Command Reference

```bash
# One-time setup
bash scripts/tune-postgres.sh
bash scripts/setup-pg-stat-statements.sh
sudo -u postgres psql -d aurelle -f db/add-performance-indexes.sql
bash scripts/setup-vacuum-automation.sh
bash scripts/setup-pgbouncer.sh  # Optional

# Regular monitoring
bash scripts/analyze-slow-queries.sh

# Manual maintenance
bash scripts/vacuum-database.sh
bash scripts/vacuum-full-database.sh
bash scripts/reindex-database.sh

# Query analysis
sudo -u postgres psql -d aurelle -c "SELECT * FROM slow_queries LIMIT 10;"
sudo -u postgres psql -d aurelle -c "SELECT * FROM frequent_queries LIMIT 10;"
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Maintained By:** AURELLE DevOps Team
