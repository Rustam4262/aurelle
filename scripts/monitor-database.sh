#!/bin/bash

# Database Connection Monitoring Script
# Checks PostgreSQL database connectivity

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"
STATE_FILE="/tmp/aurelle-db-alert.state"
ALERT_COOLDOWN=600  # 10 minutes between duplicate alerts

# Database connection details (from environment or default)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-aurelle_production}"
DB_USER="${DB_USER:-aurelle_user}"

# Load from .env if exists
if [ -f "/var/www/aurelle-production/.env" ]; then
    source "/var/www/aurelle-production/.env"
    # Parse DATABASE_URL if available
    if [ -n "$DATABASE_URL" ]; then
        # Extract connection details from DATABASE_URL
        # Format: postgresql://user:pass@host:port/dbname
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
    fi
fi

should_send_alert() {
    if [ ! -f "$STATE_FILE" ]; then
        return 0
    fi

    local last_alert=$(cat "$STATE_FILE")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_alert))

    [ $time_diff -gt $ALERT_COOLDOWN ]
}

record_alert() {
    date +%s > "$STATE_FILE"
}

clear_alert() {
    rm -f "$STATE_FILE"
}

# Check PostgreSQL connection
check_postgres_connection() {
    echo "Testing connection to PostgreSQL..."
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"

    # Method 1: Using pg_isready (if available)
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -q; then
            echo "✅ Database connection successful (pg_isready)"
            return 0
        else
            echo "❌ Database connection failed (pg_isready)"
            return 1
        fi
    fi

    # Method 2: Using psql
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
            echo "✅ Database connection successful (psql)"
            return 0
        else
            echo "❌ Database connection failed (psql)"
            return 1
        fi
    fi

    # Method 3: TCP connection test
    if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
        echo "✅ Database port is reachable (TCP)"
        return 0
    else
        echo "❌ Cannot reach database port (TCP)"
        return 1
    fi
}

# Check database statistics
check_database_stats() {
    if ! command -v psql &> /dev/null; then
        echo "psql not available, skipping stats check"
        return
    fi

    echo ""
    echo "Database Statistics:"

    # Get database size
    local db_size=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tr -d ' ')

    if [ -n "$db_size" ]; then
        echo "  Database size: $db_size"
    fi

    # Get connection count
    local connections=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')

    if [ -n "$connections" ]; then
        echo "  Active connections: $connections"

        # Alert if too many connections (> 80)
        if [ "$connections" -gt 80 ]; then
            description="*Database:* ${DB_NAME}
*Host:* ${DB_HOST}
*Active Connections:* ${connections}

*Warning:* High number of database connections"

            bash "$TELEGRAM_SCRIPT" "warning" "⚠️  High Database Connections" "$description"
        fi
    fi

    # Check for long-running queries
    local long_queries=$(PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';" 2>/dev/null | tr -d ' ')

    if [ -n "$long_queries" ] && [ "$long_queries" -gt 0 ]; then
        echo "  Long-running queries: $long_queries"

        description="*Database:* ${DB_NAME}
*Long-running queries:* ${long_queries}
*Duration:* > 5 minutes

*Warning:* Queries running for extended period"

        bash "$TELEGRAM_SCRIPT" "warning" "⚠️  Long-Running Database Queries" "$description"
    fi
}

# Main check function
check_database() {
    if check_postgres_connection; then
        # Connection successful
        if [ -f "$STATE_FILE" ]; then
            echo "✅ Database connection recovered"
            clear_alert

            description="*Database:* ${DB_NAME}
*Host:* ${DB_HOST}:${DB_PORT}
*Status:* Connection restored"

            bash "$TELEGRAM_SCRIPT" "success" "Database Connection Recovered" "$description"
        fi

        # Check database stats
        check_database_stats

    else
        # Connection failed
        echo "🚨 Database connection failure!"

        if should_send_alert; then
            # Check if PostgreSQL service is running
            local pg_status="Unknown"
            if systemctl is-active --quiet postgresql; then
                pg_status="Running"
            else
                pg_status="Not Running"
            fi

            description="*Database:* ${DB_NAME}
*Host:* ${DB_HOST}:${DB_PORT}
*Status:* Connection failed
*PostgreSQL Service:* ${pg_status}

*Action Required:*
1. Check PostgreSQL service status
2. Verify network connectivity
3. Check database credentials
4. Review PostgreSQL logs

\`\`\`bash
sudo systemctl status postgresql
sudo journalctl -u postgresql -n 50
\`\`\`"

            bash "$TELEGRAM_SCRIPT" "critical" "🚨 Database Connection Failed" "$description"
            record_alert
        else
            echo "Alert in cooldown period, skipping..."
        fi
    fi
}

# Main execution
echo "=== Database Connection Monitor ==="
echo "Time: $(date)"
echo ""

check_database

echo ""
echo "=== Monitor Complete ==="
