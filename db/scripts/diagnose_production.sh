#!/usr/bin/env bash
# Diagnostic script to understand production database state
# Run this BEFORE any destructive operations

set -e

echo "=========================================="
echo "AURELLE Production Database Diagnostic"
echo "=========================================="
echo "Date: $(date)"
echo ""

# Find database container
echo "🔍 Step 1: Finding database container..."
DB_CONTAINER=$(sudo docker ps --filter name=db --filter name=postgres --format '{{.Names}}' | head -1)

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ ERROR: No database container found"
    echo "   Run: sudo docker ps"
    exit 1
fi

echo "✅ Found container: $DB_CONTAINER"
echo ""

# Get database name and user from container env
echo "🔍 Step 2: Getting database credentials..."
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# List all tables
echo "📊 Step 3: Listing all tables..."
sudo docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"
echo ""

# Count data in key tables
echo "📈 Step 4: Data counts..."
sudo docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'masters', COUNT(*) FROM masters
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'time_slots', COUNT(*) FROM time_slots;
"
echo ""

# Find admin user(s)
echo "👤 Step 5: Finding admin user(s)..."
sudo docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT id, name, phone, email, role, is_active, created_at
FROM users
WHERE role = 'admin'
ORDER BY id;
"
echo ""

# Database size
echo "💾 Step 6: Database size..."
sudo docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as database_size;
"
echo ""

# Check for foreign key constraints
echo "🔗 Step 7: Foreign key constraints..."
sudo docker exec -t $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
"
echo ""

echo "=========================================="
echo "Summary for Wipe Plan:"
echo "=========================================="
echo "Container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
echo "Next steps:"
echo "1. Review admin user ID(s) above"
echo "2. Create full backup (backup_before_wipe.sh)"
echo "3. Dump schema (dump_schema_from_prod.sh)"
echo "4. Execute wipe (wipe_production_data.sh)"
echo ""
