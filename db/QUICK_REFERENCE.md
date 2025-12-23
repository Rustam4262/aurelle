# Database Quick Reference - Cheat Sheet

---

## 🚀 First Time Setup (10 minutes)

### 1. Get Production Schema
```bash
# SSH to production
ssh ubuntu@188.225.83.33

# Dump schema
sudo docker exec -t beauty_salon-db-1 pg_dump \
  -U beauty_user -d beauty_salon \
  --schema-only --no-owner --no-privileges \
  > /tmp/000_schema.sql

# Download to local
exit
scp ubuntu@188.225.83.33:/tmp/000_schema.sql "db/schema/000_schema.sql"
```

### 2. Start Local Development
```powershell
# Reset database
.\db\scripts\reset_local_db.ps1

# Start stack
docker-compose -f docker-compose.local.yml up -d

# Access
# API docs: http://localhost:8000/docs
# Frontend: http://localhost:5173
# Login: +998901234567 / Admin2025
```

---

## 🔄 Daily Development

### Start Local Environment
```bash
docker-compose -f docker-compose.local.yml up -d
```

### Stop Local Environment
```bash
docker-compose -f docker-compose.local.yml down
```

### Reset Database to Clean State
```powershell
.\db\scripts\reset_local_db.ps1
```

### View Logs
```bash
docker-compose -f docker-compose.local.yml logs -f
docker-compose -f docker-compose.local.yml logs backend
docker-compose -f docker-compose.local.yml logs db
```

---

## 🔧 Schema Management

### Sync Local with Production (After Prod Changes)
```bash
# 1. Dump latest schema from prod
./db/scripts/dump_schema_from_prod.sh

# 2. Reset local DB
./db/scripts/reset_local_db.ps1

# 3. Restart backend
docker-compose -f docker-compose.local.yml restart backend
```

### Apply Schema Change (Production)
```bash
# 1. SSH to prod
ssh ubuntu@188.225.83.33

# 2. Backup first!
sudo /root/backup_prod_db.sh

# 3. Apply change
sudo docker exec -it beauty_salon-db-1 psql -U beauty_user -d beauty_salon
# Run your ALTER TABLE, CREATE INDEX, etc.
\q

# 4. Restart backend
cd /var/www/beauty_salon
sudo docker-compose restart backend

# 5. Pull schema to local
exit
./db/scripts/dump_schema_from_prod.sh
```

---

## 💾 Backups (Production)

### First Time Setup (CRITICAL - Do Once)
```bash
# Copy script to server
scp db/scripts/backup_prod_db.sh ubuntu@188.225.83.33:/tmp/

# SSH to server
ssh ubuntu@188.225.83.33

# Move and make executable
sudo mv /tmp/backup_prod_db.sh /root/backup_prod_db.sh
sudo chmod +x /root/backup_prod_db.sh

# Test manual backup
sudo /root/backup_prod_db.sh

# Setup daily cron (3:00 AM)
sudo crontab -e
# Add: 0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1
```

### Manual Backup
```bash
ssh ubuntu@188.225.83.33
sudo /root/backup_prod_db.sh
```

### Check Backups
```bash
ssh ubuntu@188.225.83.33
ls -lth /root/backups/beauty_salon/
tail -50 /var/log/beauty_salon_backup.log
```

### Restore from Backup (DISASTER RECOVERY)
```bash
ssh ubuntu@188.225.83.33

# 1. Find backup
ls -lth /root/backups/beauty_salon/

# 2. Stop backend
cd /var/www/beauty_salon
sudo docker-compose stop backend

# 3. Drop and recreate DB
sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d postgres <<EOF
DROP DATABASE beauty_salon;
CREATE DATABASE beauty_salon;
EOF

# 4. Restore
BACKUP=/root/backups/beauty_salon/beauty_salon_20251223_030000.sql.gz
gunzip < $BACKUP | sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d beauty_salon

# 5. Restart backend
sudo docker-compose start backend

# 6. Test
curl http://localhost:8000/api/health
```

---

## 🐞 Troubleshooting

### Local DB won't start
```bash
# Check logs
docker-compose -f docker-compose.local.yml logs db

# Check if port 5432 is in use
netstat -ano | findstr :5432

# Nuclear option: full reset
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### Backend can't connect to DB
```bash
# Verify DB is healthy
docker inspect aurelle_db_local | grep Health

# Check connection string in backend
docker-compose -f docker-compose.local.yml exec backend env | grep DATABASE_URL

# Test connection manually
docker-compose -f docker-compose.local.yml exec db psql -U beauty_user -d beauty_salon -c "SELECT 1"
```

### Schema init not running
```bash
# Cause: Volume already exists (init scripts only run on first create)
# Solution: Delete volume
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### Production backup failing
```bash
ssh ubuntu@188.225.83.33

# Check container name
sudo docker ps --filter name=db

# Test pg_dump manually
sudo docker exec beauty_salon-db-1 pg_dump -U beauty_user -d beauty_salon --schema-only | head -20

# Check disk space
df -h

# Check backup directory permissions
ls -la /root/backups/
```

---

## 📊 Useful Database Commands

### Local Database
```bash
# Connect to database
docker-compose -f docker-compose.local.yml exec db psql -U beauty_user -d beauty_salon

# List tables
\dt

# Describe table
\d users

# Count rows
SELECT COUNT(*) FROM users;

# Exit
\q
```

### Production Database
```bash
ssh ubuntu@188.225.83.33

# Connect
sudo docker exec -it beauty_salon-db-1 psql -U beauty_user -d beauty_salon

# Same commands as above
```

### Useful Queries
```sql
-- Count users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Count salons by verification status
SELECT is_verified, is_active, COUNT(*) FROM salons GROUP BY is_verified, is_active;

-- Recent audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

-- Database size
SELECT pg_size_pretty(pg_database_size('beauty_salon'));

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🔐 Default Credentials

### Local Development
| User | Phone | Password | Role |
|------|-------|----------|------|
| Admin | +998901234567 | Admin2025 | admin |
| Owner | +998901111111 | Owner2025 | salon_owner |
| Master | +998902222222 | Master2025 | master |
| Client | +998903333333 | Client2025 | client |

### Production
| User | Phone | Password | Role |
|------|-------|----------|------|
| Admin | +998901234567 | Admin2025 | admin |

**⚠️ Change production admin password after deployment!**

---

## 📝 File Locations

### Local Project
```
db/schema/000_schema.sql          # Production schema dump
db/schema/010_seed_dev.sql        # Test data
docker-compose.local.yml          # Local dev environment
```

### Production Server
```
/var/www/beauty_salon/            # Application root
/root/backup_prod_db.sh           # Backup script
/root/backups/beauty_salon/       # Backup files
/var/log/beauty_salon_backup.log  # Backup log
```

---

## 🆘 Emergency Contacts

### If Disaster Happens
1. Check [db/BACKUP_SETUP.md](BACKUP_SETUP.md) for restore procedures
2. Find latest backup: `ls -lth /root/backups/beauty_salon/`
3. Follow restore steps (see above)
4. Don't panic - backups exist!

### Common Mistakes to Avoid
- ❌ Running `ALTER TABLE` on prod without backup first
- ❌ Forgetting to restart backend after schema change
- ❌ Using `docker-compose down -v` on production (deletes data!)
- ❌ Not testing backups regularly
- ✅ Always backup before schema changes
- ✅ Test changes in local first
- ✅ Verify backup restoration monthly

---

**Quick Reference v1.0 - Last Updated: 2025-12-23**
