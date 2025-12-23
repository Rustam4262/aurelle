# ⚡ Quick Wipe Checklist - Copy-Paste Commands

**Time:** 15 minutes | **Risk:** 🔴 DESTRUCTIVE

---

## 📋 Pre-Flight (5 min)

```bash
# 1. Upload scripts
scp db/scripts/diagnose_production.sh ubuntu@188.225.83.33:/tmp/
scp db/scripts/backup_before_wipe.sh ubuntu@188.225.83.33:/tmp/
scp db/scripts/wipe_production_data.sh ubuntu@188.225.83.33:/tmp/

# 2. SSH to server
ssh ubuntu@188.225.83.33

# 3. Setup scripts
sudo mv /tmp/*.sh /root/
sudo chmod +x /root/diagnose_production.sh
sudo chmod +x /root/backup_before_wipe.sh
sudo chmod +x /root/wipe_production_data.sh
```

---

## 🔍 Step 1: Diagnose (2 min)

```bash
sudo /root/diagnose_production.sh
```

**📝 Write down ADMIN ID:** _________

---

## 💾 Step 2: Backup (2 min) - CRITICAL

```bash
sudo /root/backup_before_wipe.sh

# Verify
ls -lh /root/backups/beauty_salon/BEFORE_WIPE*
```

**✅ Backup size > 100KB?** YES / NO

**If NO - STOP!**

---

## 📄 Step 3: Dump Schema (2 min)

```bash
DB_CONTAINER=$(sudo docker ps --filter name=db --format '{{.Names}}' | head -1)
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

sudo docker exec -t $DB_CONTAINER pg_dump \
  -U $DB_USER -d $DB_NAME \
  --schema-only --no-owner --no-privileges \
  > /tmp/000_schema.sql

ls -lh /tmp/000_schema.sql
```

---

## 🔥 Step 4: WIPE (3 min)

```bash
sudo /root/wipe_production_data.sh
```

**Prompts:**
1. Backup created? → `yes`
2. Admin ID? → `[YOUR_ID_FROM_STEP_1]`
3. Confirm? → `WIPE`
4. Proceed? → `yes`

---

## ✅ Step 5: Verify (1 min)

```bash
# Test admin login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998901234567","password":"Admin2025"}'
```

**✅ Got access_token?** YES / NO

---

## 📥 Step 6: Download Schema (2 min)

**On local machine:**

```bash
scp ubuntu@188.225.83.33:/tmp/000_schema.sql "d:\Проекты\beauty_salon\db\schema\000_schema.sql"

git add db/schema/000_schema.sql
git commit -m "docs: production schema after wipe"
```

---

## 🔄 Step 7: Reset Local (3 min)

**On local machine:**

```powershell
.\db\scripts\reset_local_db.ps1

docker-compose -f docker-compose.local.yml up -d

# Wait 30s
Start-Sleep -Seconds 30

# Test
curl http://localhost:8000/api/docs
```

---

## ✅ Done!

- [x] Production wiped (only admin remains)
- [x] Backup created
- [x] Schema in Git
- [x] Local synced
- [x] Ready for fresh onboarding

---

## 🚨 If Something Broke

**Restore production:**

```bash
ssh ubuntu@188.225.83.33

BACKUP_FILE=$(ls -t /root/backups/beauty_salon/BEFORE_WIPE_*.dump | head -1)
DB_CONTAINER=$(sudo docker ps --filter name=db --format '{{.Names}}' | head -1)
DB_NAME=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_DB= | cut -d= -f2)
DB_USER=$(sudo docker exec $DB_CONTAINER env | grep POSTGRES_USER= | cut -d= -f2)

cd /var/www/beauty_salon
sudo docker-compose stop backend

sudo docker exec -i $DB_CONTAINER pg_restore \
  -U $DB_USER -d $DB_NAME \
  --clean --if-exists \
  < $BACKUP_FILE

sudo docker-compose start backend
```

**Recovery time:** 5-10 minutes

---

**Full guide:** [db/WIPE_AND_RESET_PROCEDURE.md](WIPE_AND_RESET_PROCEDURE.md)
