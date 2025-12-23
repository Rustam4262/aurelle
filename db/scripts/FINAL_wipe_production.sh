#!/usr/bin/env bash
# AURELLE Production Data Wipe - FINAL VERSION
# Based on actual production schema diagnostics
#
# Container: beauty_db_prod
# Database: beauty_salon_db
# User: beauty_user
# Admin ID: 14 (phone: +998932611804)
#
# Tables: 22 total (21 + alembic_version)

set -euo pipefail

# Configuration
DB_CONTAINER="beauty_db_prod"
DB_NAME="beauty_salon_db"
DB_USER="beauty_user"
ADMIN_ID=14  # ID from production diagnostic
ADMIN_PHONE="+998932611804"  # Verified admin phone

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/root/backups/aurelle"
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "AURELLE Production Data Wipe"
echo "=========================================="
echo "Date: $(date)"
echo "Container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo "Admin to preserve: ID=$ADMIN_ID ($ADMIN_PHONE)"
echo ""

# Safety check
read -p "⚠️  This will DELETE ALL DATA except admin user $ADMIN_ID. Type 'WIPE' to confirm: " CONFIRM
if [ "$CONFIRM" != "WIPE" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo ""
echo "============================================"
echo "Step 1/7: Pre-flight checks"
echo "============================================"

# Check container exists
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    echo "❌ ERROR: Container $DB_CONTAINER not found"
    docker ps
    exit 1
fi
echo "✅ Container found: $DB_CONTAINER"

# Check admin exists
ADMIN_CHECK=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -tAc \
    "SELECT COUNT(*) FROM users WHERE id=$ADMIN_ID AND role='ADMIN';")

if [ "$ADMIN_CHECK" != "1" ]; then
    echo "❌ ERROR: Admin user ID $ADMIN_ID not found or not ADMIN role"
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c \
        "SELECT id, phone, role FROM users WHERE role='ADMIN';"
    exit 1
fi
echo "✅ Admin user verified: ID=$ADMIN_ID"

echo ""
echo "============================================"
echo "Step 2/7: Create full backup (custom format)"
echo "============================================"

BACKUP_FILE="$BACKUP_DIR/BEFORE_WIPE_${TIMESTAMP}.dump"
docker exec $DB_CONTAINER pg_dump \
    -U $DB_USER -d $DB_NAME \
    --format=custom \
    > "$BACKUP_FILE"

if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
    echo "❌ ERROR: Backup failed or empty"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

echo ""
echo "============================================"
echo "Step 3/7: Create schema dump"
echo "============================================"

SCHEMA_FILE="$BACKUP_DIR/000_schema_${TIMESTAMP}.sql"
docker exec $DB_CONTAINER pg_dump \
    -U $DB_USER -d $DB_NAME \
    --schema-only --no-owner --no-privileges \
    > "$SCHEMA_FILE"

SCHEMA_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)
echo "✅ Schema dumped: $SCHEMA_FILE ($SCHEMA_SIZE)"

echo ""
echo "============================================"
echo "Step 4/7: Show current data counts"
echo "============================================"

docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<SQL
SELECT 'BEFORE WIPE - Data Counts:' as status;
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'masters', COUNT(*) FROM masters
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
ORDER BY table_name;
SQL

echo ""
echo "============================================"
echo "Step 5/7: Execute data wipe (transactional)"
echo "============================================"

docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<SQL
BEGIN;

-- Step 5.1: Truncate all tables in correct FK order
-- Children first, parents last

-- Level 1: Deepest children (no dependencies)
TRUNCATE TABLE consent_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_consents RESTART IDENTITY CASCADE;
TRUNCATE TABLE idempotency_keys RESTART IDENTITY CASCADE;
TRUNCATE TABLE login_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE;
TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;

-- Level 2: Notification and booking-related
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;

-- Level 3: Reviews (depends on bookings, masters, salons, users)
TRUNCATE TABLE reviews RESTART IDENTITY CASCADE;

-- Level 4: Chat messages (depends on salons, users)
TRUNCATE TABLE chat_messages RESTART IDENTITY CASCADE;

-- Level 5: Bookings (depends on users, masters, salons, services)
TRUNCATE TABLE bookings RESTART IDENTITY CASCADE;

-- Level 6: Time slots and schedules (depend on masters)
TRUNCATE TABLE time_slots RESTART IDENTITY CASCADE;
TRUNCATE TABLE work_shifts RESTART IDENTITY CASCADE;
TRUNCATE TABLE master_day_offs RESTART IDENTITY CASCADE;
TRUNCATE TABLE master_schedules RESTART IDENTITY CASCADE;

-- Level 7: Service-master links (depends on services, masters)
TRUNCATE TABLE service_masters RESTART IDENTITY CASCADE;

-- Level 8: Services (depends on salons)
TRUNCATE TABLE services RESTART IDENTITY CASCADE;

-- Level 9: Masters (depends on users, salons)
TRUNCATE TABLE masters RESTART IDENTITY CASCADE;

-- Level 10: Salon-related (depends on users for FKs)
TRUNCATE TABLE promo_codes RESTART IDENTITY CASCADE;
TRUNCATE TABLE favorites RESTART IDENTITY CASCADE;

-- Level 11: Salons (depends on users for owner_id, created_by, etc.)
TRUNCATE TABLE salons RESTART IDENTITY CASCADE;

-- Step 5.2: Delete all users except admin
DELETE FROM users WHERE id <> $ADMIN_ID;

-- Step 5.3: Ensure admin is active
UPDATE users SET is_active = TRUE WHERE id = $ADMIN_ID;

-- Verify
SELECT 'WIPE TRANSACTION - Verification:' as status;
SELECT id, phone, email, role, is_active FROM users;

COMMIT;
SQL

if [ $? -ne 0 ]; then
    echo "❌ ERROR: Wipe transaction failed and was rolled back"
    echo "Database unchanged. Safe to retry."
    exit 1
fi

echo "✅ Data wipe completed successfully"

echo ""
echo "============================================"
echo "Step 6/7: Verify final state"
echo "============================================"

docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<SQL
SELECT 'AFTER WIPE - Data Counts:' as status;
SELECT
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'salons', COUNT(*) FROM salons
UNION ALL SELECT 'masters', COUNT(*) FROM masters
UNION ALL SELECT 'services', COUNT(*) FROM services
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
ORDER BY table_name;

SELECT 'Preserved Admin User:' as info;
SELECT id, phone, email, role, is_active FROM users WHERE id = $ADMIN_ID;
SQL

echo ""
echo "============================================"
echo "Step 7/7: Summary & Next Steps"
echo "============================================"
echo ""
echo "✅ WIPE COMPLETE"
echo ""
echo "Backups created:"
echo "  - Full backup: $BACKUP_FILE"
echo "  - Schema dump: $SCHEMA_FILE"
echo ""
echo "Database state:"
echo "  - Users: 1 (admin ID $ADMIN_ID only)"
echo "  - All other tables: empty"
echo "  - Sequences: reset to 1"
echo ""
echo "Next steps:"
echo "  1. Test admin login:"
echo "     curl -X POST 'http://localhost:8000/api/auth/login' \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"phone\":\"$ADMIN_PHONE\",\"password\":\"Admin2025\"}'"
echo ""
echo "  2. Download schema to local:"
echo "     scp root@89.39.94.194:$SCHEMA_FILE ./db/schema/000_schema.sql"
echo ""
echo "  3. Reset local database:"
echo "     .\\db\\scripts\\reset_local_db.ps1"
echo ""
echo "  4. Start fresh user onboarding"
echo ""
echo "=========================================="
echo "Wipe completed at: $(date)"
echo "=========================================="
