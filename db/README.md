# AURELLE Database Infrastructure

**Single Source of Truth for Database Schema**

This directory contains the production database schema and all tools needed to maintain identical database environments across local development and production.

---

## Directory Structure

```
db/
├── schema/
│   ├── 000_schema.sql      # Production schema dump (DDL only)
│   └── 010_seed_dev.sql    # Test data for local development
├── scripts/
│   ├── dump_schema_from_prod.sh     # Pull schema from production (Bash)
│   ├── dump_schema_from_prod.ps1    # Pull schema from production (PowerShell)
│   ├── reset_local_db.sh            # Reset local DB to clean state (Bash)
│   ├── reset_local_db.ps1           # Reset local DB to clean state (PowerShell)
│   └── backup_prod_db.sh            # Production backup script (runs on server)
├── MANUAL_DUMP_INSTRUCTIONS.md      # Manual schema dump guide
├── BACKUP_SETUP.md                  # Production backup configuration
└── README.md                        # This file
```

---

## Quick Start

### First Time Setup (Local Development)

1. **Dump schema from production**

   Follow instructions in [MANUAL_DUMP_INSTRUCTIONS.md](MANUAL_DUMP_INSTRUCTIONS.md)

   This creates `db/schema/000_schema.sql` from your production database.

2. **Start local database**

   ```bash
   # PowerShell (Windows)
   .\db\scripts\reset_local_db.ps1

   # Bash (Linux/Mac)
   ./db/scripts/reset_local_db.sh
   ```

3. **Start backend and frontend**

   ```bash
   docker-compose -f docker-compose.local.yml up -d
   ```

4. **Verify**

   - Backend API: http://localhost:8000/docs
   - Frontend: http://localhost:5173
   - Login: `+998901234567` / `Admin2025`

---

## Production Backup Setup

⚠️ **CRITICAL:** Before onboarding real users, setup automated backups!

Follow the complete guide: [BACKUP_SETUP.md](BACKUP_SETUP.md)

**Quick Setup (on production server):**

```bash
# 1. Copy backup script
scp db/scripts/backup_prod_db.sh ubuntu@188.225.83.33:/tmp/
ssh ubuntu@188.225.83.33
sudo mv /tmp/backup_prod_db.sh /root/backup_prod_db.sh
sudo chmod +x /root/backup_prod_db.sh

# 2. Test manual backup
sudo /root/backup_prod_db.sh

# 3. Setup daily automated backup (3:00 AM)
sudo crontab -e
# Add: 0 3 * * * /root/backup_prod_db.sh >> /var/log/beauty_salon_backup.log 2>&1
```

---

## File Descriptions

### `schema/000_schema.sql`

**Purpose:** Production database schema (tables, indexes, constraints, enums)

**Source:** Generated from production via `pg_dump --schema-only`

**Contains:**
- `CREATE TYPE` statements (enums: userrole, bookingstatus, etc.)
- `CREATE TABLE` statements (users, salons, bookings, etc.)
- `CREATE INDEX` statements
- Foreign key constraints
- Column defaults

**Does NOT contain:**
- Data rows (`INSERT` statements)
- Owner/privilege information (`ALTER OWNER`)

**Update Frequency:** After each schema migration/change in production

**Example:**
```sql
CREATE TYPE userrole AS ENUM ('admin', 'salon_owner', 'master', 'client');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role userrole NOT NULL DEFAULT 'client',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `schema/010_seed_dev.sql`

**Purpose:** Test data for local development

**Runs:** Automatically after `000_schema.sql` (alphabetical order in docker-entrypoint-initdb.d)

**Contains:**
- Test admin user (`+998901234567` / `Admin2025`)
- Test salon owner (`+998901111111` / `Owner2025`)
- Test master (`+998902222222` / `Master2025`)
- Test client (`+998903333333` / `Client2025`)
- Sample approved salon
- Sample pending salon

**Security:** Uses bcrypt-hashed passwords (safe to commit)

**Customization:** Edit this file to add more test data for your use case

---

### `scripts/dump_schema_from_prod.sh`

**Purpose:** Download production schema to local project

**Requirements:**
- SSH access to `ubuntu@188.225.83.33`
- Production database running

**Usage:**
```bash
./db/scripts/dump_schema_from_prod.sh
```

**Output:** Overwrites `db/schema/000_schema.sql`

**When to run:**
- After manual `ALTER TABLE` on production
- After deploying schema migrations
- When local schema is out of sync

---

### `scripts/reset_local_db.sh` / `reset_local_db.ps1`

**Purpose:** Destroy and recreate local database from schema

**Danger:** ⚠️ Deletes ALL local data (Docker volume removed)

**Usage:**
```bash
# PowerShell
.\db\scripts\reset_local_db.ps1

# Bash
./db/scripts/reset_local_db.sh
```

**Process:**
1. Stops and removes local database container + volume
2. Starts fresh database container
3. Automatically runs `000_schema.sql` (schema)
4. Automatically runs `010_seed_dev.sql` (test data)
5. Verifies table count

**When to run:**
- Schema out of sync with production
- Corrupted local database
- Want clean slate for testing

---

### `scripts/backup_prod_db.sh`

**Purpose:** Production database backup (schema + data)

**Runs:** On production server (188.225.83.33)

**Schedule:** Daily at 3:00 AM (via cron)

**Creates:**
- Full backup: `/root/backups/beauty_salon/beauty_salon_YYYYMMDD_HHMMSS.sql.gz`
- Schema snapshot: `/root/backups/beauty_salon/latest_schema.sql`

**Retention:** 30 days (automatic cleanup)

**See:** [BACKUP_SETUP.md](BACKUP_SETUP.md) for setup and restore procedures

---

## Workflows

### Workflow 1: Sync Local with Production

**Scenario:** Production schema changed, local is outdated

```bash
# 1. Pull latest schema from production
./db/scripts/dump_schema_from_prod.sh

# 2. Reset local database
./db/scripts/reset_local_db.ps1

# 3. Restart backend
docker-compose -f docker-compose.local.yml restart backend
```

---

### Workflow 2: Apply Schema Change

**Scenario:** Need to add a new column to production

**CURRENT METHOD (Manual):**

```bash
# 1. SSH to production
ssh ubuntu@188.225.83.33

# 2. Backup BEFORE change
sudo /root/backup_prod_db.sh

# 3. Apply migration
sudo docker exec -it beauty_salon-db-1 psql -U beauty_user -d beauty_salon
ALTER TABLE salons ADD COLUMN new_field VARCHAR(255);
\q

# 4. Restart backend
cd /var/www/beauty_salon
sudo docker-compose restart backend

# 5. Test change
curl http://localhost:8000/api/admin/salons

# 6. Pull updated schema to local
exit
./db/scripts/dump_schema_from_prod.sh
```

**FUTURE METHOD (Alembic Migrations):**

```bash
# 1. Create migration locally
alembic revision -m "add new_field to salons"

# 2. Edit migration file
# backend/alembic/versions/001_add_new_field.py

# 3. Test locally
alembic upgrade head

# 4. Deploy to production
# (copy migration file + run alembic upgrade head)

# 5. Dump schema
./db/scripts/dump_schema_from_prod.sh
```

---

### Workflow 3: Production Disaster Recovery

**Scenario:** Database corrupted or accidentally dropped

**See:** [BACKUP_SETUP.md - Restore Procedures](BACKUP_SETUP.md#restore-procedures)

**Summary:**

```bash
# 1. Find latest backup
ls -lth /root/backups/beauty_salon/

# 2. Stop backend
sudo docker-compose stop backend

# 3. Drop and recreate database
sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d postgres <<EOF
DROP DATABASE beauty_salon;
CREATE DATABASE beauty_salon;
EOF

# 4. Restore from backup
gunzip < /root/backups/beauty_salon/beauty_salon_20251223_030000.sql.gz \
  | sudo docker exec -i beauty_salon-db-1 psql -U beauty_user -d beauty_salon

# 5. Restart backend
sudo docker-compose start backend
```

---

## Environment Comparison

| Feature | Local (`docker-compose.local.yml`) | Production |
|---------|-----------------------------------|------------|
| **Database** | PostgreSQL 15 (Alpine) | PostgreSQL 15 |
| **Data** | Test data (010_seed_dev.sql) | Real user data |
| **Schema** | From 000_schema.sql | Live database |
| **Backups** | Not needed (dev data) | Daily automated |
| **Port** | 5432 (localhost) | 5432 (container) |
| **Volume** | `aurelle_pg_local` | Persistent on server |
| **Reset** | Easy (reset script) | Restore from backup |

---

## Database Schema Evolution

### Current State (Manual)

❌ Schema changes applied manually via `psql`
❌ No migration history
❌ Risk of local/prod drift
✅ Simple and fast

### Future State (Alembic)

✅ Versioned migrations
✅ Repeatable deployments
✅ Rollback capability
✅ Migration history in code
⏳ Not yet implemented

**Migration to Alembic:**
1. Install Alembic: `pip install alembic`
2. Initialize: `alembic init backend/alembic`
3. Generate initial migration from current schema
4. Future changes via `alembic revision`

---

## Security Notes

### Password Hashes in Seed Data

The `010_seed_dev.sql` file contains bcrypt password hashes. These are:
- ✅ Safe to commit to Git (hashes, not plaintext)
- ✅ Only for development (not used in production)
- ⚠️ Should be different from production admin password

### Production Credentials

Production database credentials are in:
- Server: `/var/www/beauty_salon/docker-compose.yml`
- Environment variables: `POSTGRES_PASSWORD=beauty_pass`

**Recommended:** Change default password and use secrets management.

---

## Troubleshooting

### Issue: `000_schema.sql` doesn't exist

**Solution:** Run schema dump first:
```bash
./db/scripts/dump_schema_from_prod.sh
```

Or follow [MANUAL_DUMP_INSTRUCTIONS.md](MANUAL_DUMP_INSTRUCTIONS.md)

---

### Issue: Local database won't start

**Check logs:**
```bash
docker-compose -f docker-compose.local.yml logs db
```

**Common causes:**
- Port 5432 already in use (stop other PostgreSQL instances)
- Corrupted volume (run reset script)
- Invalid SQL in schema files (check syntax)

---

### Issue: Schema init scripts not running

**Cause:** Docker entrypoint scripts only run on FIRST volume creation

**Solution:** Delete volume and recreate:
```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

---

### Issue: Production backup fails

**Check:**
1. Container name: `sudo docker ps`
2. Database credentials: `sudo docker exec beauty_salon-db-1 psql -U beauty_user -d beauty_salon -c '\l'`
3. Disk space: `df -h`
4. Permissions: `ls -la /root/backups/`

---

## Maintenance Checklist

### Weekly
- [ ] Verify local database starts successfully
- [ ] Check production backup logs: `sudo tail /var/log/beauty_salon_backup.log`

### Monthly
- [ ] Test backup restoration (see [BACKUP_SETUP.md](BACKUP_SETUP.md))
- [ ] Review and update seed data if needed
- [ ] Sync local schema with production

### Before Major Changes
- [ ] Manual production backup: `sudo /root/backup_prod_db.sh`
- [ ] Test changes in local environment first
- [ ] Dump schema after production changes

---

## Support

For issues or questions:
1. Check this README
2. Check specific guides: [BACKUP_SETUP.md](BACKUP_SETUP.md), [MANUAL_DUMP_INSTRUCTIONS.md](MANUAL_DUMP_INSTRUCTIONS.md)
3. Review logs: `docker-compose logs`
4. Verify production status: `sudo docker ps`, `sudo docker logs beauty_salon-db-1`

---

**Remember:** The production database is the single source of truth. Always dump schema after production changes to keep local development in sync.
