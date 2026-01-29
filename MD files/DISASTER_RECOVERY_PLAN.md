# AURELLE Disaster Recovery Plan

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Owner:** AURELLE DevOps Team
**Review Frequency:** Quarterly

---

## Table of Contents

1. [Overview](#overview)
2. [Disaster Scenarios](#disaster-scenarios)
3. [Recovery Objectives](#recovery-objectives)
4. [Backup Strategy](#backup-strategy)
5. [Recovery Procedures](#recovery-procedures)
6. [Testing and Validation](#testing-and-validation)
7. [Emergency Contacts](#emergency-contacts)
8. [Post-Recovery](#post-recovery)

---

## Overview

### Purpose

This Disaster Recovery Plan (DRP) outlines procedures for recovering the AURELLE Beauty Salon Platform from catastrophic failures, ensuring business continuity and minimizing data loss.

### Scope

This plan covers:

- Database recovery (PostgreSQL)
- Application files recovery (uploads, configurations)
- Infrastructure restoration (server, services)
- SSL certificates recovery
- Full system rebuild

### Assumptions

- Backups are regularly tested and validated
- Team members have appropriate access credentials
- Cloud backups (Backblaze B2) are accessible
- Alternative infrastructure can be provisioned if needed

---

## Disaster Scenarios

### 1. Database Corruption/Loss

**Severity:** CRITICAL
**Impact:** Complete loss of booking data, users, salons
**Recovery Time:** 30-60 minutes
**Data Loss:** Up to 24 hours (last backup)

### 2. Server Hardware Failure

**Severity:** CRITICAL
**Impact:** Complete application outage
**Recovery Time:** 2-4 hours
**Data Loss:** Up to 24 hours

### 3. Ransomware/Malware Attack

**Severity:** CRITICAL
**Impact:** Encrypted/corrupted files and database
**Recovery Time:** 4-8 hours
**Data Loss:** Up to 24 hours

### 4. Accidental Data Deletion

**Severity:** HIGH
**Impact:** Loss of specific data (users, bookings, uploads)
**Recovery Time:** 15-30 minutes
**Data Loss:** Minimal (point-in-time recovery)

### 5. Cloud Provider Outage (Backblaze B2)

**Severity:** MEDIUM
**Impact:** Cannot create new backups, local backups still available
**Recovery Time:** N/A (wait for service restoration)
**Data Loss:** None (local backups available)

### 6. Complete Infrastructure Loss

**Severity:** CATASTROPHIC
**Impact:** Total loss of server, data, configurations
**Recovery Time:** 8-24 hours
**Data Loss:** Up to 24 hours

---

## Recovery Objectives

### RTO (Recovery Time Objective)

| Scenario            | Target RTO | Maximum RTO |
| ------------------- | ---------- | ----------- |
| Database corruption | 30 min     | 1 hour      |
| Server failure      | 2 hours    | 4 hours     |
| Ransomware          | 4 hours    | 8 hours     |
| Data deletion       | 15 min     | 30 min      |
| Complete loss       | 12 hours   | 24 hours    |

### RPO (Recovery Point Objective)

| Data Type        | Backup Frequency | Maximum Data Loss |
| ---------------- | ---------------- | ----------------- |
| Database         | Daily (3 AM)     | 24 hours          |
| Files            | Daily (3 AM)     | 24 hours          |
| Configurations   | Daily (3 AM)     | 24 hours          |
| SSL Certificates | Daily (3 AM)     | 24 hours          |

### Service Level Targets

- **Availability:** 99.5% uptime (43.8 hours downtime/year)
- **Recovery Success Rate:** 95%
- **Backup Verification:** Weekly automated testing

---

## Backup Strategy

### Backup Types

#### 1. Database Backups

**Method:** PostgreSQL pg_dump with compression
**Format:** Custom format (.sql.gz)
**Location:**

- Local: `/var/backups/aurelle/database/`
- Cloud: `b2:aurelle-backups/database/`

**Retention:**

- Local: 7 days
- Cloud: 90 days

**Schedule:** Daily at 3 AM

**Script:** `scripts/backup-db.sh`

#### 2. Files Backups

**Method:** tar + gzip compression
**Contents:**

- `/var/www/aurelle/uploads/` - User uploaded files
- `/var/www/aurelle/.env` - Environment configuration
- `/etc/nginx/sites-available/aurelle` - Nginx config
- `/etc/letsencrypt/live/` - SSL certificates

**Location:**

- Local: `/var/backups/aurelle/files/`
- Cloud: `b2:aurelle-backups/files/`

**Retention:**

- Local: 7 days
- Cloud: 90 days

**Schedule:** Daily at 3 AM

**Script:** `scripts/backup-files.sh`

#### 3. Cloud Backups (Backblaze B2)

**Provider:** Backblaze B2
**Bucket:** `aurelle-backups`
**Encryption:** Server-side
**Access:** Via rclone

**Upload:** Automated after each local backup
**Script:** `scripts/upload-to-cloud.sh`

### Backup Verification

**Automated Testing:**

- **Schedule:** Weekly (Sunday 4 AM)
- **Script:** `scripts/restore-test.sh`
- **Tests:**
  1. Database restore to test instance
  2. Files extraction to temp directory
  3. Cloud backup availability check
- **Notification:** Telegram alert with results

**Manual Verification:** Monthly (1st of month)

---

## Recovery Procedures

### Procedure 1: Database Recovery

**Use Case:** Database corruption, accidental deletion, ransomware

#### Prerequisites

- Access to server (SSH)
- sudo/root privileges
- Backup files accessible

#### Steps

1. **Stop Application**

   ```bash
   sudo pm2 stop all
   ```

2. **List Available Backups**

   ```bash
   sudo bash scripts/restore-db.sh
   # Or specify backup file:
   sudo bash scripts/restore-db.sh /var/backups/aurelle/database/aurelle_db_20260111_030000.sql.gz
   ```

3. **Select Backup**
   - Choose from list of available backups
   - Script will show backup size and date

4. **Confirm Restoration**
   - Type 'yes' to confirm
   - Script creates pre-restore backup automatically

5. **Wait for Completion**
   - Database will be dropped and recreated
   - Backup will be restored
   - Application will restart automatically

6. **Verify Recovery**

   ```bash
   # Check database
   sudo -u postgres psql -d aurelle -c "SELECT COUNT(*) FROM bookings;"

   # Check application
   curl https://aurelle.uz/api/health

   # Check PM2
   pm2 status
   ```

#### Recovery from Cloud

If local backups are unavailable:

```bash
# Download from Backblaze B2
rclone copy b2:aurelle-backups/database/aurelle_db_20260111_030000.sql.gz /tmp/

# Restore
sudo bash scripts/restore-db.sh /tmp/aurelle_db_20260111_030000.sql.gz
```

#### Rollback

If restore fails, pre-restore backup is automatically created at:

```
/tmp/aurelle_pre_restore_YYYYMMDD_HHMMSS.sql.gz
```

Script will attempt automatic rollback on failure.

---

### Procedure 2: Files Recovery

**Use Case:** Lost uploads, corrupted files, ransomware

#### Prerequisites

- Access to server (SSH)
- sudo/root privileges
- Backup files accessible

#### Steps

1. **Stop Application**

   ```bash
   sudo pm2 stop all
   ```

2. **Run Restore Script**

   ```bash
   sudo bash scripts/restore-files.sh
   # Or specify backup file:
   sudo bash scripts/restore-files.sh /var/backups/aurelle/files/aurelle_files_20260111_030000.tar.gz
   ```

3. **Select Restore Mode**
   - **Full restore:** Overwrites all files
   - **Selective restore:** Choose specific directories
   - **Preview:** List files without extracting

4. **Confirm Restoration**
   - Type 'yes' to confirm
   - Script creates pre-restore backup automatically

5. **Wait for Completion**
   - Files will be extracted
   - Permissions will be set
   - Application will restart automatically

6. **Verify Recovery**

   ```bash
   # Check uploads
   ls -lh /var/www/aurelle/uploads/

   # Check environment file
   cat /var/www/aurelle/.env

   # Check application
   curl https://aurelle.uz
   ```

---

### Procedure 3: Complete System Recovery

**Use Case:** Server failure, complete infrastructure loss

#### Phase 1: Infrastructure Setup (1-2 hours)

1. **Provision New Server**
   - OS: Ubuntu 20.04 LTS or newer
   - RAM: Minimum 4GB (8GB recommended)
   - Storage: Minimum 50GB SSD
   - Network: Public IP, ports 80/443/22 open

2. **Initial Server Setup**

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install essential packages
   sudo apt install -y curl wget git build-essential

   # Create user
   sudo adduser aurelle
   sudo usermod -aG sudo aurelle
   ```

3. **Configure DNS**
   - Point aurelle.uz to new server IP
   - Point www.aurelle.uz to new server IP
   - Point staging.aurelle.uz to new server IP
   - Wait for DNS propagation (5-30 minutes)

#### Phase 2: Install Dependencies (30-60 minutes)

1. **Install Node.js**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version
   npm --version
   ```

2. **Install PostgreSQL**

   ```bash
   sudo apt install -y postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Install Nginx**

   ```bash
   sudo apt install -y nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

4. **Install PM2**

   ```bash
   sudo npm install -g pm2
   pm2 startup
   ```

5. **Install rclone**
   ```bash
   curl https://rclone.org/install.sh | sudo bash
   ```

#### Phase 3: Restore Application (1-2 hours)

1. **Clone Repository**

   ```bash
   cd /var/www
   sudo git clone https://github.com/your-org/aurelle.git
   cd aurelle
   ```

2. **Download Backups from Cloud**

   ```bash
   # Configure rclone (interactive)
   rclone config

   # Download latest backups
   mkdir -p /var/backups/aurelle/database
   mkdir -p /var/backups/aurelle/files

   rclone copy b2:aurelle-backups/database/ /var/backups/aurelle/database/ --max-age 7d
   rclone copy b2:aurelle-backups/files/ /var/backups/aurelle/files/ --max-age 7d
   ```

3. **Restore Database**

   ```bash
   # Create database
   sudo -u postgres createdb -O postgres aurelle

   # Restore
   cd /var/www/aurelle
   sudo bash scripts/restore-db.sh /var/backups/aurelle/database/aurelle_db_*.sql.gz
   ```

4. **Restore Files**

   ```bash
   sudo bash scripts/restore-files.sh /var/backups/aurelle/files/aurelle_files_*.tar.gz
   ```

5. **Install Dependencies**

   ```bash
   npm install
   ```

6. **Build Application**
   ```bash
   npm run build
   ```

#### Phase 4: Configure Services (30-60 minutes)

1. **Setup SSL Certificates**

   ```bash
   sudo bash scripts/install-certbot.sh
   sudo bash scripts/setup-ssl.sh
   ```

2. **Configure Nginx**
   - SSL certificates restored from backup
   - Or use `configs/nginx-https.conf`

3. **Start Application**

   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

4. **Verify Services**

   ```bash
   # Check Nginx
   sudo systemctl status nginx

   # Check PostgreSQL
   sudo systemctl status postgresql

   # Check PM2
   pm2 status

   # Check application
   curl https://aurelle.uz/api/health
   ```

#### Phase 5: Restore Monitoring (30 minutes)

1. **Setup Infrastructure Monitoring**

   ```bash
   sudo bash scripts/setup-monitoring.sh
   ```

2. **Setup Backup Automation**

   ```bash
   sudo bash scripts/setup-backup-automation.sh
   ```

3. **Verify All Services**
   - Test user login
   - Test booking creation
   - Test file uploads
   - Check monitoring alerts

#### Total Recovery Time

- **Minimum:** 3-4 hours (with preparation)
- **Maximum:** 8-12 hours (first time, troubleshooting)
- **Expected:** 6-8 hours

---

### Procedure 4: Specific Data Recovery

#### Recover Deleted Bookings

```bash
# Restore database to temporary instance
sudo -u postgres createdb aurelle_recovery
sudo bash scripts/restore-db.sh /var/backups/aurelle/database/aurelle_db_*.sql.gz

# Export deleted data
sudo -u postgres psql -d aurelle_recovery -c "
COPY (SELECT * FROM bookings WHERE id IN ('deleted-id-1', 'deleted-id-2'))
TO '/tmp/recovered_bookings.csv' CSV HEADER;
"

# Import to production
sudo -u postgres psql -d aurelle -c "
COPY bookings FROM '/tmp/recovered_bookings.csv' CSV HEADER;
"

# Cleanup
sudo -u postgres dropdb aurelle_recovery
rm /tmp/recovered_bookings.csv
```

#### Recover Deleted Files

```bash
# Extract specific files from backup
tar -xzf /var/backups/aurelle/files/aurelle_files_*.tar.gz \
    -C /tmp \
    --wildcards '*/uploads/specific-file.jpg'

# Copy to production
cp /tmp/var/www/aurelle/uploads/specific-file.jpg /var/www/aurelle/uploads/

# Set permissions
chown www-data:www-data /var/www/aurelle/uploads/specific-file.jpg
```

---

## Testing and Validation

### Weekly Automated Testing

**Schedule:** Every Sunday at 4 AM
**Script:** `scripts/restore-test.sh`

**Tests Performed:**

1. Database integrity check
2. Database restore to test instance
3. Files backup integrity check
4. Files extraction test
5. Cloud backup availability

**Notification:** Telegram alert with test results

### Monthly Manual Testing

**Schedule:** First Monday of each month
**Duration:** 30-60 minutes

**Checklist:**

- [ ] Review backup logs
- [ ] Verify cloud backups exist
- [ ] Check backup sizes (growth trend)
- [ ] Test database restore manually
- [ ] Test files restore manually
- [ ] Verify SSL certificate backups
- [ ] Review disaster recovery documentation
- [ ] Update emergency contacts if needed

### Quarterly Full DR Drill

**Schedule:** Every 3 months
**Duration:** 4-8 hours
**Participants:** DevOps team, management

**Drill Procedure:**

1. Simulate complete server failure
2. Provision new test server
3. Restore from cloud backups
4. Time each phase
5. Document issues
6. Update procedures
7. Report to management

---

## Emergency Contacts

### Internal Team

| Role           | Name   | Phone   | Email   | Availability   |
| -------------- | ------ | ------- | ------- | -------------- |
| DevOps Lead    | [Name] | [Phone] | [Email] | 24/7           |
| Database Admin | [Name] | [Phone] | [Email] | Business hours |
| System Admin   | [Name] | [Phone] | [Email] | 24/7 on-call   |
| Backup Admin   | [Name] | [Phone] | [Email] | Business hours |

### External Providers

| Provider      | Service          | Support Contact           | SLA       |
| ------------- | ---------------- | ------------------------- | --------- |
| Backblaze B2  | Cloud Storage    | support@backblaze.com     | 24 hours  |
| Digital Ocean | Hosting          | support@digitalocean.com  | 4 hours   |
| Let's Encrypt | SSL Certificates | community.letsencrypt.org | Community |

### Escalation Path

1. **Level 1 (0-30 min):** DevOps team attempts recovery
2. **Level 2 (30-60 min):** Escalate to database admin
3. **Level 3 (1-2 hours):** Escalate to management
4. **Level 4 (2+ hours):** Engage external support

---

## Post-Recovery

### Immediate Actions (First Hour)

1. **Verify System Functionality**
   - [ ] Database connectivity
   - [ ] Application responsiveness
   - [ ] File uploads working
   - [ ] User login working
   - [ ] Booking creation working

2. **Notify Stakeholders**
   - [ ] Inform management
   - [ ] Update status page
   - [ ] Send customer communication (if needed)

3. **Monitor Closely**
   - [ ] Watch error logs
   - [ ] Monitor performance metrics
   - [ ] Check for anomalies

### First 24 Hours

1. **Detailed Verification**
   - [ ] Compare record counts (before/after)
   - [ ] Verify critical data integrity
   - [ ] Test all major features
   - [ ] Review all backup logs

2. **Create Fresh Backups**
   - [ ] Run immediate full backup
   - [ ] Upload to cloud
   - [ ] Verify new backups

3. **Document Incident**
   - [ ] Timeline of events
   - [ ] Actions taken
   - [ ] Data loss assessment
   - [ ] Lessons learned

### First Week

1. **Root Cause Analysis**
   - Investigate failure cause
   - Identify prevention measures
   - Update monitoring/alerts

2. **Process Improvements**
   - Update DR procedures if needed
   - Adjust backup frequency if needed
   - Improve automation

3. **Team Debrief**
   - Review recovery process
   - Identify improvement areas
   - Update documentation

---

## Appendices

### A. Quick Reference Commands

```bash
# List backups
ls -lh /var/backups/aurelle/database/
ls -lh /var/backups/aurelle/files/
rclone ls b2:aurelle-backups/

# Create manual backup
sudo bash scripts/backup-db.sh
sudo bash scripts/backup-files.sh

# Restore database
sudo bash scripts/restore-db.sh [backup-file]

# Restore files
sudo bash scripts/restore-files.sh [backup-file]

# Test restore
sudo bash scripts/restore-test.sh

# Upload to cloud
sudo bash scripts/upload-to-cloud.sh

# View logs
tail -f /var/log/aurelle-backups/database.log
tail -f /var/log/aurelle-backups/files.log
```

### B. Backup File Naming Convention

```
aurelle_db_YYYYMMDD_HHMMSS.sql.gz
aurelle_files_YYYYMMDD_HHMMSS.tar.gz
```

Example:

- `aurelle_db_20260111_030000.sql.gz` - Database backup from Jan 11, 2026 at 3:00 AM
- `aurelle_files_20260111_030000.tar.gz` - Files backup from Jan 11, 2026 at 3:00 AM

### C. Recovery Time Estimates

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| Database restore (from local) | 5-15 minutes   |
| Database restore (from cloud) | 10-30 minutes  |
| Files restore (from local)    | 5-10 minutes   |
| Files restore (from cloud)    | 15-45 minutes  |
| Server provisioning           | 30-60 minutes  |
| Software installation         | 30-60 minutes  |
| SSL certificate setup         | 10-20 minutes  |
| DNS propagation               | 5-30 minutes   |
| Full system recovery          | 4-8 hours      |

---

## Document Control

### Version History

| Version | Date       | Author      | Changes         |
| ------- | ---------- | ----------- | --------------- |
| 1.0     | 2026-01-11 | DevOps Team | Initial version |

### Review Schedule

- **Next Review:** 2026-04-11
- **Review Frequency:** Quarterly
- **Owner:** DevOps Lead

### Distribution List

- DevOps Team
- Database Administrators
- System Administrators
- Management Team

---

**END OF DOCUMENT**

_This is a living document. Please report any issues or suggest improvements._
