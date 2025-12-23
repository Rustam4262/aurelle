# Production Backup Setup - CRITICAL

## ⚠️ CURRENT STATUS: NO BACKUPS CONFIGURED

**Risk Level:** 🔴 **CRITICAL**
**Impact:** If database fails, all data is LOST permanently
**Action Required:** Setup backups immediately before onboarding real users

---

## Quick Setup (5 minutes)

### 1. Connect to Production Server

```bash
ssh ubuntu@188.225.83.33
```

### 2. Copy Backup Script to Server

On your local machine:

```bash
scp db/scripts/backup_prod_db.sh ubuntu@188.225.83.33:/tmp/
```

Then on server:

```bash
sudo mv /tmp/backup_prod_db.sh /root/backup_prod_db.sh
sudo chmod +x /root/backup_prod_db.sh
```

### 3. Verify Docker Container Name

```bash
sudo docker ps --filter name=db
```

If the container name is NOT `beauty_salon-db-1`, edit the backup script:

```bash
sudo nano /root/backup_prod_db.sh
# Change line: CONTAINER_NAME="beauty_salon-db-1"
# To match your actual container name
```

### 4. Test Manual Backup (IMPORTANT!)

```bash
sudo /root/backup_prod_db.sh
```

Expected output:
```
========================================
AURELLE Beauty Salon - Database Backup
========================================
Started: Mon Dec 23 10:30:00 UTC 2025

📦 Creating full backup (schema + data)...
✅ Full backup created: /root/backups/beauty_salon/beauty_salon_20251223_103000.sql.gz (1.2M)

📋 Creating schema-only backup...
✅ Schema backup created: /root/backups/beauty_salon/latest_schema.sql (45K)

📊 Database statistics:
   Tables: 15
   Total rows: 1234
   Database size: 8.5 MB

✅ Backup completed successfully
```

### 5. Setup Automated Daily Backups (Cron)

```bash
sudo crontab -e
```

Add this line (backups at 3:00 AM daily):

```
0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1
```

Save and exit.

### 6. Verify Cron Job

```bash
sudo crontab -l
```

Should show the backup job.

---

## Backup Details

### What Gets Backed Up

1. **Full Backup** (`beauty_salon_YYYYMMDD_HHMMSS.sql.gz`)
   - Schema (tables, indexes, constraints, enums)
   - All data (users, salons, bookings, reviews, etc.)
   - Compressed with gzip

2. **Schema Snapshot** (`latest_schema.sql`)
   - Schema only (no data)
   - Updated daily
   - Used for local development sync

### Storage Location

```
/root/backups/beauty_salon/
├── beauty_salon_20251223_030000.sql.gz
├── beauty_salon_20251224_030000.sql.gz
├── beauty_salon_20251225_030000.sql.gz
└── latest_schema.sql
```

### Retention Policy

- **Keep:** Last 30 days of backups
- **Cleanup:** Automatic (older backups deleted daily)
- **Space:** ~1-2 MB per backup (compressed)

---

## Restore Procedures

### Scenario 1: Restore from Backup (Complete Disaster Recovery)

**When:** Database corrupted, dropped tables, or data loss

```bash
# 1. Find available backups
ls -lh /root/backups/beauty_salon/

# 2. Choose backup file (use most recent or specific date)
BACKUP_FILE="/root/backups/beauty_salon/beauty_salon_20251223_030000.sql.gz"

# 3. Stop backend to prevent writes during restore
cd /var/www/beauty_salon
sudo docker-compose stop backend

# 4. Drop and recreate database (DESTRUCTIVE!)
sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d postgres <<EOF
DROP DATABASE IF EXISTS beauty_salon;
CREATE DATABASE beauty_salon;
EOF

# 5. Restore from backup
gunzip < "$BACKUP_FILE" | sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d beauty_salon

# 6. Verify restoration
sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon -c "\dt"

# 7. Restart backend
sudo docker-compose start backend

# 8. Test application
curl http://localhost:8000/api/health
```

### Scenario 2: Restore Single Table (Accidental DELETE)

**When:** Accidentally deleted data from one table

```bash
# 1. Extract specific table from backup
BACKUP_FILE="/root/backups/beauty_salon/beauty_salon_20251223_030000.sql.gz"
TABLE_NAME="salons"

# 2. Stop backend
sudo docker-compose stop backend

# 3. Rename current table (don't drop, just in case)
sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon -c "ALTER TABLE $TABLE_NAME RENAME TO ${TABLE_NAME}_broken"

# 4. Restore table from backup
gunzip < "$BACKUP_FILE" | grep -A 10000 "CREATE TABLE $TABLE_NAME" | sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d beauty_salon

# 5. Verify and cleanup
sudo docker-compose start backend
# If restoration successful: DROP TABLE ${TABLE_NAME}_broken;
```

### Scenario 3: Point-in-Time Recovery (Recent Data Loss)

**Limitation:** PostgreSQL WAL archiving NOT configured (future enhancement)

**Current Workaround:**
- Hourly backups during critical operations (salon onboarding)
- Run manual backup before risky operations:
  ```bash
  sudo /root/backup_prod_db.sh
  ```

---

## Testing Backup Restoration (Recommended: Monthly)

Create a test restore to verify backups are valid:

```bash
# 1. Create test database
sudo docker exec beauty_salon-db-1 psql -U beauty_user -d postgres -c "CREATE DATABASE beauty_salon_test"

# 2. Restore latest backup to test DB
LATEST_BACKUP=$(ls -t /root/backups/beauty_salon/beauty_salon_*.sql.gz | head -1)
gunzip < "$LATEST_BACKUP" | sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d beauty_salon_test

# 3. Verify data
sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon_test -c "SELECT COUNT(*) FROM users"

# 4. Cleanup test DB
sudo docker exec beauty_salon-db-1 psql -U beauty_user -d postgres -c "DROP DATABASE beauty_salon_test"
```

---

## Monitoring Backups

### Check Last Backup

```bash
ls -lth /root/backups/beauty_salon/ | head -5
```

### View Backup Log

```bash
sudo tail -100 /var/log/beauty_salon_backup.log
```

### Email Notifications (Optional)

Install `mailutils`:
```bash
sudo apt-get install mailutils
```

Add to cron:
```
0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1 || echo "Backup failed" | mail -s "AURELLE Backup Failed" admin@example.com
```

---

## Offsite Backup (Recommended for Production)

### Option 1: AWS S3 Sync (Best Practice)

```bash
# Install AWS CLI
sudo apt-get install awscli

# Configure AWS credentials
aws configure

# Add to backup script (after line 60):
aws s3 cp "$BACKUP_FILE" s3://aurelle-backups/db/ --storage-class GLACIER
```

### Option 2: Manual Download to Local

Run daily from your local machine:

```bash
# Download latest backup
scp ubuntu@188.225.83.33:/root/backups/beauty_salon/beauty_salon_*.sql.gz ./backups/
```

### Option 3: Google Drive / Dropbox

Use `rclone` to sync backups to cloud storage.

---

## Security Considerations

### Current Security

✅ Backups stored on same server as database
✅ Root-only access (`/root/backups/`)
✅ Compressed to save space

### Risks

⚠️ **Single Point of Failure:** If server is compromised/lost, backups are lost too
⚠️ **No Encryption:** Backups contain plaintext user data (passwords are hashed)

### Recommended Improvements

1. **Offsite Backups:** S3, Google Cloud Storage, or separate server
2. **Encryption:** GPG encrypt backups before storing
3. **Immutable Storage:** S3 object lock or write-once storage
4. **Access Logging:** Track who accesses backups

---

## Next Steps After Setup

1. ✅ Run first manual backup to test
2. ✅ Setup cron for daily automated backups
3. ✅ Test restoration procedure (dry run)
4. ⏳ Setup offsite backup sync (AWS S3 recommended)
5. ⏳ Document disaster recovery runbook
6. ⏳ Setup monitoring/alerts for backup failures

---

## Emergency Contact

If restore fails or you need help:
- Check logs: `/var/log/beauty_salon_backup.log`
- Verify container: `sudo docker ps`
- Check disk space: `df -h`
- Database status: `sudo docker exec beauty_salon-db-1 pg_isready`

**ALWAYS test backups regularly. A backup you haven't tested is not a backup.**
