# 🔥 Production Data Wipe & Reset Procedure

**Purpose:** Clean slate - delete all users/salons/bookings, preserve only admin, sync schema to local

**Risk Level:** 🔴 **DESTRUCTIVE** - Cannot be undone without backup

**Time Required:** 15-20 minutes

---

## ⚠️ Pre-Flight Checklist

Before you begin:

- [ ] You understand this will DELETE ALL DATA except admin user
- [ ] You have SSH access to production server
- [ ] You have verified current admin credentials work
- [ ] You are ready to start fresh with new registrations
- [ ] No active users are currently using the system

---

## 📋 Step-by-Step Procedure

### Step 0: Upload Scripts to Server (5 min)

From your local machine:

```bash
# Upload all scripts
scp db/scripts/diagnose_production.sh ubuntu@188.225.83.33:/tmp/
scp db/scripts/backup_before_wipe.sh ubuntu@188.225.83.33:/tmp/
scp db/scripts/wipe_production_data.sh ubuntu@188.225.83.33:/tmp/

# SSH to server
ssh ubuntu@188.225.83.33

# Move scripts and make executable
sudo mv /tmp/diagnose_production.sh /root/diagnose_production.sh
sudo mv /tmp/backup_before_wipe.sh /root/backup_before_wipe.sh
sudo mv /tmp/wipe_production_data.sh /root/wipe_production_data.sh

sudo chmod +x /root/diagnose_production.sh
sudo chmod +x /root/backup_before_wipe.sh
sudo chmod +x /root/wipe_production_data.sh
```

---

### Step 1: Diagnose Current State (2 min)

```bash
sudo /root/diagnose_production.sh
```

**Expected output:**
- List of all tables
- Data counts (users, salons, bookings, etc.)
- Admin user details (ID, name, phone, email)

**❗ IMPORTANT: Note the ADMIN USER ID** (you'll need it for wipe script)

Example output:
```
👤 Step 5: Finding admin user(s)...
 id |    name     |     phone      |        email         | role  | is_active
----+-------------+----------------+----------------------+-------+-----------
 14 | Admin User  | +998901234567  | admin@aurelle.uz     | admin | t
```

**Admin ID in this example: 14**

---

### Step 2: Create Full Backup (2 min) 🔴 CRITICAL

```bash
sudo /root/backup_before_wipe.sh
```

**Expected output:**
```
✅ Backup created: /root/backups/beauty_salon/BEFORE_WIPE_20251223_HHMMSS.dump
   Size: 2.3M
✅ SQL backup created: /root/backups/beauty_salon/BEFORE_WIPE_20251223_HHMMSS.sql.gz
   Size: 1.1M
```

**Verify backup exists:**
```bash
ls -lh /root/backups/beauty_salon/BEFORE_WIPE*
```

**If backup failed or size is 0 - STOP! Do not proceed.**

---

### Step 3: Dump Production Schema (2 min)

```bash
# Find database container
DB_CONTAINER=$(sudo docker ps --filter name=db --format '{{.Names}}' | head -1)

# Get database credentials
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

# Dump schema
sudo docker exec -t $DB_CONTAINER pg_dump \
  -U $DB_USER -d $DB_NAME \
  --schema-only --no-owner --no-privileges \
  > /tmp/000_schema.sql

# Check file
ls -lh /tmp/000_schema.sql
head -20 /tmp/000_schema.sql
```

**Expected:** File size 40-100 KB, contains `CREATE TABLE`, `CREATE TYPE`, etc.

---

### Step 4: Execute Data Wipe (3 min) ⚠️ DESTRUCTIVE

```bash
sudo /root/wipe_production_data.sh
```

**Interactive prompts:**

1. **Have you created a backup?** → Type `yes`
2. **Enter ADMIN USER ID** → Enter the ID from Step 1 (e.g., `14`)
3. **Type 'WIPE' to confirm** → Type `WIPE`
4. **Proceed with wipe?** → Type `yes`

**Expected output:**
```
🔥 Starting data wipe...

BEFORE WIPE:
 table_name | count
------------+-------
 users      |   156
 salons     |    42
 bookings   |   389

AFTER WIPE:
 table_name | count
------------+-------
 users      |     1
 salons     |     0
 bookings   |     0

ADMIN USER:
 id |    name     |     phone      | role  | is_active
----+-------------+----------------+-------+-----------
 14 | Admin User  | +998901234567  | admin | t

✅ WIPE COMPLETE
```

---

### Step 5: Verify Admin Login (1 min)

```bash
# Test admin login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","password":"Admin2025"}'
```

**Expected:** Returns `access_token` and user object

**If login fails:**
```bash
# Reset admin password manually
sudo docker exec -it $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

-- In psql:
UPDATE users SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYk3jXw6KqW'
WHERE phone = '+998901234567';
-- This hash is for: Admin2025

\q
```

---

### Step 6: Download Schema to Local (2 min)

On your **local machine**:

```bash
# Download schema file
scp ubuntu@188.225.83.33:/tmp/000_schema.sql "d:\Проекты\beauty_salon\db\schema\000_schema.sql"

# Verify file
ls -lh "d:\Проекты\beauty_salon\db\schema\000_schema.sql"
```

**Commit to Git:**
```bash
git add db/schema/000_schema.sql
git commit -m "docs: production schema snapshot after wipe"
```

---

### Step 7: Reset Local Database (3 min)

On your **local machine**:

```powershell
# Reset local DB to match production
.\db\scripts\reset_local_db.ps1
```

**Expected output:**
```
🔥 Dropping local DB volume (full reset)...
🚀 Starting local DB from schema...
✅ Database is ready!

📊 Verifying schema...
   Tables created: 15

✅ Local DB is ready! Schema loaded from db/schema/000_schema.sql
```

---

### Step 8: Start Local Development (1 min)

```powershell
# Start full local stack
docker-compose -f docker-compose.local.yml up -d

# Wait 30 seconds
Start-Sleep -Seconds 30

# Test local admin login
curl -X POST "http://localhost:8000/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"phone":"+998901234567","password":"Admin2025"}'

# Access
# API: http://localhost:8000/docs
# Frontend: http://localhost:5173
```

---

## ✅ Success Criteria

After completing all steps:

- [ ] Production backup exists (`/root/backups/beauty_salon/BEFORE_WIPE_*.dump`)
- [ ] Production data wiped (only admin user remains)
- [ ] Admin login works on production
- [ ] Schema file downloaded (`db/schema/000_schema.sql`)
- [ ] Schema committed to Git
- [ ] Local database reset and running
- [ ] Local admin login works
- [ ] Frontend accessible locally

---

## 🚨 Rollback Procedure (If Something Goes Wrong)

### Rollback Production from Backup

```bash
ssh ubuntu@188.225.83.33

# Find backup file
BACKUP_FILE=$(ls -t /root/backups/beauty_salon/BEFORE_WIPE_*.dump | head -1)

# Get container info
DB_CONTAINER=$(sudo docker ps --filter name=db --format '{{.Names}}' | head -1)
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

# Stop backend (prevent writes during restore)
cd /var/www/beauty_salon
sudo docker-compose stop backend

# Restore from backup
sudo docker exec -i $DB_CONTAINER pg_restore \
  -U $DB_USER -d $DB_NAME \
  --clean --if-exists \
  < $BACKUP_FILE

# Restart backend
sudo docker-compose start backend

# Test
curl http://localhost:8000/api/health
```

**Recovery Time:** ~5-10 minutes

---

## 📊 What Gets Deleted

### Tables Wiped (data deleted, structure preserved):
- `salons` - All salons
- `masters` - All masters
- `services` - All services
- `bookings` - All bookings
- `reviews` - All reviews
- `time_slots` - All time slots
- `work_shifts` - All schedules
- `master_day_offs` - All day offs
- `service_masters` - All master-service links
- `notifications` - All notifications
- `favorites` - All favorites
- `chat_messages` - All messages
- `audit_logs` - All audit logs
- `login_logs` - All login history
- `refresh_tokens` - All refresh tokens

### Tables Preserved:
- `users` - Only admin user (all others deleted)
- `alembic_version` - Migration history (if exists)

### What Happens to IDs:
- All sequences reset to 1 (`RESTART IDENTITY`)
- Next salon created will have `id=1`
- Next user registered will get next available ID after admin

---

## 🎯 Post-Wipe Checklist

After wipe is complete:

- [ ] Update admin password if using default
  ```bash
  # Use C2 endpoint or manual update
  curl -X POST "http://188.225.83.33/api/admin/users/14/reset-password" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```

- [ ] Create first test salon owner
  ```bash
  # Register user
  curl -X POST "http://188.225.83.33/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+998901111111",
      "name": "Test Owner",
      "password": "TestPass123",
      "role": "client"
    }'

  # Change role to salon_owner (as admin)
  curl -X PATCH "http://188.225.83.33/api/admin/users/2/role" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"role":"salon_owner"}'
  ```

- [ ] Test salon creation workflow
- [ ] Verify public search shows no salons (until approved)

---

## 📝 Notes

### Why This Approach?

1. **Safety First:** Full backup before any destructive operation
2. **Transactional:** Entire wipe happens in one transaction (all or nothing)
3. **Universal:** Works regardless of actual table names (auto-detects)
4. **Preserves Schema:** Only deletes data, not table structure
5. **Admin Preserved:** System always has at least one admin user

### Alternative: Wipe Specific Tables Only

If you want more control, edit `wipe_production_data.sh` and replace the auto-detection loop with:

```sql
TRUNCATE TABLE
  bookings,
  reviews,
  time_slots,
  services,
  masters,
  salons
RESTART IDENTITY CASCADE;
```

This gives you explicit control over what gets wiped.

---

**Last Updated:** 2025-12-23
**Version:** 1.0
**Status:** Ready for execution
