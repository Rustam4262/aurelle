# Deployment Steps for Booking Fix

## Issue

Booking creation was failing with error:

```
null value in column "master_id" of relation "bookings" violates not-null constraint
```

## Fix Applied

Made `master_id` column nullable in the bookings table to allow booking without specific master selection.

## Steps to Apply on Production Server

### 1. Backup Database (already done)

Backup created at: `/root/backups/backup_before_update_20260105_005003.sql`

### 2. Apply Database Migration

SSH to production server and run:

```bash
# Apply the migration
docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "ALTER TABLE bookings ALTER COLUMN master_id DROP NOT NULL;"

# Verify the change
docker exec aurelle_postgres_1 psql -U aurelle_user -d aurelle -c "\d bookings" | grep master_id
```

Expected output after verification:

```
 master_id           | varchar                  |           |          |
```

(Note: NO "not null" in the constraint column)

### 3. Update Application Code

```bash
cd /var/www/aurelle
git pull origin main
```

### 4. Copy Updated Files to Container

```bash
# Copy schema file
docker cp /var/www/aurelle/shared/schema.ts aurelle_app_1:/app/shared/schema.ts
```

### 5. Rebuild Application

```bash
docker exec aurelle_app_1 npm run build
```

### 6. Restart Container

```bash
docker restart aurelle_app_1
```

### 7. Verify Fix

Check the logs:

```bash
docker logs -f --tail=50 aurelle_app_1
```

Try creating a booking without selecting a master from the client interface.

## Rollback Plan (if needed)

If something goes wrong:

```bash
# Restore database
docker exec -i aurelle_postgres_1 psql -U aurelle_user -d aurelle < /root/backups/backup_before_update_20260105_005003.sql

# Revert code
cd /var/www/aurelle
git checkout c1459452

# Rebuild
docker exec aurelle_app_1 npm run build
docker restart aurelle_app_1
```
