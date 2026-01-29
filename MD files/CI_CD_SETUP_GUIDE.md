# CI/CD Pipeline Setup Guide - AURELLE Beauty Salon Platform

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [GitHub Actions Workflows](#github-actions-workflows)
5. [Environment Setup](#environment-setup)
6. [GitHub Secrets Configuration](#github-secrets-configuration)
7. [Server Setup](#server-setup)
8. [PM2 Configuration](#pm2-configuration)
9. [Deployment Process](#deployment-process)
10. [Rollback Procedure](#rollback-procedure)
11. [Monitoring & Notifications](#monitoring--notifications)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This CI/CD pipeline provides automated deployment for the AURELLE Beauty Salon Platform with the following features:

### Features

- ✅ Automated CI on all branches
- ✅ Automated deployment to staging (develop branch)
- ✅ Manual approval for production deployment (main branch)
- ✅ Zero-downtime deployments with PM2
- ✅ Automatic database migrations
- ✅ Comprehensive health checks
- ✅ Rollback mechanism
- ✅ Telegram & Slack notifications
- ✅ Security audits
- ✅ Build artifacts retention

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Push                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
     ▼                               ▼
┌─────────┐                    ┌─────────┐
│ develop │                    │  main   │
└────┬────┘                    └────┬────┘
     │                              │
     ▼                              ▼
┌─────────────┐              ┌─────────────┐
│   CI Tests  │              │   CI Tests  │
└─────┬───────┘              └─────┬───────┘
      │                            │
      ▼                            ▼
┌─────────────┐              ┌──────────────┐
│    Build    │              │     Build    │
└─────┬───────┘              └─────┬────────┘
      │                            │
      ▼                            ▼
┌─────────────────┐          ┌───────────────────┐
│ Auto-Deploy to  │          │ Manual Approval   │
│    STAGING      │          │    Required       │
└─────────────────┘          └────────┬──────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │  Deploy to      │
                             │  PRODUCTION     │
                             └─────────────────┘
```

---

## Architecture

### Repository Structure

```
.github/
└── workflows/
    ├── ci.yml                  # Continuous Integration
    ├── deploy-staging.yml      # Staging Deployment
    ├── deploy-production.yml   # Production Deployment
    └── rollback.yml           # Rollback Workflow
```

### Environments

| Environment | Branch  | URL                | Auto-Deploy | Approval    |
| ----------- | ------- | ------------------ | ----------- | ----------- |
| Staging     | develop | staging.aurelle.uz | ✅ Yes      | ❌ No       |
| Production  | main    | aurelle.uz         | ❌ No       | ✅ Required |

---

## Prerequisites

### Required Software on Servers

Both staging and production servers need:

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (Process Manager)
sudo npm install -g pm2

# PostgreSQL Client (for database operations)
sudo apt-get install -y postgresql-client

# Git (for version tagging)
sudo apt-get install -y git

# jq (for JSON parsing in health checks)
sudo apt-get install -y jq
```

### Server Directory Structure

```bash
# Production
/var/www/aurelle-production/          # Application directory
/var/www/aurelle-production-backups/  # Backup directory

# Staging
/var/www/aurelle-staging/             # Application directory
/var/www/aurelle-staging-backups/     # Backup directory
```

Create directories:

```bash
# For production
sudo mkdir -p /var/www/aurelle-production
sudo mkdir -p /var/www/aurelle-production-backups
sudo chown -R $USER:$USER /var/www/aurelle-production*

# For staging
sudo mkdir -p /var/www/aurelle-staging
sudo mkdir -p /var/www/aurelle-staging-backups
sudo chown -R $USER:$USER /var/www/aurelle-staging*
```

---

## GitHub Actions Workflows

### 1. CI Workflow (ci.yml)

**Trigger**: Push to any branch, Pull requests to main/develop

**Jobs**:

- TypeScript type checking
- Run tests (when configured)
- Build project
- Security audit (npm audit)
- Upload build artifacts

**Status Badge**:

```markdown
![CI](https://github.com/Rustam4262/aurelle/actions/workflows/ci.yml/badge.svg)
```

### 2. Staging Deployment (deploy-staging.yml)

**Trigger**:

- Push to `develop` branch
- Manual dispatch

**Steps**:

1. Checkout code
2. Install dependencies
3. TypeScript check
4. Build project
5. Create deployment package
6. Upload to staging server via SCP
7. SSH to server:
   - Create backup
   - Extract new version
   - Install production dependencies
   - Run database migrations
   - Restart PM2 (zero-downtime)
8. Health checks
9. Send notifications

**Environment**: `staging`

### 3. Production Deployment (deploy-production.yml)

**Trigger**:

- Push to `main` branch
- Manual dispatch

**Steps**:

1. **Build Job**: Build and prepare deployment
2. **Approval Job**: Manual approval required (uses `production-approval` environment)
3. **Deploy Job**:
   - Download build artifact
   - Upload to production server
   - SSH to server:
     - Create backup (last 10 kept)
     - Create database backup
     - Extract new version
     - Install production dependencies
     - Run database migrations
     - PM2 reload (zero-downtime)
   - Health checks
   - Smoke tests
   - Create deployment tag
   - Send notifications

**Environment**: `production` (with manual approval)

### 4. Rollback Workflow (rollback.yml)

**Trigger**: Manual dispatch only

**Inputs**:

- `environment`: production or staging
- `backup_timestamp`: Specific backup or "latest"
- `reason`: Reason for rollback

**Steps**:

1. Validate rollback request
2. SSH to server:
   - Locate backup
   - Backup current (failed) version
   - Restore previous version
   - Restart PM2
3. Health checks
4. Send notifications
5. Create incident report

---

## Environment Setup

### GitHub Environments Configuration

Go to: **Settings → Environments**

#### 1. Create `staging` Environment

- **Protection rules**: None (auto-deploy)
- **Environment secrets**: Add staging server credentials

#### 2. Create `production` Environment

- **Protection rules**:
  - ✅ Required reviewers (1-6 reviewers)
  - ✅ Wait timer: 0 minutes (or set delay if needed)
- **Environment secrets**: Add production server credentials

#### 3. Create `production-approval` Environment

- **Protection rules**:
  - ✅ Required reviewers (at least 1 senior developer)
- **Purpose**: Manual approval gate before production deployment

#### 4. Create `production-rollback` Environment

- **Protection rules**:
  - ✅ Required reviewers (at least 1 senior developer)
- **Purpose**: Manual approval for production rollbacks

#### 5. Create `staging-rollback` Environment

- **Protection rules**: Optional (or none for quick rollbacks)

---

## GitHub Secrets Configuration

Go to: **Settings → Secrets and variables → Actions**

### Staging Environment Secrets

Add these secrets to the `staging` environment:

| Secret Name            | Description                     | Example                                                 |
| ---------------------- | ------------------------------- | ------------------------------------------------------- |
| `STAGING_HOST`         | Server IP or hostname           | `staging.aurelle.uz` or `192.168.1.100`                 |
| `STAGING_USER`         | SSH username                    | `deploy` or `ubuntu`                                    |
| `STAGING_SSH_KEY`      | Private SSH key                 | `-----BEGIN OPENSSH PRIVATE KEY-----...`                |
| `STAGING_PORT`         | SSH port (optional, default 22) | `22`                                                    |
| `STAGING_DATABASE_URL` | PostgreSQL connection string    | `postgresql://user:pass@localhost:5432/aurelle_staging` |

### Production Environment Secrets

Add these secrets to the `production` environment:

| Secret Name               | Description                     | Example                                                    |
| ------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `PRODUCTION_HOST`         | Server IP or hostname           | `aurelle.uz` or `192.168.1.101`                            |
| `PRODUCTION_USER`         | SSH username                    | `deploy` or `ubuntu`                                       |
| `PRODUCTION_SSH_KEY`      | Private SSH key                 | `-----BEGIN OPENSSH PRIVATE KEY-----...`                   |
| `PRODUCTION_PORT`         | SSH port (optional, default 22) | `22`                                                       |
| `PRODUCTION_DATABASE_URL` | PostgreSQL connection string    | `postgresql://user:pass@localhost:5432/aurelle_production` |
| `PRODUCTION_DB_HOST`      | Database host (for pg_dump)     | `localhost`                                                |
| `PRODUCTION_DB_USER`      | Database username               | `aurelle_user`                                             |
| `PRODUCTION_DB_PASSWORD`  | Database password               | `secure_password`                                          |
| `PRODUCTION_DB_NAME`      | Database name                   | `aurelle_production`                                       |

### Repository Secrets (Global)

Add these secrets at repository level (Settings → Secrets → Actions):

| Secret Name          | Description              | Required | How to Get                                            |
| -------------------- | ------------------------ | -------- | ----------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token       | Optional | [@BotFather](https://t.me/BotFather)                  |
| `TELEGRAM_CHAT_ID`   | Telegram chat/channel ID | Optional | [@userinfobot](https://t.me/userinfobot)              |
| `SLACK_WEBHOOK_URL`  | Slack incoming webhook   | Optional | [Slack API](https://api.slack.com/messaging/webhooks) |

---

## Server Setup

### 1. Create Deployment User

```bash
# Create user
sudo adduser deploy

# Add to sudo group (if needed)
sudo usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

### 2. SSH Key Setup

Generate SSH key pair for GitHub Actions:

```bash
# On your local machine (not on server)
ssh-keygen -t ed25519 -C "github-actions@aurelle.uz" -f aurelle-deploy-key

# This creates two files:
# - aurelle-deploy-key (private key - add to GitHub Secrets)
# - aurelle-deploy-key.pub (public key - add to server)
```

Add public key to server:

```bash
# On the server (as deploy user)
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add public key
echo "ssh-ed25519 AAAAC3Nza... github-actions@aurelle.uz" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Add private key to GitHub Secrets:

```bash
# Copy private key content (on your local machine)
cat aurelle-deploy-key

# Copy the entire output (including BEGIN and END lines)
# Add to GitHub Secrets as STAGING_SSH_KEY and PRODUCTION_SSH_KEY
```

### 3. PostgreSQL Setup

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

-- In PostgreSQL prompt:
CREATE DATABASE aurelle_staging;
CREATE USER aurelle_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE aurelle_staging TO aurelle_user;
\q
```

### 4. Environment Variables on Server

Create `.env` file in application directory:

```bash
# Production
cat > /var/www/aurelle-production/.env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/aurelle_production
SESSION_SECRET=your-super-secret-session-key-min-32-chars
# ... other environment variables from .env.example
EOF

# Staging
cat > /var/www/aurelle-staging/.env << 'EOF'
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:pass@localhost:5432/aurelle_staging
SESSION_SECRET=your-staging-secret-key
# ... other environment variables
EOF
```

### 5. Nginx Setup (Reverse Proxy)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Production config
sudo nano /etc/nginx/sites-available/aurelle-production
```

```nginx
server {
    listen 80;
    server_name aurelle.uz www.aurelle.uz;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aurelle.uz www.aurelle.uz;

    ssl_certificate /etc/letsencrypt/live/aurelle.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurelle.uz/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/aurelle-production /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d aurelle.uz -d www.aurelle.uz

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

---

## PM2 Configuration

### PM2 Ecosystem File (Optional)

Create `ecosystem.config.js` in application root:

```javascript
module.exports = {
  apps: [
    {
      name: "aurelle-production",
      script: "./dist/index.cjs",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      error_file: "/var/log/pm2/aurelle-production-error.log",
      out_file: "/var/log/pm2/aurelle-production-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_memory_restart: "1G",
      autorestart: true,
      watch: false,
    },
    {
      name: "aurelle-staging",
      script: "./dist/index.cjs",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      error_file: "/var/log/pm2/aurelle-staging-error.log",
      out_file: "/var/log/pm2/aurelle-staging-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_memory_restart: "512M",
      autorestart: true,
      watch: false,
    },
  ],
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --only aurelle-production

# Reload (zero-downtime)
pm2 reload aurelle-production

# Restart
pm2 restart aurelle-production

# Stop
pm2 stop aurelle-production

# Delete
pm2 delete aurelle-production

# Logs
pm2 logs aurelle-production
pm2 logs aurelle-production --lines 100
pm2 logs aurelle-production --err

# Monitoring
pm2 monit

# Status
pm2 status
pm2 describe aurelle-production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions printed
```

---

## Deployment Process

### Automatic Deployment (Staging)

1. Push to `develop` branch:

   ```bash
   git checkout develop
   git add .
   git commit -m "feat: new feature"
   git push origin develop
   ```

2. GitHub Actions automatically:
   - Runs CI tests
   - Builds project
   - Deploys to staging
   - Sends notification

3. Check deployment:
   - Visit https://staging.aurelle.uz
   - Check GitHub Actions logs
   - Check Telegram/Slack notification

### Manual Deployment (Production)

#### Method 1: Via Push to Main

1. Merge `develop` into `main`:

   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

2. GitHub Actions workflow starts:
   - Runs CI tests and builds
   - **Waits for manual approval**

3. Approve deployment:
   - Go to: Actions → Deploy to Production → Review deployments
   - Select "production-approval" environment
   - Click "Approve and deploy"

4. GitHub Actions continues:
   - Deploys to production
   - Runs health checks
   - Sends notification
   - Creates deployment tag

#### Method 2: Manual Trigger

1. Go to: **Actions → Deploy to Production**
2. Click "Run workflow"
3. Select branch: `main`
4. Enter reason (optional)
5. Click "Run workflow"
6. Approve when prompted

### Deployment Checklist

Before deploying to production:

- [ ] All tests pass in staging
- [ ] Manual testing completed
- [ ] Database migrations tested
- [ ] No critical bugs reported
- [ ] Performance acceptable
- [ ] Security vulnerabilities addressed
- [ ] Backup verification
- [ ] Rollback plan ready
- [ ] Team notified

---

## Rollback Procedure

### When to Rollback

- Critical bugs in production
- Database migration failures
- Performance degradation
- Security vulnerabilities
- Failed health checks

### How to Rollback

#### Method 1: Via GitHub Actions (Recommended)

1. Go to: **Actions → Rollback Deployment**
2. Click "Run workflow"
3. Fill in inputs:
   - **Environment**: `production` or `staging`
   - **Backup timestamp**: `latest` or specific timestamp (e.g., `20260110_143025`)
   - **Reason**: Describe why rollback is needed
4. Click "Run workflow"
5. Approve rollback (if protection rules enabled)
6. Monitor workflow execution
7. Verify application is working

#### Method 2: Manual Rollback (Emergency)

If GitHub Actions is unavailable:

```bash
# SSH to server
ssh deploy@aurelle.uz

# Navigate to backup directory
cd /var/www/aurelle-production-backups

# List available backups
ls -lt

# Restore backup
BACKUP_PATH="backup_20260110_143025"  # Use actual timestamp
APP_DIR="/var/www/aurelle-production"

# Backup current (failed) version
cp -r $APP_DIR failed_$(date +%Y%m%d_%H%M%S)

# Restore previous version
rm -rf $APP_DIR
cp -r $BACKUP_PATH $APP_DIR

# Restart PM2
cd $APP_DIR
pm2 reload aurelle-production

# Check status
pm2 status
pm2 logs aurelle-production --lines 50
```

### Rollback Verification

After rollback:

1. Check PM2 status:

   ```bash
   pm2 status
   pm2 describe aurelle-production
   ```

2. Check application logs:

   ```bash
   pm2 logs aurelle-production --lines 100
   ```

3. Test critical endpoints:

   ```bash
   curl -I https://aurelle.uz/
   curl https://aurelle.uz/api/salons
   ```

4. Monitor error rates
5. Check database integrity
6. Notify team

---

## Monitoring & Notifications

### Telegram Notifications

#### Setup Telegram Bot

1. Create bot via [@BotFather](https://t.me/BotFather):

   ```
   /newbot
   Your bot name: AURELLE Deployments
   Your bot username: aurelle_deploy_bot
   ```

2. Copy bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

3. Get your chat ID:
   - Send message to [@userinfobot](https://t.me/userinfobot)
   - Copy your chat ID (format: `123456789`)

4. Add secrets to GitHub:
   - `TELEGRAM_BOT_TOKEN`: Bot token from step 2
   - `TELEGRAM_CHAT_ID`: Your chat ID from step 3

#### Notification Types

**Staging Deployment**:

```
✅ Staging Deployment Successful

Repository: Rustam4262/aurelle
Branch: develop
Commit: abc123...
Author: username

Environment: staging.aurelle.uz
Time: 2026-01-10T14:30:25Z
```

**Production Deployment**:

```
🎉 Production Deployment Successful

Repository: Rustam4262/aurelle
Branch: main
Commit: def456...
Author: username
Approved by: approver

Environment: aurelle.uz
Deployment time: 2026-01-10T15:00:00Z

✅ All health checks passed
🌐 Site is live and operational
```

**Rollback**:

```
🔄 Rollback Successful

Environment: production
Backup restored: latest
Reason: Critical bug in payment flow
Performed by: username

✅ Health checks passed
System restored to previous state
```

### Slack Notifications

#### Setup Slack Webhook

1. Go to [Slack API](https://api.slack.com/messaging/webhooks)
2. Create new Incoming Webhook
3. Select channel (e.g., `#deployments`)
4. Copy webhook URL
5. Add to GitHub Secrets as `SLACK_WEBHOOK_URL`

### PM2 Monitoring

#### Install PM2 Plus (Optional)

```bash
# Register for PM2 Plus
pm2 plus

# Link server
pm2 link <secret_key> <public_key>

# Monitor at: https://app.pm2.io
```

#### PM2 Logs

```bash
# Real-time logs
pm2 logs aurelle-production

# Error logs only
pm2 logs aurelle-production --err

# Last 100 lines
pm2 logs aurelle-production --lines 100

# Logs for all apps
pm2 logs
```

---

## Troubleshooting

### Common Issues

#### 1. SSH Connection Failed

**Error**: `Permission denied (publickey)`

**Solution**:

```bash
# Verify SSH key is added to server
ssh -i aurelle-deploy-key deploy@aurelle.uz

# Check authorized_keys on server
cat ~/.ssh/authorized_keys

# Verify GitHub Secret contains full private key
# Including -----BEGIN OPENSSH PRIVATE KEY----- and -----END OPENSSH PRIVATE KEY-----
```

#### 2. Build Failed

**Error**: `npm run build failed`

**Solution**:

```bash
# Check TypeScript errors
npm run check

# Check Node.js version
node --version  # Should be 20.x

# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### 3. Database Migration Failed

**Error**: `drizzle-kit push failed`

**Solution**:

```bash
# Check database connectivity
psql $DATABASE_URL

# Verify database user permissions
GRANT ALL PRIVILEGES ON DATABASE aurelle_production TO aurelle_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aurelle_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aurelle_user;

# Manual migration
cd /var/www/aurelle-production
npx drizzle-kit push
```

#### 4. PM2 Not Restarting

**Error**: `pm2 reload failed`

**Solution**:

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs aurelle-production --err --lines 50

# Force restart
pm2 restart aurelle-production

# If all else fails
pm2 delete aurelle-production
pm2 start dist/index.cjs --name aurelle-production -i max
pm2 save
```

#### 5. Health Check Failed

**Error**: `curl http://localhost:5000 returns connection refused`

**Solution**:

```bash
# Check if app is running
pm2 status

# Check port binding
netstat -tuln | grep 5000

# Check application logs
pm2 logs aurelle-production --lines 100

# Check environment variables
pm2 env aurelle-production

# Test directly
cd /var/www/aurelle-production
node dist/index.cjs
```

#### 6. Deployment Approved but Not Running

**Error**: Workflow stuck after approval

**Solution**:

1. Check GitHub Actions logs
2. Verify all required secrets are set
3. Check server SSH access
4. Re-run workflow

#### 7. Rollback Failed

**Error**: Backup not found

**Solution**:

```bash
# List available backups
ls -lt /var/www/aurelle-production-backups

# Verify backup integrity
du -sh /var/www/aurelle-production-backups/backup_*

# Manually restore specific backup
BACKUP="backup_20260110_143025"
cp -r /var/www/aurelle-production-backups/$BACKUP /var/www/aurelle-production
cd /var/www/aurelle-production
pm2 reload aurelle-production
```

### Debug Mode

Enable verbose logging:

```bash
# In GitHub Actions workflow, add:
- name: Debug SSH connection
  run: ssh -vvv deploy@aurelle.uz "echo Connection successful"

# On server, enable PM2 debug logs:
pm2 restart aurelle-production --log-date-format 'YYYY-MM-DD HH:mm:ss.SSS'
pm2 logs aurelle-production --raw
```

### Getting Help

1. Check workflow logs: Actions → Select workflow run → View logs
2. Check server logs: `pm2 logs aurelle-production`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Check system logs: `sudo journalctl -xe`
5. Contact DevOps team with:
   - Workflow run URL
   - Error messages
   - Server logs
   - Steps to reproduce

---

## Best Practices

### Development Workflow

1. **Feature Development**:

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   # ... make changes ...
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   # Create PR to develop
   ```

2. **Testing in Staging**:
   - Merge PR to `develop`
   - Auto-deploys to staging
   - Test thoroughly
   - Monitor for 24 hours

3. **Production Release**:
   - Create PR from `develop` to `main`
   - Review and approve PR
   - Merge to `main`
   - Approve deployment in GitHub Actions
   - Monitor closely

### Deployment Best Practices

- ✅ Always test in staging first
- ✅ Deploy during low-traffic hours
- ✅ Monitor logs after deployment
- ✅ Keep rollback plan ready
- ✅ Communicate with team
- ✅ Document changes
- ❌ Don't skip approvals
- ❌ Don't deploy on Fridays (unless necessary)
- ❌ Don't deploy multiple features at once

### Database Migration Best Practices

- ✅ Test migrations in staging
- ✅ Backup before migration
- ✅ Use reversible migrations when possible
- ✅ Run migrations during maintenance window
- ❌ Don't delete columns immediately (deprecate first)
- ❌ Don't rename tables without backward compatibility

### Security Best Practices

- ✅ Rotate SSH keys regularly
- ✅ Use environment-specific secrets
- ✅ Enable 2FA for GitHub
- ✅ Limit deployment approvers
- ✅ Audit deployment logs
- ❌ Don't commit secrets to repository
- ❌ Don't share SSH keys
- ❌ Don't disable approval gates

---

## Appendix

### Quick Reference Commands

```bash
# Deploy to staging
git push origin develop

# Deploy to production
git push origin main
# Then approve in GitHub Actions

# Rollback production
# Go to: Actions → Rollback Deployment → Run workflow

# Check deployment status
pm2 status

# View logs
pm2 logs aurelle-production --lines 100

# Restart application
pm2 reload aurelle-production

# Check server resources
free -h
df -h
pm2 monit
```

### Environment Variables Reference

See [.env.example](.env.example) for complete list.

### Useful Links

- GitHub Repository: https://github.com/Rustam4262/aurelle
- GitHub Actions: https://github.com/Rustam4262/aurelle/actions
- Production: https://aurelle.uz
- Staging: https://staging.aurelle.uz
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- GitHub Actions Docs: https://docs.github.com/en/actions
- Drizzle ORM Migrations: https://orm.drizzle.team/kit-docs/overview

---

**Last Updated**: January 10, 2026
**Version**: 1.0.0
**Maintainer**: DevOps Team
