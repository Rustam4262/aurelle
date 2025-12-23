# 🚨 CRITICAL: Deploy Backups NOW (5 minutes)

**Risk:** Without backups, any database failure = PERMANENT DATA LOSS

---

## Step 1: Copy Backup Script to Server (2 min)

### Option A: Using SCP (if you have SSH configured)

```bash
scp db/scripts/backup_prod_db.sh ubuntu@188.225.83.33:/tmp/
```

### Option B: Manual Copy-Paste

1. Open file: `d:\Проекты\beauty_salon\db\scripts\backup_prod_db.sh`
2. Copy entire contents
3. SSH to server:
   ```bash
   ssh ubuntu@188.225.83.33
   ```
4. Create file:
   ```bash
   sudo nano /root/backup_prod_db.sh
   # Paste contents
   # Save: Ctrl+O, Enter, Ctrl+X
   sudo chmod +x /root/backup_prod_db.sh
   ```

---

## Step 2: Verify Container Name (30 sec)

```bash
sudo docker ps --filter name=db
```

**Expected output:**
```
CONTAINER ID   IMAGE          NAMES
abc123...      postgres:15    beauty_salon-db-1
```

**If container name is different**, edit script:
```bash
sudo nano /root/backup_prod_db.sh
# Line 14: Change CONTAINER_NAME="beauty_salon-db-1"
# To match your actual container name
```

---

## Step 3: Run First Backup (1 min)

```bash
sudo /root/backup_prod_db.sh
```

**Expected output:**
```
========================================
AURELLE Beauty Salon - Database Backup
========================================
📦 Creating full backup (schema + data)...
✅ Full backup created: /root/backups/beauty_salon/beauty_salon_20251223_HHMMSS.sql.gz (1.2M)

📋 Creating schema-only backup...
✅ Schema backup created: /root/backups/beauty_salon/latest_schema.sql (45K)

📊 Database statistics:
   Tables: 15
   Total rows: 1234
   Database size: 8.5 MB
```

---

## Step 4: Setup Automated Daily Backups (1 min)

```bash
sudo crontab -e
```

Add this line at the end:
```
0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1
```

Save and exit.

**Verify:**
```bash
sudo crontab -l | grep backup
```

Should show the cron job.

---

## Step 5: Test Backup File (30 sec)

```bash
# Check backup exists
ls -lh /root/backups/beauty_salon/

# Should show file like:
# beauty_salon_20251223_103000.sql.gz

# Check file is not empty
ls -lh /root/backups/beauty_salon/*.sql.gz
# Size should be > 100K
```

---

## ✅ Success Criteria

- [ ] Backup script at `/root/backup_prod_db.sh`
- [ ] Script is executable (`chmod +x`)
- [ ] First backup completed successfully
- [ ] Backup file exists in `/root/backups/beauty_salon/`
- [ ] Cron job configured (verify with `sudo crontab -l`)
- [ ] File size > 100KB (not empty)

---

## 🚨 If Backup Fails

### Error: "Container not found"
```bash
# Check actual container name
sudo docker ps -a | grep db

# Edit script with correct name
sudo nano /root/backup_prod_db.sh
# Update: CONTAINER_NAME="actual-name"
```

### Error: "Permission denied"
```bash
# Ensure script is executable
sudo chmod +x /root/backup_prod_db.sh

# Ensure running as root
sudo /root/backup_prod_db.sh
```

### Error: "Directory doesn't exist"
```bash
# Create backup directory
sudo mkdir -p /root/backups/beauty_salon
```

---

## Next Steps After Backups Active

Once backups are running:

1. ✅ **Dump production schema** (follow: db/MANUAL_DUMP_INSTRUCTIONS.md)
2. ✅ **Deploy C1/C2 endpoints** (Sprint C completion)
3. ✅ **Test local environment**
4. ✅ **Begin Salon Owner Cabinet UI**

---

**DO THIS NOW. Everything else waits for backups.**
