# 🔴 Production Wipe - Ready to Execute

**Status:** ✅ All diagnostics complete, wipe script uploaded to server

**Date:** 2025-12-23
**Server:** 89.39.94.194 (root access confirmed)

---

## 📊 Production Database Diagnostics

### Container Info
- **Name:** `beauty_db_prod`
- **Image:** `postgres:15-alpine`
- **Status:** Up 5 days (healthy)

### Database Info
- **Name:** `beauty_salon_db`
- **User:** `beauty_user`
- **Encoding:** UTF8

### Current Data
- **Users:** 2 total
  - ID 14: `+998932611804` (ADMIN) ← **WILL BE PRESERVED**
  - ID 15: `+998901111111` (CLIENT) ← will be deleted
- **Tables:** 22 total (21 + alembic_version)

### Tables to Wipe (21 tables)
```
✅ audit_logs          → Empty
✅ bookings            → Empty
✅ chat_messages       → Empty
✅ consent_history     → Empty
✅ favorites           → Empty
✅ idempotency_keys    → Empty
✅ login_logs          → Empty
✅ master_day_offs     → Empty
✅ master_schedules    → Empty
✅ masters             → Empty
✅ notifications       → Empty
✅ promo_codes         → Empty
✅ refresh_tokens      → Empty
✅ reviews             → Empty
✅ salons              → Empty
✅ service_masters     → Empty
✅ services            → Empty
✅ time_slots          → Empty
✅ user_consents       → Empty
✅ users               → Only admin ID 14 remains
✅ work_shifts         → Empty

⚪ alembic_version     → Untouched (migration history)
```

---

## 🚀 Execution Options

### Option A: Automated Script (Recommended)

**Script already uploaded to server:** `/root/wipe_production.sh`

```bash
ssh root@89.39.94.194

# Execute wipe script (interactive confirmation required)
/root/wipe_production.sh
```

**What it does:**
1. ✅ Pre-flight checks (container, admin exists)
2. ✅ Creates full backup (`/root/backups/aurelle/BEFORE_WIPE_*.dump`)
3. ✅ Dumps schema (`/root/backups/aurelle/000_schema_*.sql`)
4. ✅ Shows current data counts
5. ✅ **Executes wipe** (transactional - all or nothing)
6. ✅ Verifies final state
7. ✅ Provides next steps

**Safety:**
- Requires typing `WIPE` to confirm
- Transaction-based (rollback on any error)
- Creates backups BEFORE any changes
- Preserves admin ID 14 automatically

---

### Option B: Manual SQL Execution

If you prefer full manual control:

```bash
ssh root@89.39.94.194

# Interactive psql
docker exec -it beauty_db_prod psql -U beauty_user -d beauty_salon_db
```

Then execute SQL from: `db/scripts/manual_wipe.sql`

Or one-liner:
```bash
docker exec -i beauty_db_prod psql -U beauty_user -d beauty_salon_db < /root/manual_wipe.sql
```

---

## 🔥 EXECUTE WIPE NOW

### Step 1: Run Wipe Script

```bash
ssh root@89.39.94.194
/root/wipe_production.sh
```

**Interactive prompts:**
1. **Type 'WIPE' to confirm:** → Type `WIPE` and press Enter

**Expected output:**
```
============================================
Step 1/7: Pre-flight checks
============================================
✅ Container found: beauty_db_prod
✅ Admin user verified: ID=14

============================================
Step 2/7: Create full backup (custom format)
============================================
✅ Backup created: /root/backups/aurelle/BEFORE_WIPE_20251223_HHMMSS.dump (1.2M)

============================================
Step 3/7: Create schema dump
============================================
✅ Schema dumped: /root/backups/aurelle/000_schema_20251223_HHMMSS.sql (45K)

============================================
Step 4/7: Show current data counts
============================================
[Shows current counts...]

============================================
Step 5/7: Execute data wipe (transactional)
============================================
✅ Data wipe completed successfully

============================================
Step 6/7: Verify final state
============================================
AFTER WIPE - Data Counts:
 table_name | count
------------+-------
 users      |     1
 salons     |     0
 masters    |     0
 services   |     0
 bookings   |     0
 reviews    |     0

Preserved Admin User:
 id |     phone     |      email       | role  | is_active
----+---------------+------------------+-------+-----------
 14 | +998932611804 | owner@aurelle.uz | ADMIN | t

============================================
✅ WIPE COMPLETE
============================================
```

---

### Step 2: Test Admin Login

```bash
# Still on server
curl -X POST 'http://localhost:8000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+998932611804","password":"Admin2025"}'
```

**Expected:** Returns `access_token` and user object

**If login fails:** Password may need reset (use manual SQL or wait for C2 deployment)

---

### Step 3: Download Schema to Local

```bash
# On your local machine
scp root@89.39.94.194:/root/backups/aurelle/000_schema_*.sql "d:\Проекты\beauty_salon\db\schema\000_schema.sql"
```

---

### Step 4: Commit Schema to Git

```bash
git add db/schema/000_schema.sql
git commit -m "docs: production schema snapshot after wipe (clean slate)"
git push
```

---

### Step 5: Reset Local Database

```powershell
# On local machine
.\db\scripts\reset_local_db.ps1

# Start local environment
docker-compose -f docker-compose.local.yml up -d
```

---

## 🚨 Rollback Procedure (If Needed)

If something goes wrong, restore from backup:

```bash
ssh root@89.39.94.194

# Find latest backup
BACKUP=$(ls -t /root/backups/aurelle/BEFORE_WIPE_*.dump | head -1)
echo "Restoring from: $BACKUP"

# Stop backend (prevent writes during restore)
cd /var/www/beauty_salon
docker-compose stop backend

# Restore
docker exec -i beauty_db_prod pg_restore \
  -U beauty_user -d beauty_salon_db \
  --clean --if-exists \
  < $BACKUP

# Restart backend
docker-compose start backend

# Test
curl http://localhost:8000/api/health
```

**Recovery time:** ~5 minutes

---

## ✅ Post-Wipe Checklist

After wipe completes:

- [ ] Admin login tested (works)
- [ ] Backup file exists (`/root/backups/aurelle/BEFORE_WIPE_*.dump`)
- [ ] Schema downloaded to local (`db/schema/000_schema.sql`)
- [ ] Schema committed to Git
- [ ] Local database reset
- [ ] Local environment running
- [ ] Database counts verified:
  - users = 1 (admin only)
  - salons = 0
  - bookings = 0

---

## 🎯 After Wipe - Next Steps

### Immediate (Today)
1. ✅ **Deploy Sprint C (C1/C2)** - Admin tools for user management
   ```bash
   # Upload files
   scp backend/app/schemas/user.py root@89.39.94.194:/tmp/
   scp backend/app/api/admin.py root@89.39.94.194:/tmp/

   # Deploy
   ssh root@89.39.94.194
   docker cp /tmp/user.py beauty_backend_prod:/app/app/schemas/user.py
   docker cp /tmp/admin.py beauty_backend_prod:/app/app/api/admin.py
   docker restart beauty_backend_prod
   ```

2. ✅ **Setup Daily Backups** (if not done yet)
   ```bash
   scp db/scripts/backup_prod_db.sh root@89.39.94.194:/root/
   ssh root@89.39.94.194
   chmod +x /root/backup_prod_db.sh
   crontab -e
   # Add: 0 3 * * * /root/backup_prod_db.sh >> /var/log/aurelle_backup.log 2>&1
   ```

### This Week
3. ✅ **First Salon Owner Onboarding Test**
   ```bash
   # Register new user
   curl -X POST "http://89.39.94.194/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{"phone":"+998901111111","name":"Test Owner","password":"Test123","role":"client"}'

   # Change role to salon_owner (as admin)
   curl -X PATCH "http://89.39.94.194/api/admin/users/2/role" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"role":"salon_owner"}'
   ```

4. ✅ **Begin Sprint 1** - Salon Owner Cabinet UI

---

## 📚 Documentation Reference

- [FINAL_wipe_production.sh](db/scripts/FINAL_wipe_production.sh) - Automated wipe script
- [manual_wipe.sql](db/scripts/manual_wipe.sql) - Manual SQL execution
- [MASTER_SPRINT_PLAN.md](MASTER_SPRINT_PLAN.md) - Sprint 0-3 roadmap
- [db/BACKUP_SETUP.md](db/BACKUP_SETUP.md) - Backup & restore procedures

---

## 🔐 Security Notes

### What Gets Deleted
- ✅ All users except admin ID 14
- ✅ All salons
- ✅ All masters
- ✅ All services
- ✅ All bookings
- ✅ All reviews
- ✅ All audit logs
- ✅ All login history

### What Gets Preserved
- ✅ Admin user (ID 14)
- ✅ Database schema (all tables, indexes, constraints)
- ✅ Alembic migration history
- ✅ Enum types (UserRole, etc.)

### What Gets Backed Up
- ✅ Full database (custom format) - can restore selectively
- ✅ Schema-only SQL - for local development sync
- ✅ Both stored in `/root/backups/aurelle/`

---

## 🎉 Ready to Execute

**Everything is prepared:**
- ✅ Diagnostics complete
- ✅ Wipe script tested and uploaded
- ✅ Backup procedure in place
- ✅ Rollback procedure documented
- ✅ Post-wipe steps defined

**Execute when ready:**
```bash
ssh root@89.39.94.194
/root/wipe_production.sh
```

**Time required:** 5-10 minutes

**Risk level:** 🟢 LOW (full backup created automatically)

---

**Last Updated:** 2025-12-23 05:36 UTC
**Status:** READY TO EXECUTE
