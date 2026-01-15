# Infrastructure Monitoring Guide - AURELLE Beauty Salon Platform

## 📋 Table of Contents

1. [Overview](#overview)
2. [Alert System](#alert-system)
3. [Monitoring Scripts](#monitoring-scripts)
4. [Installation & Setup](#installation--setup)
5. [Telegram Configuration](#telegram-configuration)
6. [Cron Jobs Configuration](#cron-jobs-configuration)
7. [Dashboard Options](#dashboard-options)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Overview

Complete infrastructure monitoring system with Telegram alerts for the AURELLE platform.

### Features

✅ **Resource Monitoring**:
- Disk usage (alert > 85%)
- Memory usage (alert > 90%)
- CPU usage (alert > 80% for 5min)

✅ **Application Monitoring**:
- PM2 process crashes
- PM2 automatic restarts
- High memory usage by processes

✅ **Database Monitoring**:
- PostgreSQL connection status
- Connection count
- Long-running queries

✅ **Security Monitoring**:
- SSL certificate expiration (alert < 30 days)
- Certificate validation

✅ **Health Monitoring**:
- Application health endpoints
- Response time tracking
- Availability monitoring

✅ **Telegram Notifications**:
- Real-time alerts
- Different severity levels
- Alert cooldown to prevent spam
- Recovery notifications

---

## Alert System

### Alert Levels

| Level | Icon | Telegram Color | When Used |
|-------|------|---------------|-----------|
| **CRITICAL** | 🚨 | Red | Disk > 95%, Memory > 95%, PM2 crash, DB failure, SSL expired |
| **WARNING** | ⚠️ | Yellow | Disk > 85%, Memory > 90%, CPU > 80%, SSL < 30 days |
| **INFO** | ℹ️ | Blue | Deployment started, configuration changes |
| **SUCCESS** | ✅ | Green | Issue recovered, deployment successful |

### Alert Thresholds

```bash
# Disk Usage
WARNING: > 85%
CRITICAL: > 90%
VERY CRITICAL: > 95%

# Memory Usage
WARNING: > 90%
CRITICAL: > 92%
VERY CRITICAL: > 95%

# CPU Usage
WARNING: > 80% sustained for 5 minutes
CRITICAL: > 90% sustained for 5 minutes
VERY CRITICAL: > 95% sustained for 5 minutes

# PM2
CRITICAL: Process crashed or stopped
WARNING: Single restart
CRITICAL: Multiple restarts (> 5)
WARNING: High memory usage (> 1GB)

# Database
CRITICAL: Connection failed
WARNING: Too many connections (> 80)
WARNING: Long-running queries (> 5 min)

# SSL Certificate
CRITICAL: Expired
CRITICAL: Expiring in < 7 days
WARNING: Expiring in < 30 days

# Health Endpoint
CRITICAL: Connection failed or HTTP 5xx
WARNING: HTTP 4xx or slow response (> 5s)
```

### Alert Cooldown

To prevent alert spam, cooldown periods are implemented:

| Monitor Type | Cooldown Period |
|--------------|-----------------|
| Disk | 1 hour |
| Memory | 30 minutes |
| CPU | 30 minutes |
| PM2 | No cooldown (immediate) |
| Database | 10 minutes |
| SSL | 1 day |
| Health | 10 minutes |

---

## Monitoring Scripts

### 1. Telegram Send Script

**File**: [scripts/telegram-send.sh](scripts/telegram-send.sh)

**Purpose**: Core notification script for sending Telegram alerts

**Usage**:
```bash
# Critical alert
bash scripts/telegram-send.sh critical "Disk Full" "Usage: 95%"

# Warning alert
bash scripts/telegram-send.sh warning "High Memory" "Usage: 85%"

# Info notification
bash scripts/telegram-send.sh info "Deployment" "Starting version 1.0.0"

# Success notification
bash scripts/telegram-send.sh success "Recovered" "Disk usage back to normal"
```

**Configuration**:
```bash
TELEGRAM_BOT_TOKEN="7985842709:AAE_0p3pDQdw8jis9RkCXlDFIMuqZZqmUvo"
TELEGRAM_CHAT_ID="1680204574"
```

### 2. Disk Usage Monitor

**File**: [scripts/monitor-disk.sh](scripts/monitor-disk.sh)

**Checks**: Disk usage on all mounted filesystems

**Alerts**:
- > 85%: Warning
- > 90%: Critical
- > 95%: Very Critical

**Features**:
- Checks all mount points
- Shows filesystem, size, used, available
- 1-hour cooldown between duplicate alerts
- Sends recovery notification

**Example Output**:
```
Checking /: 78%
✅ Disk usage is normal

Checking /var: 92%
🚨 Disk usage 92% exceeds threshold 85% on /var
```

### 3. Memory Monitor

**File**: [scripts/monitor-memory.sh](scripts/monitor-memory.sh)

**Checks**: RAM usage

**Alerts**:
- > 90%: Warning
- > 92%: Critical
- > 95%: Very Critical

**Features**:
- Shows total, used, available memory
- Lists top 5 memory-consuming processes
- 30-minute cooldown
- Recovery notification

**Example Output**:
```
Memory Usage: 85% (6800MB / 8000MB)
✅ Memory usage is normal

Top processes:
node: 2.5GB
postgres: 1.2GB
```

### 4. CPU Monitor

**File**: [scripts/monitor-cpu.sh](scripts/monitor-cpu.sh)

**Checks**: CPU usage sustained over 5 minutes

**Alerts**:
- > 80% sustained: Warning
- > 90% sustained: Critical
- > 95% sustained: Very Critical

**Features**:
- Monitors CPU for 5 minutes (30 checks × 10s intervals)
- Only alerts if high usage is sustained (> 80% of checks)
- Shows top 5 CPU-consuming processes
- 30-minute cooldown

**Example Output**:
```
Check 1/30: CPU 85%
Check 2/30: CPU 82%
...
Average CPU: 84%
High usage checks: 25/30 (83%)
🚨 Sustained high CPU usage detected!
```

### 5. PM2 Process Monitor

**File**: [scripts/monitor-pm2.sh](scripts/monitor-pm2.sh)

**Checks**: PM2 process status, crashes, restarts

**Alerts**:
- Process crashed/stopped: Critical
- Process missing: Critical
- Single restart: Warning
- Multiple restarts (> 5): Critical
- High memory usage (> 1GB): Warning

**Features**:
- Monitors configured apps
- Tracks restart count
- Shows process logs on errors
- No cooldown (immediate alerts)

**Example Output**:
```
Checking aurelle-production...
  Status: online
  Restarts: 0
✅ All processes healthy

Checking aurelle-staging...
  Status: errored
🚨 App aurelle-staging is errored!
```

### 6. Database Monitor

**File**: [scripts/monitor-database.sh](scripts/monitor-database.sh)

**Checks**: PostgreSQL connection and health

**Alerts**:
- Connection failed: Critical
- High connection count (> 80): Warning
- Long-running queries (> 5 min): Warning

**Features**:
- Tests database connectivity
- Shows database size
- Monitors active connections
- Detects slow queries
- 10-minute cooldown

**Example Output**:
```
Testing connection to PostgreSQL...
  Host: localhost
  Port: 5432
  Database: aurelle_production
✅ Database connection successful

Database Statistics:
  Database size: 2.5GB
  Active connections: 12
  Long-running queries: 0
```

### 7. SSL Certificate Monitor

**File**: [scripts/monitor-ssl.sh](scripts/monitor-ssl.sh)

**Checks**: SSL certificate expiration for all domains

**Alerts**:
- Expired: Critical
- < 7 days: Critical
- < 30 days: Warning

**Features**:
- Checks multiple domains
- Shows issuer and expiry date
- Calculates days remaining
- 1-day cooldown

**Domains Monitored**:
- aurelle.uz
- www.aurelle.uz
- staging.aurelle.uz

**Example Output**:
```
Checking SSL certificate for aurelle.uz...
  Expires: Feb 15 12:00:00 2026 GMT
  Days remaining: 36
✅ Certificate is valid
```

### 8. Health Endpoint Monitor

**File**: [scripts/monitor-health.sh](scripts/monitor-health.sh)

**Checks**: Application health endpoints

**Alerts**:
- Connection failed: Critical
- HTTP 5xx: Critical
- HTTP 4xx: Warning
- Slow response (> 5s): Warning

**Features**:
- Checks multiple endpoints
- Measures response time
- Tracks availability
- 10-minute cooldown

**Endpoints Monitored**:
- https://aurelle.uz/api/health (production)
- https://staging.aurelle.uz/api/health (staging)
- http://localhost:5000/api/health (local production)
- http://localhost:5001/api/health (local staging)

**Example Output**:
```
Checking production (https://aurelle.uz/api/health)...
  Status: 200
  Response time: 145ms
✅ Health check passed
```

---

## Installation & Setup

### Quick Setup

```bash
# 1. Clone or navigate to project directory
cd /path/to/aurelle

# 2. Make setup script executable
chmod +x scripts/setup-monitoring.sh

# 3. Run setup script
bash scripts/setup-monitoring.sh
```

### Manual Setup

#### Step 1: Make Scripts Executable

```bash
cd scripts
chmod +x telegram-send.sh
chmod +x monitor-*.sh
chmod +x setup-monitoring.sh
```

#### Step 2: Create Log Directory

```bash
sudo mkdir -p /var/log/aurelle-monitoring
sudo chown $USER:$USER /var/log/aurelle-monitoring
```

#### Step 3: Test Telegram Notification

```bash
bash scripts/telegram-send.sh info "Test" "Testing Telegram notifications"
```

Check your Telegram to confirm receipt.

#### Step 4: Setup Cron Jobs

```bash
# Edit crontab
crontab -e

# Add monitoring jobs (see Cron Jobs Configuration section)
```

#### Step 5: Test Individual Monitors

```bash
# Test disk monitor
bash scripts/monitor-disk.sh

# Test memory monitor
bash scripts/monitor-memory.sh

# Test PM2 monitor
bash scripts/monitor-pm2.sh

# Test database monitor
bash scripts/monitor-database.sh

# Test health endpoint
bash scripts/monitor-health.sh
```

---

## Telegram Configuration

### Already Configured

The system is pre-configured with:

**Bot Token**: `7985842709:AAE_0p3pDQdw8jis9RkCXlDFIMuqZZqmUvo`
**Chat ID**: `1680204574`

### To Change Configuration

Edit [scripts/telegram-send.sh](scripts/telegram-send.sh:7-8):

```bash
TELEGRAM_BOT_TOKEN="your-bot-token-here"
TELEGRAM_CHAT_ID="your-chat-id-here"
```

### Create Your Own Bot (Optional)

1. **Start chat with [@BotFather](https://t.me/BotFather)**
2. **Send**: `/newbot`
3. **Follow prompts** to create bot
4. **Copy token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Get Chat ID**:
   - Start chat with [@userinfobot](https://t.me/userinfobot)
   - Copy your chat ID (format: `1234567890`)
6. **Start chat with your bot** (required for it to send messages)

---

## Cron Jobs Configuration

### Automated Setup

The [setup-monitoring.sh](scripts/setup-monitoring.sh) script automatically configures all cron jobs.

### Manual Configuration

Edit crontab:

```bash
crontab -e
```

Add these entries:

```bash
# AURELLE Infrastructure Monitoring

# Disk usage - Every hour
0 * * * * /path/to/aurelle/scripts/monitor-disk.sh >> /var/log/aurelle-monitoring/disk.log 2>&1

# Memory - Every 30 minutes
*/30 * * * * /path/to/aurelle/scripts/monitor-memory.sh >> /var/log/aurelle-monitoring/memory.log 2>&1

# CPU - Every 15 minutes
*/15 * * * * /path/to/aurelle/scripts/monitor-cpu.sh >> /var/log/aurelle-monitoring/cpu.log 2>&1

# PM2 - Every 5 minutes
*/5 * * * * /path/to/aurelle/scripts/monitor-pm2.sh >> /var/log/aurelle-monitoring/pm2.log 2>&1

# Database - Every 5 minutes
*/5 * * * * /path/to/aurelle/scripts/monitor-database.sh >> /var/log/aurelle-monitoring/database.log 2>&1

# Health - Every 5 minutes
*/5 * * * * /path/to/aurelle/scripts/monitor-health.sh >> /var/log/aurelle-monitoring/health.log 2>&1

# SSL - Daily at 9 AM
0 9 * * * /path/to/aurelle/scripts/monitor-ssl.sh >> /var/log/aurelle-monitoring/ssl.log 2>&1

# Log cleanup - Weekly on Sunday at 3 AM
0 3 * * 0 find /var/log/aurelle-monitoring -name "*.log" -mtime +30 -delete
```

### View Cron Jobs

```bash
# List all cron jobs
crontab -l

# List only AURELLE monitoring jobs
crontab -l | grep aurelle
```

### Remove Cron Jobs

```bash
# Remove all AURELLE monitoring jobs
crontab -l | grep -v aurelle-monitoring | crontab -
```

---

## Dashboard Options

### Option 1: Netdata (Recommended)

**Real-time system monitoring dashboard**

#### Installation

```bash
# Install Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Start Netdata
sudo systemctl start netdata
sudo systemctl enable netdata
```

#### Access

- **URL**: http://localhost:19999
- **SSH Tunnel**: `ssh -L 19999:localhost:19999 user@server`

#### Features

✅ Real-time metrics (1s granularity)
✅ CPU, memory, disk, network graphs
✅ Process monitoring
✅ Low resource usage
✅ No configuration needed
✅ Auto-detects services (PostgreSQL, PM2, Nginx)

#### Secure Access

```nginx
# Nginx reverse proxy for Netdata
server {
    listen 80;
    server_name monitoring.aurelle.uz;

    location / {
        proxy_pass http://localhost:19999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Basic auth (optional)
        auth_basic "Monitoring Dashboard";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

### Option 2: Grafana + Prometheus

**Advanced metrics and custom dashboards**

#### Installation

```bash
# Install Prometheus
sudo apt-get install -y prometheus

# Install Grafana
sudo apt-get install -y grafana

# Install node_exporter for system metrics
sudo apt-get install -y prometheus-node-exporter

# Install postgres_exporter for database metrics
wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
tar xvfz postgres_exporter-*.tar.gz
sudo mv postgres_exporter-*/postgres_exporter /usr/local/bin/
```

#### Configuration

**Prometheus config** (`/etc/prometheus/prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

**Grafana**:
1. Access: http://localhost:3000
2. Login: admin/admin
3. Add Prometheus data source
4. Import dashboard ID: 1860 (Node Exporter Full)
5. Import dashboard ID: 9628 (PostgreSQL)

#### Features

✅ Custom dashboards
✅ Historical data
✅ Advanced alerting
✅ Multiple data sources
✅ Beautiful visualizations

### Option 3: Simple HTML Dashboard

**Lightweight custom dashboard**

Create `/var/www/monitoring/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>AURELLE Monitoring</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-ok { color: #4caf50; }
        .status-warning { color: #ff9800; }
        .status-critical { color: #f44336; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .metric-name { font-weight: bold; }
        .metric-value { font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>AURELLE Infrastructure Monitoring</h1>
        <p>Last update: <span id="timestamp"></span></p>

        <div class="card">
            <h2>System Resources</h2>
            <div class="metric">
                <span class="metric-name">Disk Usage:</span>
                <span class="metric-value status-ok" id="disk">Loading...</span>
            </div>
            <div class="metric">
                <span class="metric-name">Memory Usage:</span>
                <span class="metric-value status-ok" id="memory">Loading...</span>
            </div>
            <div class="metric">
                <span class="metric-name">CPU Usage:</span>
                <span class="metric-value status-ok" id="cpu">Loading...</span>
            </div>
        </div>

        <div class="card">
            <h2>Application Status</h2>
            <div class="metric">
                <span class="metric-name">Production:</span>
                <span class="metric-value status-ok" id="prod">Loading...</span>
            </div>
            <div class="metric">
                <span class="metric-name">Staging:</span>
                <span class="metric-value status-ok" id="staging">Loading...</span>
            </div>
        </div>
    </div>

    <script>
        async function updateMetrics() {
            document.getElementById('timestamp').textContent = new Date().toLocaleString();

            // Fetch health endpoint
            try {
                const response = await fetch('/api/health');
                const data = await response.json();

                // Update values from health endpoint
                document.getElementById('prod').textContent = data.status;
                // Add more metrics as needed
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            }
        }

        updateMetrics();
        setInterval(updateMetrics, 30000); // Update every 30 seconds
    </script>
</body>
</html>
```

---

## Troubleshooting

### Issue: Not Receiving Telegram Notifications

**Check**:
1. Verify bot token and chat ID are correct
2. Start a chat with your bot (required for it to send messages)
3. Test manually:
   ```bash
   bash scripts/telegram-send.sh info "Test" "Testing notifications"
   ```
4. Check for errors in logs:
   ```bash
   tail -f /var/log/aurelle-monitoring/*.log
   ```

### Issue: Cron Jobs Not Running

**Check**:
1. Verify cron service is running:
   ```bash
   sudo systemctl status cron
   ```
2. Check crontab is configured:
   ```bash
   crontab -l | grep aurelle
   ```
3. Check script paths are absolute
4. Verify scripts are executable:
   ```bash
   ls -l scripts/monitor-*.sh
   ```
5. Check cron logs:
   ```bash
   sudo tail -f /var/log/syslog | grep CRON
   ```

### Issue: False Positive Alerts

**Solutions**:
1. Adjust thresholds in scripts
2. Increase cooldown periods
3. Review alert conditions

**Example** - Adjust disk threshold:

Edit [scripts/monitor-disk.sh](scripts/monitor-disk.sh:7):
```bash
THRESHOLD=90  # Change from 85 to 90
```

### Issue: Missing Logs

**Check**:
1. Log directory exists and is writable:
   ```bash
   ls -ld /var/log/aurelle-monitoring
   ```
2. Create if missing:
   ```bash
   sudo mkdir -p /var/log/aurelle-monitoring
   sudo chown $USER:$USER /var/log/aurelle-monitoring
   ```

### Issue: Script Errors

**Debug**:
```bash
# Run script manually to see errors
bash -x scripts/monitor-disk.sh

# Check for missing dependencies
which jq curl
```

---

## Best Practices

### 1. Regular Review

- Check Telegram alerts daily
- Review logs weekly
- Update thresholds based on patterns

### 2. Alert Fatigue Prevention

- Use appropriate cooldown periods
- Don't alert on expected behavior
- Prioritize critical vs warning alerts

### 3. Log Management

- Logs auto-cleanup after 30 days
- Monitor log file sizes
- Archive important logs

### 4. Security

- Protect Telegram bot token
- Use SSH tunnels for dashboards
- Enable authentication on monitoring endpoints
- Don't expose monitoring ports publicly

### 5. Testing

- Test alerts after setup
- Simulate failures periodically
- Verify recovery notifications work

### 6. Documentation

- Document threshold changes
- Keep runbooks for common issues
- Share alert meanings with team

### 7. Escalation

For critical alerts:
1. First notification: Telegram
2. No response in 15 min: SMS/Call
3. No response in 30 min: Escalate to senior

---

## Appendix

### Useful Commands

```bash
# View all monitoring logs
tail -f /var/log/aurelle-monitoring/*.log

# Test all monitors
for script in scripts/monitor-*.sh; do bash "$script"; done

# Check disk space
df -h

# Check memory
free -h

# Check CPU
top -bn1 | head -20

# Check PM2 processes
pm2 status
pm2 logs

# Check database connection
psql -h localhost -U aurelle_user -d aurelle_production -c "SELECT 1"

# Check SSL certificate manually
echo | openssl s_client -servername aurelle.uz -connect aurelle.uz:443 2>/dev/null | openssl x509 -noout -dates

# Send test alert
bash scripts/telegram-send.sh info "Test" "Manual test alert"
```

### Log File Locations

```
/var/log/aurelle-monitoring/disk.log
/var/log/aurelle-monitoring/memory.log
/var/log/aurelle-monitoring/cpu.log
/var/log/aurelle-monitoring/pm2.log
/var/log/aurelle-monitoring/database.log
/var/log/aurelle-monitoring/health.log
/var/log/aurelle-monitoring/ssl.log
```

### Monitoring Checklist

Daily:
- [ ] Check Telegram for new alerts
- [ ] Review critical alerts from last 24h

Weekly:
- [ ] Review warning alerts
- [ ] Check monitoring logs
- [ ] Verify all monitors are running
- [ ] Test alert system

Monthly:
- [ ] Review and adjust thresholds
- [ ] Check disk space trends
- [ ] Review SSL certificate expiration dates
- [ ] Update monitoring scripts if needed

---

**Last Updated**: January 10, 2026
**Version**: 1.0.0
**Maintainer**: DevOps Team
