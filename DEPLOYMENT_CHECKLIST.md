# AURELLE Production Deployment Checklist

**Before onboarding real salon owners - Complete ALL items**

---

## 🔴 P0 - CRITICAL (Must Do Before Real Users)

### Database Backup & Recovery

- [ ] **Copy backup script to production**
  ```bash
  scp db/scripts/backup_prod_db.sh ubuntu@188.225.83.33:/tmp/
  ssh ubuntu@188.225.83.33
  sudo mv /tmp/backup_prod_db.sh /root/backup_prod_db.sh
  sudo chmod +x /root/backup_prod_db.sh
  ```

- [ ] **Run first manual backup**
  ```bash
  sudo /root/backup_prod_db.sh
  ```

- [ ] **Verify backup file exists**
  ```bash
  ls -lh /root/backups/beauty_salon/
  # Should show: beauty_salon_YYYYMMDD_HHMMSS.sql.gz
  ```

- [ ] **Setup automated daily backups (cron)**
  ```bash
  sudo crontab -e
  # Add: 0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1
  ```

- [ ] **Verify cron job configured**
  ```bash
  sudo crontab -l | grep backup_prod_db
  ```

- [ ] **Test backup restoration (dry run)**
  ```bash
  # Create test DB
  sudo docker exec beauty_salon-db-1 psql -U beauty_user -d postgres -c "CREATE DATABASE beauty_salon_test"

  # Restore latest backup to test DB
  LATEST=$(ls -t /root/backups/beauty_salon/*.sql.gz | head -1)
  gunzip < $LATEST | sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d beauty_salon_test

  # Verify
  sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon_test -c "SELECT COUNT(*) FROM users"

  # Cleanup
  sudo docker exec beauty_salon-db-1 psql -U beauty_user -d postgres -c "DROP DATABASE beauty_salon_test"
  ```

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

### Production Schema Documentation

- [ ] **Dump production schema to local project**

  Follow: [db/MANUAL_DUMP_INSTRUCTIONS.md](db/MANUAL_DUMP_INSTRUCTIONS.md)

  ```bash
  ssh ubuntu@188.225.83.33
  sudo docker exec -t beauty_salon-db-1 pg_dump \
    -U beauty_user -d beauty_salon \
    --schema-only --no-owner --no-privileges \
    > /tmp/000_schema.sql
  exit

  scp ubuntu@188.225.83.33:/tmp/000_schema.sql "db/schema/000_schema.sql"
  ```

- [ ] **Verify schema file is valid**
  ```bash
  # Check file size (should be 40-100 KB)
  ls -lh db/schema/000_schema.sql

  # Check contains tables
  grep -c "CREATE TABLE" db/schema/000_schema.sql
  # Should show: 10-20
  ```

- [ ] **Commit schema to Git**
  ```bash
  git add db/schema/000_schema.sql
  git commit -m "docs: add production database schema snapshot"
  ```

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

### Sprint C (C1 + C2) Deployment

- [ ] **Upload C1/C2 code to production**
  ```bash
  scp backend/app/schemas/user.py ubuntu@188.225.83.33:/tmp/
  scp backend/app/api/admin.py ubuntu@188.225.83.33:/tmp/

  ssh ubuntu@188.225.83.33
  sudo docker cp /tmp/user.py beauty_salon-backend-1:/app/app/schemas/user.py
  sudo docker cp /tmp/admin.py beauty_salon-backend-1:/app/app/api/admin.py
  ```

- [ ] **Restart backend**
  ```bash
  cd /var/www/beauty_salon
  sudo docker-compose restart backend
  ```

- [ ] **Verify endpoints in Swagger UI**
  ```
  Open: http://188.225.83.33/api/docs

  Should see:
  - PATCH /api/admin/users/{user_id}/role
  - POST /api/admin/users/{user_id}/reset-password
  ```

- [ ] **Test C1 - Role Change**
  ```bash
  # Create test user
  curl -X POST "http://188.225.83.33/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "phone": "+998909999999",
      "name": "Test User C1",
      "password": "TestPass123",
      "role": "client"
    }'

  # Login as admin, get token
  TOKEN=$(curl -s -X POST "http://188.225.83.33/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"+998901234567","password":"Admin2025"}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

  # Change role
  curl -X PATCH "http://188.225.83.33/api/admin/users/XX/role" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"role":"salon_owner"}'

  # Should return: {"success": true, "old_role": "client", "new_role": "salon_owner"}
  ```

- [ ] **Test C2 - Password Reset**
  ```bash
  # Reset password for test user
  curl -X POST "http://188.225.83.33/api/admin/users/XX/reset-password" \
    -H "Authorization: Bearer $TOKEN"

  # Should return: {"success": true, "temporary_password": "aB3dE7gH"}

  # Test login with temp password
  curl -X POST "http://188.225.83.33/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"+998909999999","password":"<temp_password>"}'

  # Should succeed
  ```

- [ ] **Verify audit logs**
  ```bash
  ssh ubuntu@188.225.83.33
  sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon -c \
    "SELECT action, entity_type, entity_id, details FROM audit_logs ORDER BY created_at DESC LIMIT 5"

  # Should show USER_ROLE_CHANGED and PASSWORD_RESET
  ```

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

## 🟡 P1 - HIGH PRIORITY (This Week)

### Security Hardening

- [ ] **Change default database password**
  ```bash
  ssh ubuntu@188.225.83.33

  # Update password in docker-compose.yml
  cd /var/www/beauty_salon
  sudo nano docker-compose.yml
  # Change: POSTGRES_PASSWORD=beauty_pass
  # To: POSTGRES_PASSWORD=<strong_password>

  # Update in backend too
  # Change: DATABASE_URL=postgresql://beauty_user:beauty_pass@db:5432/beauty_salon

  # Restart containers
  sudo docker-compose down
  sudo docker-compose up -d
  ```

- [ ] **Change admin password from default**
  ```bash
  # Use C2 endpoint or direct DB update
  ssh ubuntu@188.225.83.33

  # Generate new hash locally:
  # python3 -c "from passlib.hash import bcrypt; print(bcrypt.hash('NewStrongPassword2025'))"

  # Update in DB
  sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon -c \
    "UPDATE users SET password_hash='<new_hash>' WHERE phone='+998901234567'"
  ```

- [ ] **Setup offsite backup (S3, Google Drive, or local download)**

  Option 1 (AWS S3):
  ```bash
  sudo apt-get install awscli
  aws configure
  # Add to backup script: aws s3 cp "$BACKUP_FILE" s3://aurelle-backups/db/
  ```

  Option 2 (Manual download daily):
  ```bash
  # On local machine, schedule daily:
  scp ubuntu@188.225.83.33:/root/backups/beauty_salon/*.sql.gz ./backups/
  ```

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

### Local Development Environment

- [ ] **Test local environment startup**
  ```powershell
  # Reset database
  .\db\scripts\reset_local_db.ps1

  # Start stack
  docker-compose -f docker-compose.local.yml up -d

  # Wait 30 seconds
  Start-Sleep -Seconds 30

  # Test API
  curl http://localhost:8000/api/health

  # Test admin login
  curl -X POST "http://localhost:8000/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phone":"+998901234567","password":"Admin2025"}'
  ```

- [ ] **Verify test data loaded**
  ```bash
  # Connect to local DB
  docker-compose -f docker-compose.local.yml exec db psql -U beauty_user -d beauty_salon

  # Check users
  SELECT id, name, phone, role FROM users;
  # Should show 4 test users

  # Check salons
  SELECT id, name, is_verified, is_active FROM salons;
  # Should show 2 test salons

  \q
  ```

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

### Monitoring & Alerts

- [ ] **Setup backup monitoring**
  ```bash
  # Option 1: Email on failure (requires mailutils)
  sudo apt-get install mailutils

  # Update cron:
  # 0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1 || echo "Backup failed" | mail -s "AURELLE Backup Failed" admin@example.com
  ```

- [ ] **Setup disk space monitoring**
  ```bash
  # Check current usage
  df -h

  # Alert if > 80% (optional)
  ```

- [ ] **Document on-call procedures**
  - Who to call if backup fails?
  - Who has SSH access?
  - Where are credentials stored?

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

## 🟢 P2 - NICE TO HAVE (Post-MVP)

### Database Migrations

- [ ] **Setup Alembic**
  ```bash
  pip install alembic
  cd backend
  alembic init alembic
  ```

- [ ] **Configure Alembic for PostgreSQL**

- [ ] **Generate initial migration from current schema**

- [ ] **Test migration up/down**

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

### Separate Stage Environment

- [ ] **Create staging server or Docker Compose environment**

- [ ] **Deploy to stage before production**

- [ ] **Test migrations on stage first**

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

### Enhanced Monitoring

- [ ] **Setup application monitoring (Sentry, New Relic, etc.)**

- [ ] **Setup database performance monitoring**

- [ ] **Setup uptime monitoring (UptimeRobot, Pingdom, etc.)**

**Status:** ⬜ NOT DONE | ✅ COMPLETE

---

## 📋 Pre-Launch Checklist (Day Before Real Users)

- [ ] Production backups running daily (check log: `tail /var/log/beauty_salon_backup.log`)
- [ ] Backup restoration tested successfully
- [ ] C1/C2 endpoints deployed and tested
- [ ] Admin password changed from default
- [ ] Database password changed from default
- [ ] Local dev environment working
- [ ] Schema documented in Git (`db/schema/000_schema.sql`)
- [ ] Disaster recovery procedures documented
- [ ] Team knows how to restore from backup
- [ ] At least 2 people have SSH access (bus factor mitigation)

---

## 🚨 Emergency Procedures

### If Database Goes Down

1. **Check container status**
   ```bash
   ssh ubuntu@188.225.83.33
   sudo docker ps -a | grep db
   ```

2. **Check logs**
   ```bash
   sudo docker logs beauty_salon-db-1 --tail 100
   ```

3. **Restart container**
   ```bash
   sudo docker restart beauty_salon-db-1
   ```

4. **If restart fails, restore from backup**
   - See: [db/BACKUP_SETUP.md](db/BACKUP_SETUP.md) - Restore Procedures
   - See: [db/QUICK_REFERENCE.md](db/QUICK_REFERENCE.md) - Emergency section

### If Backend Can't Connect to DB

1. **Check database is running**
   ```bash
   sudo docker exec beauty_salon-db-1 pg_isready
   ```

2. **Check connection string**
   ```bash
   sudo docker exec beauty_salon-backend-1 env | grep DATABASE_URL
   ```

3. **Restart backend**
   ```bash
   cd /var/www/beauty_salon
   sudo docker-compose restart backend
   ```

---

## 📊 Sign-Off

### CTO Approval

- [ ] Backup infrastructure reviewed and approved
- [ ] Disaster recovery procedures tested
- [ ] Risk assessment reviewed
- [ ] Ready for production user onboarding

**Signed:** ________________
**Date:** ________________

---

## 📚 Reference Documents

- [db/README.md](db/README.md) - Complete database infrastructure docs
- [db/BACKUP_SETUP.md](db/BACKUP_SETUP.md) - Backup configuration and restore procedures
- [db/QUICK_REFERENCE.md](db/QUICK_REFERENCE.md) - Quick command reference
- [db/MANUAL_DUMP_INSTRUCTIONS.md](db/MANUAL_DUMP_INSTRUCTIONS.md) - Schema dump guide
- [SPRINT_C_COMPLETE.md](SPRINT_C_COMPLETE.md) - Sprint C implementation docs
- [DB_INFRASTRUCTURE_COMPLETE.md](DB_INFRASTRUCTURE_COMPLETE.md) - Infrastructure summary

---

**Last Updated:** 2025-12-23
**Version:** 1.0
**Status:** READY FOR DEPLOYMENT
