#!/usr/bin/env bash
# DESTRUCTIVE: Wipe all production data except admin user
# MUST run backup_before_wipe.sh first!

set -e

echo "=========================================="
echo "⚠️  DESTRUCTIVE OPERATION WARNING ⚠️"
echo "=========================================="
echo ""
echo "This script will DELETE ALL DATA except admin user!"
echo ""
echo "Requirements:"
echo "1. ✅ Backup created (backup_before_wipe.sh)"
echo "2. ✅ Schema dumped (dump_schema_from_prod.sh)"
echo "3. ✅ Admin user ID known"
echo ""

# Safety check: require confirmation
read -p "Have you created a backup? (yes/no): " BACKUP_CONFIRM
if [ "$BACKUP_CONFIRM" != "yes" ]; then
    echo "❌ Please run backup_before_wipe.sh first!"
    exit 1
fi

read -p "Enter ADMIN USER ID to preserve (check with diagnose_production.sh): " ADMIN_ID
if [ -z "$ADMIN_ID" ]; then
    echo "❌ Admin ID required!"
    exit 1
fi

read -p "⚠️  Type 'WIPE' to confirm data deletion: " CONFIRM
if [ "$CONFIRM" != "WIPE" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

# Auto-detect database
DB_CONTAINER=$(sudo docker ps --filter name=db --filter name=postgres --format '{{.Names}}' | head -1)
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

echo ""
echo "Container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Preserving admin ID: $ADMIN_ID"
echo ""

# Final confirmation
read -p "Proceed with wipe? (yes/no): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "yes" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo ""
echo "🔥 Starting data wipe..."
echo ""

# Execute wipe in transaction
sudo docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<SQL
BEGIN;

-- Diagnostic: show current counts
SELECT 'BEFORE WIPE:' as status;
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings;

-- Universal table truncation (excludes users and alembic_version)
DO \$\$
DECLARE
  r RECORD;
BEGIN
  -- Disable FK checks temporarily
  SET session_replication_role = replica;

  -- Truncate all tables except users and alembic_version
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('users', 'alembic_version')
  LOOP
    EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
    RAISE NOTICE 'Truncated table: %', r.tablename;
  END LOOP;

  -- Re-enable FK checks
  SET session_replication_role = origin;
END \$\$;

-- Delete all users except admin
DELETE FROM users WHERE id <> $ADMIN_ID;

-- Ensure admin is active
UPDATE users
SET is_active = TRUE
WHERE id = $ADMIN_ID;

-- Diagnostic: show final counts
SELECT 'AFTER WIPE:' as status;
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings;

-- Verify admin user
SELECT 'ADMIN USER:' as info;
SELECT id, name, phone, role, is_active FROM users WHERE id = $ADMIN_ID;

COMMIT;
SQL

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ WIPE COMPLETE"
    echo "=========================================="
    echo ""
    echo "Summary:"
    echo "- All data deleted except admin user"
    echo "- Admin ID $ADMIN_ID preserved"
    echo "- Database ready for fresh data"
    echo ""
    echo "Next steps:"
    echo "1. Verify admin login works"
    echo "2. Start fresh user onboarding"
    echo "3. Update local DB: ./db/scripts/reset_local_db.ps1"
    echo ""
else
    echo ""
    echo "❌ WIPE FAILED - Transaction rolled back"
    echo "Database unchanged, safe to retry."
    exit 1
fi
