# Server Hardening Guide for AURELLE

**Last Updated**: 2026-01-11
**Version**: 1.0
**Platform**: AURELLE Beauty Salon Booking Platform
**Server**: Ubuntu 22.04 LTS

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [SSH Hardening](#ssh-hardening)
4. [Firewall Configuration](#firewall-configuration)
5. [Fail2ban Protection](#fail2ban-protection)
6. [Automatic Security Updates](#automatic-security-updates)
7. [Service Cleanup](#service-cleanup)
8. [Audit Logging](#audit-logging)
9. [Security Scanning](#security-scanning)
10. [Security Best Practices](#security-best-practices)
11. [Maintenance and Monitoring](#maintenance-and-monitoring)
12. [Incident Response](#incident-response)
13. [Compliance](#compliance)
14. [Troubleshooting](#troubleshooting)
15. [Security Checklist](#security-checklist)

---

## Overview

### Purpose

This guide provides comprehensive server hardening procedures for the AURELLE Beauty Salon Booking Platform. Server hardening is the process of securing a server by reducing its attack surface, implementing security controls, and following security best practices.

### Goals

- **Protect against unauthorized access**: SSH hardening, firewall rules, Fail2ban
- **Reduce attack surface**: Disable unnecessary services, close unused ports
- **Enable security monitoring**: Audit logging, security scanning
- **Automate security maintenance**: Automatic updates, regular scans
- **Ensure compliance**: Follow industry security standards

### Security Layers

```
┌─────────────────────────────────────────────────┐
│  Layer 7: Security Monitoring & Audit Logging   │
├─────────────────────────────────────────────────┤
│  Layer 6: Regular Security Scanning (Lynis)     │
├─────────────────────────────────────────────────┤
│  Layer 5: Automatic Security Updates            │
├─────────────────────────────────────────────────┤
│  Layer 4: Intrusion Prevention (Fail2ban)       │
├─────────────────────────────────────────────────┤
│  Layer 3: Firewall (UFW)                        │
├─────────────────────────────────────────────────┤
│  Layer 2: SSH Hardening                         │
├─────────────────────────────────────────────────┤
│  Layer 1: Service Minimization                  │
└─────────────────────────────────────────────────┘
```

### Threat Model

**Protected Against**:
- Brute-force SSH attacks
- Unauthorized network access
- Known vulnerabilities (via automatic updates)
- Malware and rootkits
- Unauthorized system changes
- Privilege escalation
- Common web attacks

**Not Protected Against** (requires additional measures):
- Zero-day exploits
- Advanced persistent threats (APTs)
- Physical access attacks
- Social engineering
- DDoS attacks (requires upstream protection)

---

## Quick Start

### Complete Hardening (Recommended Order)

```bash
# 1. SSH Hardening (CRITICAL - do this first with caution)
sudo bash scripts/harden-ssh.sh

# 2. Firewall Configuration
sudo bash scripts/setup-firewall.sh

# 3. Fail2ban Protection
sudo bash scripts/setup-fail2ban.sh

# 4. Automatic Security Updates
sudo bash scripts/setup-auto-updates.sh

# 5. Service Cleanup
sudo bash scripts/cleanup-services.sh

# 6. Audit Logging
sudo bash scripts/setup-auditd.sh

# 7. Security Scan
sudo bash scripts/security-scan.sh
```

### Verification

```bash
# Check SSH configuration
sudo sshd -t
sudo grep "^Port\|^PermitRootLogin\|^PasswordAuthentication" /etc/ssh/sshd_config

# Check firewall
sudo ufw status verbose

# Check Fail2ban
sudo fail2ban-client status

# Check automatic updates
sudo systemctl status unattended-upgrades

# Check auditd
sudo auditctl -l | wc -l

# Run security scan
sudo bash scripts/security-scan.sh
```

---

## SSH Hardening

### Overview

SSH (Secure Shell) is the primary remote access method for Linux servers. Hardening SSH is critical because it's often the first target for attackers.

### Script

**File**: `scripts/harden-ssh.sh`

### What Gets Hardened

1. **Port Change**: 22 → 2222 (or custom)
2. **Root Login**: Disabled
3. **Password Authentication**: Disabled (SSH keys only)
4. **Strong Cryptography**: Modern ciphers and algorithms only
5. **Connection Timeout**: Auto-disconnect idle sessions
6. **User Restrictions**: Limit which users can SSH

### Step-by-Step Procedure

#### 1. Setup SSH Keys (BEFORE Running Script)

**On your local machine** (Windows/Mac/Linux):

```bash
# Generate SSH key pair (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# This creates:
# - Private key: ~/.ssh/id_ed25519
# - Public key: ~/.ssh/id_ed25519.pub
```

**Copy key to server**:

```bash
# Method 1: Using ssh-copy-id (easiest)
ssh-copy-id -i ~/.ssh/id_ed25519.pub your_username@your_server_ip

# Method 2: Manual copy
cat ~/.ssh/id_ed25519.pub
# Copy the output, then on the server:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Test key authentication**:

```bash
# Test SSH with key (should work without password)
ssh -i ~/.ssh/id_ed25519 your_username@your_server_ip

# If this works, you're ready to run the hardening script
```

#### 2. Run SSH Hardening Script

```bash
sudo bash scripts/harden-ssh.sh
```

**What the script does**:
1. Backs up current SSH configuration
2. Checks for SSH keys (warns if missing)
3. Displays proposed changes
4. Asks for confirmation
5. Applies hardening configuration
6. Tests new configuration (doesn't apply if invalid)
7. Prompts to restart SSH service

**⚠️ CRITICAL WARNING**:
- Keep your current SSH session open!
- Test new connection in a SEPARATE terminal
- DO NOT close original session until confirmed working
- If locked out, you'll need physical/console access

#### 3. Configuration Changes

**File**: `/etc/ssh/sshd_config`

```bash
# Port configuration
Port 2222                          # Changed from default 22

# Authentication
PermitRootLogin no                  # Root cannot login via SSH
PubkeyAuthentication yes            # SSH keys allowed
PasswordAuthentication no           # Passwords disabled
PermitEmptyPasswords no             # Empty passwords forbidden
ChallengeResponseAuthentication no  # Challenge-response disabled
UsePAM yes                          # PAM modules enabled

# Security settings
X11Forwarding no                    # X11 forwarding disabled
MaxAuthTries 3                      # 3 login attempts before disconnect
MaxSessions 10                      # Max 10 concurrent sessions
ClientAliveInterval 300             # Send keepalive every 5 min
ClientAliveCountMax 2               # Disconnect after 2 missed keepalives

# User restrictions
AllowUsers your_username            # Only specific users can SSH

# Logging
SyslogFacility AUTH
LogLevel VERBOSE                    # Detailed logging

# Protocol
Protocol 2                          # SSHv2 only (SSHv1 is insecure)

# Strong cryptography
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group-exchange-sha256
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
```

#### 4. Update SSH Client Configuration

After successful hardening, update your local SSH client config for convenience:

**~/.ssh/config** (on your local machine):

```
Host aurelle
    HostName YOUR_SERVER_IP
    Port 2222
    User your_username
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Now you can connect with just: `ssh aurelle`

#### 5. Testing

```bash
# Test SSH configuration validity
sudo sshd -t

# Test connection (from another terminal)
ssh -p 2222 your_username@YOUR_SERVER_IP

# Check SSH logs
sudo tail -f /var/log/auth.log | grep sshd

# View current SSH sessions
who
w

# View SSH connection history
last | grep pts
```

### Security Benefits

- **Port obfuscation**: Port 2222 avoids mass automated scans on port 22
- **Key-only auth**: Passwords can't be brute-forced
- **Root protection**: Even if credentials leak, root can't login
- **Strong crypto**: Protects against cryptographic attacks
- **Session timeouts**: Disconnects abandoned sessions
- **User restrictions**: Limits attack surface

### Rollback Procedure

If locked out or need to revert:

```bash
# Via console/physical access
sudo cp /etc/ssh/sshd_config.backup.YYYYMMDD-HHMMSS /etc/ssh/sshd_config
sudo systemctl restart sshd

# Or restore specific settings
sudo sed -i 's/^Port 2222/Port 22/' /etc/ssh/sshd_config
sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## Firewall Configuration

### Overview

A firewall controls network traffic in/out of the server. UFW (Uncomplicated Firewall) provides a simple interface to iptables.

### Script

**File**: `scripts/setup-firewall.sh`

### Default Policy

```
Incoming: DENY  (block all incoming traffic by default)
Outgoing: ALLOW (allow all outgoing traffic)
Routed: DENY    (block forwarded traffic)
```

### Allowed Services

1. **SSH** (port 2222): Remote access
2. **HTTP** (port 80): Web traffic, Let's Encrypt challenges
3. **HTTPS** (port 443): Encrypted web traffic

### Step-by-Step Procedure

#### 1. Pre-Hardening Checks

```bash
# Check current firewall status
sudo ufw status verbose

# Check SSH port (CRITICAL - must allow correct port)
sudo grep "^Port" /etc/ssh/sshd_config

# Check listening services
sudo ss -tulpn | grep LISTEN

# Check if any services need special ports
sudo netstat -tulpn | grep LISTEN
```

#### 2. Run Firewall Setup Script

```bash
sudo bash scripts/setup-firewall.sh
```

**What the script does**:
1. Installs UFW (if needed)
2. Checks current firewall status
3. Detects SSH port automatically
4. Confirms SSH port with user (CRITICAL)
5. Resets firewall rules
6. Sets default policies (deny incoming, allow outgoing)
7. Adds rules for SSH, HTTP, HTTPS
8. Offers optional rules (PostgreSQL localhost, ICMP)
9. Enables firewall
10. Displays final status

**⚠️ CRITICAL WARNING**:
- Verify SSH port before enabling!
- Keep current session open
- Test SSH in new terminal after enabling
- If locked out, use console access to disable: `sudo ufw disable`

#### 3. Firewall Rules

```bash
# View all rules
sudo ufw status numbered

# Output:
     To                         Action      From
     --                         ------      ----
[ 1] 2222/tcp                   ALLOW IN    Anywhere                  # SSH
[ 2] 80/tcp                     ALLOW IN    Anywhere                  # HTTP
[ 3] 443/tcp                    ALLOW IN    Anywhere                  # HTTPS
[ 4] Anywhere                   ALLOW IN    Anywhere on lo            # Loopback
```

#### 4. Testing

```bash
# Test SSH (must work before proceeding)
ssh -p 2222 your_username@YOUR_SERVER_IP

# Test HTTP (if web server running)
curl http://YOUR_SERVER_IP

# Test HTTPS (if SSL configured)
curl https://YOUR_SERVER_IP

# Check firewall logs
sudo tail -f /var/log/ufw.log

# Test blocked port (should timeout)
nc -zv YOUR_SERVER_IP 3306
```

### Advanced Configuration

#### Allow Specific IP Access

```bash
# Allow PostgreSQL from specific IP only
sudo ufw allow from 192.168.1.100 to any port 5432 comment 'PostgreSQL from office'

# Allow SSH from specific subnet only
sudo ufw allow from 192.168.1.0/24 to any port 2222 comment 'SSH from local network'

# Delete a rule
sudo ufw status numbered
sudo ufw delete [number]
```

#### Rate Limiting

```bash
# Limit SSH connection attempts (30 connections per 30 seconds)
sudo ufw limit 2222/tcp comment 'SSH rate limit'

# This helps prevent brute-force, but Fail2ban is better
```

#### Application Profiles

```bash
# View available application profiles
sudo ufw app list

# Allow an application
sudo ufw allow 'Nginx Full'

# View app profile details
sudo ufw app info 'Nginx Full'
```

### Firewall Management

```bash
# Enable firewall
sudo ufw enable

# Disable firewall (temporary)
sudo ufw disable

# Reload firewall (apply changes)
sudo ufw reload

# Reset firewall (delete all rules)
sudo ufw reset

# Check status
sudo ufw status verbose

# View numbered rules
sudo ufw status numbered

# Delete specific rule
sudo ufw delete [number]

# Insert rule at specific position
sudo ufw insert 1 allow from 192.168.1.100

# Enable logging
sudo ufw logging on
sudo ufw logging medium  # off, low, medium, high, full

# View logs
sudo tail -f /var/log/ufw.log
```

### Rollback Procedure

```bash
# Disable firewall immediately
sudo ufw disable

# Reset all rules
sudo ufw --force reset

# Reconfigure
sudo bash scripts/setup-firewall.sh
```

---

## Fail2ban Protection

### Overview

Fail2ban monitors log files for failed authentication attempts and bans IP addresses that show malicious behavior (brute-force attacks).

### Script

**File**: `scripts/setup-fail2ban.sh`

### Protected Services

1. **SSH (sshd)**: Blocks after 3 failed attempts, ban 2 hours
2. **SSH DDOS**: Blocks rapid connection attempts
3. **Nginx HTTP Auth**: Blocks failed HTTP authentication
4. **Nginx No-Script**: Blocks script vulnerability scans
5. **Nginx Bad Bots**: Blocks known malicious bots
6. **Nginx No-Proxy**: Blocks proxy abuse attempts
7. **Nginx Rate Limit**: Blocks excessive requests
8. **Recidive**: Long-term ban for repeat offenders (7 days)

### Step-by-Step Procedure

#### 1. Run Fail2ban Setup Script

```bash
sudo bash scripts/setup-fail2ban.sh
```

**What the script does**:
1. Installs Fail2ban (if needed)
2. Detects SSH port automatically
3. Backs up existing configuration
4. Creates jail.local configuration
5. Configures jails for SSH and Nginx
6. Sets up Telegram notifications (if available)
7. Tests configuration
8. Enables and starts service

#### 2. Configuration

**File**: `/etc/fail2ban/jail.local`

```ini
[DEFAULT]
# Ban settings
bantime = 3600        # Ban for 1 hour
findtime = 600        # Look back 10 minutes for failures
maxretry = 5          # Ban after 5 failures

# Ban action
banaction = ufw       # Use UFW to ban IPs
ignoreip = 127.0.0.1/8 ::1  # Never ban localhost

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3          # Stricter for SSH (3 attempts)
bantime = 7200        # Ban for 2 hours

[sshd-ddos]
enabled = true
port = 2222
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 10
bantime = 3600

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[recidive]
# Ban repeat offenders for 7 days
enabled = true
filter = recidive
logpath = /var/log/fail2ban.log
bantime = 604800     # 7 days
findtime = 86400     # Check last 24h
maxretry = 3
```

#### 3. Testing

```bash
# Check Fail2ban status
sudo fail2ban-client status

# Output shows active jails:
Status
|- Number of jail:      8
`- Jail list:   nginx-badbots, nginx-http-auth, nginx-limit-req, nginx-noproxy, nginx-noscript, recidive, sshd, sshd-ddos

# Check specific jail
sudo fail2ban-client status sshd

# View banned IPs
sudo fail2ban-client banned

# Test SSH jail (from another machine)
# Try 3+ failed SSH logins:
ssh wrong_user@YOUR_SERVER_IP -p 2222
# (repeat 3 times with wrong password)

# Check if IP was banned
sudo fail2ban-client status sshd | grep "Banned IP"
```

#### 4. Manual IP Management

```bash
# Ban an IP manually
sudo fail2ban-client set sshd banip 192.168.1.100

# Unban an IP
sudo fail2ban-client set sshd unbanip 192.168.1.100

# Unban all IPs in a jail
sudo fail2ban-client unban --all

# View current bans across all jails
sudo fail2ban-client banned
```

### Telegram Notifications

If Telegram integration is configured (P2 Task #45), Fail2ban will send notifications:

**Ban Notification**:
```
⚠️ IP Banned by Fail2ban

IP: 203.0.113.45
Jail: sshd
Failures: 5
Time: 2026-01-11 14:32:15
```

**Unban Notification**:
```
ℹ️ IP Unbanned by Fail2ban

IP: 203.0.113.45
Jail: sshd
Time: 2026-01-11 16:32:15
```

### Monitoring

```bash
# View Fail2ban log
sudo tail -f /var/log/fail2ban.log

# View recent bans
sudo grep "Ban" /var/log/fail2ban.log | tail -20

# View ban statistics
sudo fail2ban-client status sshd

# Generate ban report
sudo awk '($(NF-1) = /Ban/){print $NF}' /var/log/fail2ban.log | sort | uniq -c | sort -n

# Check which IPs are currently banned
sudo iptables -L fail2ban-sshd -v -n
# or with UFW:
sudo ufw status numbered | grep "DENY"
```

### Advanced Configuration

#### Custom Filter

Create `/etc/fail2ban/filter.d/custom-app.conf`:

```ini
[Definition]
failregex = ^<HOST>.*"POST /api/login.*" 401
ignoreregex =
```

Add to jail.local:

```ini
[custom-app]
enabled = true
port = http,https
filter = custom-app
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
```

#### Whitelist IPs

Edit `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1 192.168.1.0/24 YOUR_OFFICE_IP
```

#### Email Notifications

```ini
[DEFAULT]
destemail = admin@aurelle.uz
sendername = Fail2ban
mta = sendmail
action = %(action_mwl)s
```

### Rollback Procedure

```bash
# Stop Fail2ban
sudo systemctl stop fail2ban

# Unban all IPs
sudo fail2ban-client unban --all

# Restore backup configuration
sudo cp /etc/fail2ban/jail.local.backup.YYYYMMDD-HHMMSS /etc/fail2ban/jail.local

# Restart
sudo systemctl restart fail2ban
```

---

## Automatic Security Updates

### Overview

Unattended-upgrades automatically installs security updates to keep the system protected against known vulnerabilities.

### Script

**File**: `scripts/setup-auto-updates.sh`

### What Gets Updated

- Security updates (high priority)
- Stable updates (normal priority)
- Kernel updates
- System packages

### Update Schedule

- **Check for updates**: Daily
- **Download updates**: Automatically
- **Install updates**: Automatically
- **Clean old packages**: Weekly

### Step-by-Step Procedure

#### 1. Run Auto-Updates Setup Script

```bash
sudo bash scripts/setup-auto-updates.sh
```

**What the script does**:
1. Installs unattended-upgrades (if needed)
2. Backs up existing configuration
3. Creates auto-update configuration
4. Configures reboot policy (user choice)
5. Sets up Telegram notifications
6. Tests configuration
7. Enables service
8. Checks for pending updates

#### 2. Configuration

**File**: `/etc/apt/apt.conf.d/50unattended-upgrades`

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}:${distro_codename}-updates";
};

// Exclude specific packages
Unattended-Upgrade::Package-Blacklist {
    // "nginx";
    // "postgresql";
};

// Automatic reboot
Unattended-Upgrade::Automatic-Reboot "false";  // or "true"
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";

// Clean up
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Logging
Unattended-Upgrade::SyslogEnable "true";
```

**File**: `/etc/apt/apt.conf.d/20auto-upgrades`

```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
```

#### 3. Reboot Policy

**Option 1: No Automatic Reboot** (Default - Safer)
- System installs updates but doesn't reboot
- Admin must manually reboot when required
- Check: `ls /var/run/reboot-required`

**Option 2: Automatic Reboot** (Convenient - Higher Risk)
- System automatically reboots if updates require it
- Reboot at specified time (e.g., 3 AM)
- Telegram notification 5 minutes before reboot

#### 4. Testing

```bash
# Check service status
sudo systemctl status unattended-upgrades

# View configuration
sudo cat /etc/apt/apt.conf.d/50unattended-upgrades

# Test dry-run
sudo unattended-upgrade --dry-run --debug

# View recent updates
sudo tail -50 /var/log/unattended-upgrades/unattended-upgrades.log

# Check if reboot is required
ls /var/run/reboot-required 2>/dev/null && cat /var/run/reboot-required.pkgs

# View pending updates
sudo apt list --upgradable
```

### Monitoring

```bash
# View update logs
sudo tail -f /var/log/unattended-upgrades/unattended-upgrades.log

# View DPkg log (what was installed)
sudo tail -f /var/log/unattended-upgrades/unattended-upgrades-dpkg.log

# View apt history
sudo cat /var/log/apt/history.log

# Check last update time
sudo ls -lt /var/log/unattended-upgrades/ | head

# Generate update report
sudo grep "Upgraded:" /var/log/unattended-upgrades/unattended-upgrades.log | tail -20
```

### Package Exclusions

To exclude specific packages from automatic updates:

Edit `/etc/apt/apt.conf.d/50unattended-upgrades`:

```
Unattended-Upgrade::Package-Blacklist {
    "nginx";           // Don't auto-update nginx
    "postgresql-*";    // Don't auto-update PostgreSQL
    "nodejs";          // Don't auto-update Node.js
};
```

**When to exclude**:
- Custom-configured packages (need testing before update)
- Packages with known breaking changes
- Packages requiring manual migration

**Note**: Security updates for excluded packages must be applied manually!

### Manual Updates

```bash
# Run updates manually (dry-run first)
sudo unattended-upgrade --dry-run --debug

# Run updates manually (actual update)
sudo unattended-upgrade --debug

# Standard update (with confirmation)
sudo apt update
sudo apt upgrade

# Full system upgrade
sudo apt full-upgrade

# Clean up
sudo apt autoremove
sudo apt autoclean
```

### Rollback Procedure

```bash
# Disable automatic updates
sudo systemctl stop unattended-upgrades
sudo systemctl disable unattended-upgrades

# Revert configuration
sudo cp /etc/apt/apt.conf.d/50unattended-upgrades.backup.* /etc/apt/apt.conf.d/50unattended-upgrades
sudo cp /etc/apt/apt.conf.d/20auto-upgrades.backup.* /etc/apt/apt.conf.d/20auto-upgrades

# Re-enable (if needed)
sudo systemctl enable unattended-upgrades
sudo systemctl start unattended-upgrades
```

---

## Service Cleanup

### Overview

Reducing the number of running services decreases the attack surface and improves performance.

### Script

**File**: `scripts/cleanup-services.sh`

### Commonly Unnecessary Services

- **bluetooth**: Bluetooth support (not needed on server)
- **cups**: Printing service (not needed on server)
- **avahi-daemon**: Network service discovery (not needed)
- **ModemManager**: Modem management (not needed)
- **whoopsie**: Ubuntu error reporting
- **apport**: Crash reporting
- **rsync**: File sync daemon (CLI tool is fine)
- **rpcbind**: RPC portmapper (only for NFS)
- **nfs-common**: NFS client (only if mounting NFS)
- **snapd**: Snap packages (if not using snaps)

### Critical Services (Never Disable)

- ssh/sshd
- systemd-* services
- cron
- rsyslog/systemd-journald
- postgresql
- nginx
- fail2ban
- ufw
- unattended-upgrades

### Step-by-Step Procedure

#### 1. Review Running Services

```bash
# List all enabled services
systemctl list-unit-files --type=service --state=enabled

# List running services
systemctl list-units --type=service --state=running

# Check listening network services
sudo ss -tulpn | grep LISTEN
```

#### 2. Run Service Cleanup Script

```bash
sudo bash scripts/cleanup-services.sh
```

**What the script does**:
1. Scans for potentially unnecessary services
2. Displays found services with descriptions
3. Asks for confirmation (per-service)
4. Stops and disables selected services
5. Masks services (prevents restart)
6. Offers to remove packages
7. Shows remaining listening ports

#### 3. Manual Service Management

```bash
# Check service status
sudo systemctl status bluetooth

# Stop service
sudo systemctl stop bluetooth

# Disable service (prevent start on boot)
sudo systemctl disable bluetooth

# Mask service (prevent any start)
sudo systemctl mask bluetooth

# Re-enable service (if needed)
sudo systemctl unmask bluetooth
sudo systemctl enable bluetooth
sudo systemctl start bluetooth

# View service dependencies
systemctl list-dependencies bluetooth
```

#### 4. Package Removal

```bash
# List installed packages
dpkg -l | grep '^ii' | wc -l

# Remove package
sudo apt-get purge bluetooth bluez

# Remove with dependencies
sudo apt-get autoremove --purge bluetooth

# Check for orphaned packages
sudo deborphan

# Remove orphaned packages
sudo apt-get autoremove
```

### Testing After Cleanup

```bash
# Verify critical services still running
sudo systemctl status sshd
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status fail2ban
sudo systemctl status ufw

# Check application still works
curl http://localhost:3000/health

# Check listening ports
sudo ss -tulpn | grep LISTEN

# Review system logs
sudo journalctl -xe | grep -i error
```

### Rollback Procedure

```bash
# Re-enable a service
sudo systemctl unmask SERVICE_NAME
sudo systemctl enable SERVICE_NAME
sudo systemctl start SERVICE_NAME

# Reinstall a package
sudo apt-get install PACKAGE_NAME

# Example: restore bluetooth
sudo apt-get install bluez bluetooth
sudo systemctl unmask bluetooth
sudo systemctl enable bluetooth
sudo systemctl start bluetooth
```

---

## Audit Logging

### Overview

Auditd provides detailed logging of system events for security monitoring, compliance, and forensics.

### Script

**File**: `scripts/setup-auditd.sh`

### What Gets Monitored

1. **Authentication & Authorization**
   - User/group modifications
   - Sudo usage
   - Authentication logs

2. **System Configuration**
   - SSH configuration changes
   - PAM configuration
   - Network configuration

3. **Critical System Files**
   - Kernel modules
   - System binaries

4. **File Operations**
   - File deletion/renaming
   - Permission changes
   - Ownership changes

5. **Application Files**
   - AURELLE app directory
   - Nginx configuration
   - PostgreSQL configuration
   - SSL certificates
   - .env files

6. **Security Events**
   - Cron job modifications
   - Firewall changes
   - Suspicious commands (wget, curl, nc)

### Step-by-Step Procedure

#### 1. Run Auditd Setup Script

```bash
sudo bash scripts/setup-auditd.sh
```

**What the script does**:
1. Installs auditd (if needed)
2. Backs up existing configuration
3. Creates audit rules
4. Loads audit rules
5. Starts and enables service
6. Configures log rotation (30 days)

#### 2. Audit Rules

**File**: `/etc/audit/rules.d/aurelle-audit.rules`

Example rules:

```
# Monitor user/group changes
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity

# Monitor sudo usage
-w /etc/sudoers -p wa -k sudoers

# Monitor SSH configuration
-w /etc/ssh/sshd_config -p wa -k sshd_config

# Monitor AURELLE application
-w /var/www/aurelle/ -p wa -k aurelle_app

# Monitor file deletion
-a always,exit -F arch=b64 -S unlink,unlinkat,rename,renameat -F auid>=1000 -k file_deletion

# Monitor file permission changes
-a always,exit -F arch=b64 -S chmod,fchmod,fchmodat -F auid>=1000 -k file_permission
```

**Rule format**:
- `-w`: Watch file/directory
- `-p`: Permissions (r=read, w=write, x=execute, a=attribute)
- `-k`: Key (tag for searching)
- `-a`: Add rule
- `-S`: System call

#### 3. Searching Audit Logs

```bash
# Search by key (tag)
sudo ausearch -k sshd_config
sudo ausearch -k file_deletion
sudo ausearch -k aurelle_app

# Search by user
sudo ausearch -ua YOUR_USERNAME

# Search by file
sudo ausearch -f /etc/passwd

# Search for failed events
sudo ausearch --failed

# Search in time range
sudo ausearch --start today --end now
sudo ausearch --start 08:00 --end 17:00
sudo ausearch --start 01/11/2026 00:00:00 --end 01/11/2026 23:59:59

# Interpret audit logs (convert IDs to names)
sudo ausearch -k file_deletion -i

# View recent events
sudo ausearch --start recent -i
```

#### 4. Generating Reports

```bash
# General audit report
sudo aureport

# Authentication report
sudo aureport --auth

# File access report
sudo aureport --file

# Failed events report
sudo aureport --failed

# Login report
sudo aureport --login

# User activity report
sudo aureport --user

# Summary report
sudo aureport --summary

# Time-based report
sudo aureport --start today --end now
```

#### 5. Real-Time Monitoring

```bash
# Watch audit log in real-time
sudo tail -f /var/log/audit/audit.log

# Watch with filtering
sudo tail -f /var/log/audit/audit.log | grep sshd

# Use ausearch for live monitoring
sudo ausearch --start now -i | tail -f
```

### Example Investigations

#### Who modified /etc/passwd?

```bash
sudo ausearch -f /etc/passwd -i

# Output shows:
type=PATH msg=audit(01/11/2026 14:32:15.123:456) : item=0 name=/etc/passwd inode=12345
type=CWD msg=audit(01/11/2026 14:32:15.123:456) : cwd=/home/admin
type=SYSCALL msg=audit(01/11/2026 14:32:15.123:456) : arch=x86_64 syscall=open success=yes exit=3 a0=7fff12345678 a1=441 a2=1b6 a3=7fff87654321 items=1 ppid=1234 pid=5678 auid=john uid=root gid=root euid=root suid=root fsuid=root egid=root sgid=root fsgid=root tty=pts1 ses=12 comm=vi exe=/usr/bin/vi key=identity
```

Analysis:
- **Who**: User "john" (auid=john)
- **When**: 01/11/2026 14:32:15
- **What**: Modified /etc/passwd
- **How**: Using vi editor
- **Where**: From /home/admin directory
- **Terminal**: pts1 (SSH session)

#### Show all file deletions today

```bash
sudo ausearch -k file_deletion --start today -i

# Generate summary
sudo ausearch -k file_deletion --start today -i | grep "name=" | awk -F'name=' '{print $2}' | cut -d' ' -f1 | sort | uniq
```

#### Find suspicious activity

```bash
# Suspicious commands (wget, curl, nc)
sudo ausearch -k suspicious -i

# Failed sudo attempts
sudo ausearch -k privileged --failed -i

# After-hours activity
sudo ausearch --start 18:00 --end 08:00 -i
```

### Advanced Configuration

#### Custom Audit Rules

Create custom rules for specific needs:

```bash
# Monitor specific user
-w /home/username/ -p wa -k user_activity

# Monitor specific port access
-a always,exit -F arch=b64 -S connect -F a2=80 -k http_connections

# Monitor specific process
-a always,exit -F arch=b64 -S execve -F exe=/usr/bin/curl -k curl_usage

# Monitor database access
-w /var/lib/postgresql/ -p rwa -k database_access
```

Add to `/etc/audit/rules.d/custom-audit.rules` and reload:

```bash
sudo augenrules --load
# or
sudo service auditd restart
```

### Performance Considerations

Audit logging can impact performance with many rules. Monitor:

```bash
# Check audit buffer overflow
sudo auditctl -s | grep lost

# If lost events > 0, increase buffer:
# Edit /etc/audit/rules.d/aurelle-audit.rules
-b 16384  # Increase from 8192

# Reload rules
sudo augenrules --load
```

### Rollback Procedure

```bash
# Stop auditd
sudo service auditd stop

# Disable auditd
sudo systemctl disable auditd

# Remove rules
sudo rm /etc/audit/rules.d/aurelle-audit.rules

# Restore backup
sudo cp /etc/audit/backup-YYYYMMDD-HHMMSS/audit.rules /etc/audit/rules.d/

# Restart
sudo service auditd start
```

---

## Security Scanning

### Overview

Lynis performs comprehensive security audits to identify vulnerabilities, misconfigurations, and areas for improvement.

### Script

**File**: `scripts/security-scan.sh`

### What Lynis Checks

- System information
- Boot and services
- Kernel
- Memory and processes
- Users, groups, and authentication
- Shells
- File systems
- Storage
- Name services
- Ports and packages
- Networking
- Printers and spoolers
- Software: email and messaging
- Software: firewalls
- Software: webserver
- SSH support
- SNMP support
- Databases
- LDAP services
- Software: PHP
- Software: Squid
- Software: nginx
- Logging and files
- Insecure services
- Banners and identification
- Scheduled tasks
- Accounting
- Time and synchronization
- Cryptography
- Virtualization
- Security frameworks
- Software: file integrity
- Software: malware
- Home directories

### Step-by-Step Procedure

#### 1. Run Security Scan

```bash
sudo bash scripts/security-scan.sh
```

**Options**:
1. **Quick scan**: Basic checks (faster)
2. **Full scan**: Comprehensive audit (recommended)
3. **Full scan with auto-fixes**: Applies automatic fixes where possible

**What the script does**:
1. Installs Lynis (if needed)
2. Updates Lynis database
3. Runs security scan
4. Analyzes results
5. Displays hardening index
6. Shows warnings and suggestions
7. Applies automated fixes (if option 3)
8. Generates summary report
9. Sends Telegram notification
10. Archives old scans (30 days retention)

#### 2. Understanding Results

**Hardening Index**: 0-100 score indicating security posture

- **80-100**: Excellent security
- **70-79**: Good security
- **60-69**: Moderate security
- **0-59**: Needs improvement

**Warnings**: Issues that should be addressed
**Suggestions**: Recommendations for improvement

#### 3. Review Reports

```bash
# View summary
cat /var/log/aurelle-security/summary-YYYYMMDD-HHMMSS.txt

# View full log
less /var/log/aurelle-security/lynis-scan-YYYYMMDD-HHMMSS.log

# View Lynis report (detailed)
less /var/log/lynis-report.dat

# Search for specific findings
grep "warning" /var/log/lynis-report.dat
grep "suggestion" /var/log/lynis-report.dat
```

#### 4. Common Findings and Fixes

**Finding**: "No password set for single user mode"
```bash
# Fix: Set root password
sudo passwd root
```

**Finding**: "Kernel has no restriction on dmesg usage"
```bash
# Fix: Restrict dmesg
echo "kernel.dmesg_restrict = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Finding**: "No legal banner found"
```bash
# Fix: Create login banner
sudo nano /etc/issue.net
# Add:
Authorized access only. All activity may be monitored and reported.

# Update SSH config
sudo nano /etc/ssh/sshd_config
# Add:
Banner /etc/issue.net

sudo systemctl restart sshd
```

**Finding**: "iptables module not loaded"
```bash
# Fix: Already handled by UFW firewall
# No action needed if using UFW
```

**Finding**: "No anti-virus scanner found"
```bash
# Optional: Install ClamAV
sudo apt-get install clamav clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon

# Scan system
sudo clamscan -r /var/www/aurelle/
```

### Manual Lynis Usage

```bash
# Full system audit
sudo lynis audit system

# Quick scan
sudo lynis audit system --quick

# Specific tests
sudo lynis audit system --tests BOOT-5122,AUTH-9208

# View available tests
sudo lynis show tests

# View groups
sudo lynis show groups

# Scan specific group
sudo lynis audit system --tests-from-group authentication

# Check for updates
sudo lynis update info

# Show Lynis version
sudo lynis show version

# Generate report
sudo lynis audit system --report-file /tmp/lynis-report.txt
```

### Scheduling Regular Scans

```bash
# Add to cron (monthly scan on 1st at 4 AM)
sudo crontab -e

# Add line:
0 4 1 * * /var/www/aurelle/scripts/security-scan.sh >> /var/log/aurelle-security/cron.log 2>&1
```

### Interpreting Common Warnings

| Warning | Severity | Action |
|---------|----------|--------|
| Kernel not up-to-date | High | Update kernel: `sudo apt upgrade linux-image-generic` |
| Weak SSH ciphers | High | Run SSH hardening script |
| No firewall active | Critical | Run firewall setup script |
| Outdated packages | Medium | Enable auto-updates |
| No intrusion detection | Medium | Install Fail2ban (already done) |
| Weak file permissions | Medium | Fix with `chmod` |
| No password aging | Low | Configure in `/etc/login.defs` |
| No banner | Low | Create banner files |

### Rollback Procedure

No rollback needed - Lynis is read-only (doesn't modify system).

To remove Lynis:

```bash
sudo apt-get remove lynis
sudo rm -rf /var/log/aurelle-security/
```

---

## Security Best Practices

### Principle of Least Privilege

Grant minimum necessary permissions:

```bash
# User permissions
- Regular users: no sudo access
- Admin users: sudo access only when needed
- Application user: limited permissions

# File permissions
- 644 for regular files (rw-r--r--)
- 600 for sensitive files (rw-------)
- 755 for directories (rwxr-xr-x)
- 700 for sensitive directories (rwx------)

# Database permissions
- App user: CRUD on app tables only
- No SUPERUSER, CREATEDB, CREATEROLE
```

### Defense in Depth

Multiple layers of security:

```
1. Network: Firewall (UFW)
2. Access: SSH hardening + keys only
3. Intrusion: Fail2ban
4. Updates: Automatic security updates
5. Monitoring: Audit logs
6. Scanning: Regular Lynis scans
7. Application: HTTPS, CSP headers, rate limiting
8. Data: Database encryption, backup encryption
```

### Secure Defaults

Never rely on default settings:

- ❌ Default SSH port (22)
- ❌ Default passwords
- ❌ Root login enabled
- ❌ Password authentication
- ❌ No firewall
- ❌ Weak ciphers
- ❌ No monitoring

### Regular Security Maintenance

**Daily**:
- Review Fail2ban bans
- Check for security alerts (Telegram)

**Weekly**:
- Review audit logs for anomalies
- Check system logs (`sudo journalctl -p err -since "1 week ago"`)
- Verify backups working

**Monthly**:
- Run Lynis security scan
- Review and update firewall rules
- Check for outdated packages
- Review user accounts (remove unused)
- Check for unauthorized cron jobs
- Review SSL certificate expiration

**Quarterly**:
- Full security audit
- Penetration testing
- Review and update security policies
- Disaster recovery drill
- Update documentation

### Password Policy

```bash
# Edit /etc/login.defs
PASS_MAX_DAYS   90      # Max password age
PASS_MIN_DAYS   1       # Min days between changes
PASS_MIN_LEN    12      # Min password length
PASS_WARN_AGE   7       # Warning before expiration

# Enforce strong passwords
sudo apt-get install libpam-pwquality

# Edit /etc/security/pwquality.conf
minlen = 12
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
```

### File Integrity Monitoring

```bash
# Install AIDE (Advanced Intrusion Detection Environment)
sudo apt-get install aide

# Initialize database
sudo aideinit

# Copy database
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Run check
sudo aide --check

# Add to cron (daily at 5 AM)
0 5 * * * /usr/bin/aide --check | mail -s "AIDE Report" admin@aurelle.uz
```

### Secure Application Deployment

```bash
# Use non-root user for application
sudo adduser --system --group --no-create-home aurelle-app

# Set ownership
sudo chown -R aurelle-app:aurelle-app /var/www/aurelle/

# Set permissions
find /var/www/aurelle -type d -exec chmod 755 {} \;
find /var/www/aurelle -type f -exec chmod 644 {} \;
chmod 600 /var/www/aurelle/.env

# Run app as non-root
pm2 start npm --name aurelle --user aurelle-app -- start
```

### Secrets Management

```bash
# Never commit secrets to git
echo ".env" >> .gitignore

# Use environment variables
DATABASE_URL=postgresql://user:pass@localhost/db

# Rotate secrets regularly
- Database passwords: every 90 days
- API keys: every 180 days
- SSL certificates: auto-renewed by Let's Encrypt

# Store backup encryption keys offline
```

### Network Security

```bash
# Disable IPv6 if not used
sudo nano /etc/sysctl.conf
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
sudo sysctl -p

# Disable IP forwarding
net.ipv4.ip_forward = 0

# Enable SYN cookies (DDoS protection)
net.ipv4.tcp_syncookies = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0

# Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
```

---

## Maintenance and Monitoring

### Daily Checks

```bash
#!/bin/bash
# Daily security check script

echo "=== Daily Security Check ==="
echo "Date: $(date)"
echo ""

# Check failed login attempts
echo "Failed SSH logins (last 24h):"
sudo grep "Failed password" /var/log/auth.log | grep $(date +%b\ %d) | wc -l

# Check Fail2ban bans
echo "Current Fail2ban bans:"
sudo fail2ban-client banned | wc -l

# Check disk space
echo "Disk usage:"
df -h / | tail -1 | awk '{print $5}'

# Check system load
echo "System load:"
uptime | awk -F'load average:' '{print $2}'

# Check for required reboots
if [ -f /var/run/reboot-required ]; then
    echo "Reboot required!"
    cat /var/run/reboot-required.pkgs
fi

# Check audit log size
echo "Audit log size:"
du -sh /var/log/audit/audit.log

echo "=== Check Complete ==="
```

### Weekly Checks

```bash
# Review logs
sudo journalctl -p err -since "1 week ago"

# Check for rootkits
sudo apt-get install rkhunter
sudo rkhunter --check --skip-keypress

# Check for unauthorized SUID files
sudo find / -perm -4000 -type f 2>/dev/null

# Review user accounts
sudo awk -F: '$3 >= 1000 {print $1}' /etc/passwd

# Check for unauthorized cron jobs
sudo crontab -l
sudo ls -la /etc/cron.*

# Review listening services
sudo ss -tulpn | grep LISTEN

# Check SSL certificate expiration
echo | openssl s_client -servername aurelle.uz -connect aurelle.uz:443 2>/dev/null | openssl x509 -noout -dates
```

### Monthly Checks

```bash
# Run full security scan
sudo bash scripts/security-scan.sh

# Review all logs
sudo ls -lh /var/log/

# Check log rotation
sudo logrotate -d /etc/logrotate.conf

# Review backup integrity
sudo bash /var/www/aurelle/scripts/restore-test.sh

# Update all documentation
# Update security policies
```

### Monitoring Tools

#### System Monitoring Dashboard

```bash
# Install htop
sudo apt-get install htop

# Install glances (better monitoring)
sudo apt-get install glances

# Run glances
glances
```

#### Log Aggregation

```bash
# Install lnav (log navigator)
sudo apt-get install lnav

# View all logs
sudo lnav /var/log/
```

#### Security Dashboards

- **Fail2ban Status**: `sudo fail2ban-client status`
- **UFW Status**: `sudo ufw status verbose`
- **Audit Summary**: `sudo aureport --summary`
- **System Hardening**: Run Lynis scan

---

## Incident Response

### Incident Response Plan

#### Phase 1: Detection

**Indicators of compromise**:
- Unusual failed login attempts
- Unexpected network connections
- New unknown processes
- Suspicious file modifications
- Performance degradation
- Unauthorized user accounts
- Modified configuration files

**Detection methods**:
- Fail2ban notifications
- Audit log alerts
- System monitoring
- User reports

#### Phase 2: Containment

**Immediate actions**:

```bash
# 1. Isolate affected system
sudo ufw deny from SUSPICIOUS_IP
sudo ufw default deny incoming

# 2. Block all non-essential access
sudo fail2ban-client set sshd banip SUSPICIOUS_IP

# 3. Kill suspicious processes
sudo ps aux | grep SUSPICIOUS_PROCESS
sudo kill -9 PID

# 4. Disconnect from network (if severe)
sudo ip link set eth0 down
```

#### Phase 3: Investigation

```bash
# 1. Preserve evidence
sudo tar -czf /tmp/evidence-$(date +%s).tar.gz /var/log/
sudo cp -r /var/www/aurelle /tmp/app-backup-$(date +%s)

# 2. Review audit logs
sudo ausearch --start boot -i > /tmp/audit-investigation-$(date +%s).txt

# 3. Check for unauthorized changes
sudo aide --check > /tmp/aide-check-$(date +%s).txt

# 4. Review authentication logs
sudo grep "Accepted\|Failed" /var/log/auth.log > /tmp/auth-investigation-$(date +%s).txt

# 5. Check for backdoors
sudo find / -name "*.php" -mtime -7 -type f 2>/dev/null
sudo find / -perm -4000 -type f 2>/dev/null

# 6. Check network connections
sudo netstat -anp > /tmp/network-$(date +%s).txt
sudo ss -anp > /tmp/sockets-$(date +%s).txt

# 7. Check running processes
sudo ps auxf > /tmp/processes-$(date +%s).txt

# 8. Check for rootkits
sudo rkhunter --check --report-warnings-only > /tmp/rkhunter-$(date +%s).txt
```

#### Phase 4: Eradication

```bash
# 1. Remove malware/backdoors
sudo rm /path/to/malicious/file

# 2. Reset compromised passwords
sudo passwd USERNAME

# 3. Revoke compromised SSH keys
sudo nano /home/USERNAME/.ssh/authorized_keys

# 4. Reinstall compromised packages
sudo apt-get install --reinstall PACKAGE

# 5. Restore from clean backup (if needed)
sudo bash /var/www/aurelle/scripts/restore-db.sh CLEAN_BACKUP
```

#### Phase 5: Recovery

```bash
# 1. Restore normal firewall rules
sudo bash scripts/setup-firewall.sh

# 2. Verify all services
sudo systemctl status sshd nginx postgresql

# 3. Test application
curl http://localhost:3000/health

# 4. Monitor for 24-48 hours
# Watch logs, connections, processes

# 5. Gradual restoration of access
# Start with admin, then gradually add users
```

#### Phase 6: Lessons Learned

Document the incident:
- Timeline of events
- Root cause analysis
- Actions taken
- Recommendations
- Policy updates needed

### Emergency Contacts

```
On-Call Developer: [CONTACT]
System Administrator: [CONTACT]
Security Team: [CONTACT]
Hosting Provider Support: [CONTACT]
```

### Incident Severity Levels

**Critical (P0)**:
- Active data breach
- Complete service outage
- Ransomware attack
- Response: Immediate (within 15 minutes)

**High (P1)**:
- Suspicious unauthorized access
- Partial service disruption
- Failed intrusion attempt
- Response: Within 1 hour

**Medium (P2)**:
- Unusual activity detected
- Minor security misconfiguration
- Response: Within 4 hours

**Low (P3)**:
- Security scan findings
- Policy violations
- Response: Within 24 hours

---

## Compliance

### Security Standards

**Frameworks considered**:
- **CIS Benchmarks**: Center for Internet Security best practices
- **NIST Cybersecurity Framework**: Risk management framework
- **OWASP Top 10**: Web application security risks
- **PCI DSS**: Payment Card Industry Data Security Standard (if handling payments)

### CIS Ubuntu 22.04 Benchmark

Key controls implemented:

| Control | Status | Implementation |
|---------|--------|----------------|
| Ensure SSH root login disabled | ✓ | harden-ssh.sh |
| Ensure SSH key-based auth | ✓ | harden-ssh.sh |
| Ensure firewall enabled | ✓ | setup-firewall.sh |
| Ensure Fail2ban installed | ✓ | setup-fail2ban.sh |
| Ensure auto-updates enabled | ✓ | setup-auto-updates.sh |
| Ensure audit logging enabled | ✓ | setup-auditd.sh |
| Ensure minimum password requirements | ✓ | libpam-pwquality |
| Ensure unnecessary services removed | ✓ | cleanup-services.sh |

### Data Protection

**Data Classification**:
- **Public**: Website content, salon listings
- **Internal**: Application logs, metrics
- **Confidential**: User data, booking information
- **Restricted**: Passwords, payment info, API keys

**Protection measures**:
- Encryption in transit (HTTPS/TLS 1.2+)
- Encryption at rest (database, backups)
- Access controls (firewall, authentication)
- Regular backups (7 days local, 90 days cloud)
- Audit logging (all data access)

### Privacy Compliance

**GDPR considerations** (if applicable):
- Data minimization
- Purpose limitation
- Storage limitation (automated deletion)
- Data subject rights (access, deletion)
- Security measures (this hardening guide)
- Breach notification procedures

### Audit Trail Requirements

Maintained audit logs for:
- User authentication (SSH, application)
- Data access and modification
- System configuration changes
- Security events (Fail2ban bans)
- Privileged operations (sudo)

Retention: 30 days (audit logs), 90 days (backups)

---

## Troubleshooting

### SSH Connection Issues

**Problem**: Can't connect via SSH after hardening

**Solution**:
```bash
# Check SSH service status (via console)
sudo systemctl status sshd

# Check SSH port
sudo grep "^Port" /etc/ssh/sshd_config

# Test SSH configuration
sudo sshd -t

# Check firewall
sudo ufw status | grep SSH

# Check Fail2ban
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip YOUR_IP

# Restore SSH config backup
sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### Firewall Blocking Legitimate Traffic

**Problem**: Services not accessible after firewall setup

**Solution**:
```bash
# Check UFW status
sudo ufw status numbered

# Allow specific port
sudo ufw allow PORT_NUMBER/tcp

# Allow specific service
sudo ufw allow 'Nginx Full'

# Allow from specific IP
sudo ufw allow from YOUR_IP

# Disable firewall temporarily
sudo ufw disable

# Check logs
sudo tail -f /var/log/ufw.log
```

### Fail2ban False Positives

**Problem**: Own IP getting banned

**Solution**:
```bash
# Unban IP
sudo fail2ban-client set sshd unbanip YOUR_IP

# Whitelist IP permanently
sudo nano /etc/fail2ban/jail.local
# Add to [DEFAULT]:
ignoreip = 127.0.0.1/8 ::1 YOUR_IP

# Restart Fail2ban
sudo systemctl restart fail2ban

# Increase maxretry (if needed)
sudo nano /etc/fail2ban/jail.local
# Change maxretry = 5 to maxretry = 10
```

### Automatic Updates Breaking Application

**Problem**: Updates caused application to fail

**Solution**:
```bash
# Check what was updated
sudo tail -50 /var/log/unattended-upgrades/unattended-upgrades.log
sudo tail -50 /var/log/apt/history.log

# Identify problematic package
sudo apt list --installed | grep PACKAGE

# Hold package (prevent updates)
sudo apt-mark hold PACKAGE_NAME

# Downgrade package
sudo apt-get install PACKAGE_NAME=VERSION

# View held packages
sudo apt-mark showhold

# Unhold (allow updates again)
sudo apt-mark unhold PACKAGE_NAME
```

### Audit Logs Filling Disk

**Problem**: /var/log/audit/ consuming too much space

**Solution**:
```bash
# Check audit log size
du -sh /var/log/audit/

# Check disk space
df -h /var

# Compress old logs
sudo find /var/log/audit/ -name "audit.log.*" -exec gzip {} \;

# Delete old logs
sudo find /var/log/audit/ -name "audit.log.*.gz" -mtime +30 -delete

# Reduce log retention
sudo nano /etc/audit/auditd.conf
# Change: num_logs = 5 to num_logs = 3

# Restart auditd
sudo service auditd restart
```

### Performance Impact from Hardening

**Problem**: Server performance degraded after hardening

**Solution**:
```bash
# Check system load
uptime
htop

# Check audit buffer overflow
sudo auditctl -s | grep lost

# Reduce audit rules (if many lost events)
sudo nano /etc/audit/rules.d/aurelle-audit.rules
# Comment out non-critical rules

# Reload audit rules
sudo augenrules --load

# Check Fail2ban impact
sudo systemctl status fail2ban

# Reduce Fail2ban checks (if needed)
sudo nano /etc/fail2ban/jail.local
# Increase findtime to reduce log parsing frequency
```

---

## Security Checklist

### Initial Server Setup

- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Set hostname: `sudo hostnamectl set-hostname aurelle`
- [ ] Set timezone: `sudo timedatectl set-timezone Asia/Tashkent`
- [ ] Create non-root user: `sudo adduser YOUR_USERNAME`
- [ ] Add user to sudo: `sudo usermod -aG sudo YOUR_USERNAME`

### SSH Hardening

- [ ] Generate SSH keys locally
- [ ] Copy SSH key to server
- [ ] Test SSH key authentication
- [ ] Run harden-ssh.sh script
- [ ] Change SSH port to 2222
- [ ] Disable root login
- [ ] Disable password authentication
- [ ] Test SSH connection on new port
- [ ] Update local SSH config (~/.ssh/config)

### Firewall Configuration

- [ ] Install UFW
- [ ] Run setup-firewall.sh script
- [ ] Verify SSH port allowed (2222)
- [ ] Allow HTTP (80) and HTTPS (443)
- [ ] Set default policies (deny incoming, allow outgoing)
- [ ] Enable UFW
- [ ] Test SSH connection after enabling
- [ ] Test web application access
- [ ] Enable firewall logging

### Fail2ban Protection

- [ ] Install Fail2ban
- [ ] Run setup-fail2ban.sh script
- [ ] Configure SSH jail (port 2222, maxretry 3)
- [ ] Configure web server jails (Nginx)
- [ ] Configure recidive jail (repeat offenders)
- [ ] Set up Telegram notifications (optional)
- [ ] Test Fail2ban (attempt failed logins)
- [ ] Verify bans working: `sudo fail2ban-client status sshd`

### Automatic Security Updates

- [ ] Install unattended-upgrades
- [ ] Run setup-auto-updates.sh script
- [ ] Configure automatic updates (daily check, auto-install)
- [ ] Configure reboot policy (manual or automatic)
- [ ] Set up Telegram notifications (optional)
- [ ] Test: `sudo unattended-upgrade --dry-run --debug`
- [ ] Check logs: `sudo tail -f /var/log/unattended-upgrades/unattended-upgrades.log`

### Service Cleanup

- [ ] Review running services: `systemctl list-units --type=service --state=running`
- [ ] Run cleanup-services.sh script
- [ ] Disable unnecessary services (bluetooth, cups, etc.)
- [ ] Remove unnecessary packages (optional)
- [ ] Verify critical services still running (SSH, Nginx, PostgreSQL)
- [ ] Check listening ports: `sudo ss -tulpn | grep LISTEN`

### Audit Logging

- [ ] Install auditd
- [ ] Run setup-auditd.sh script
- [ ] Configure audit rules (authentication, file access, system changes)
- [ ] Verify rules loaded: `sudo auditctl -l`
- [ ] Test audit logging: `sudo ausearch -k sshd_config`
- [ ] Configure log rotation (30 days)
- [ ] Set up log monitoring (daily review)

### Security Scanning

- [ ] Install Lynis
- [ ] Run security-scan.sh script
- [ ] Review hardening index (target: 75+)
- [ ] Address critical warnings
- [ ] Implement high-priority suggestions
- [ ] Schedule monthly scans: `0 4 1 * * /var/www/aurelle/scripts/security-scan.sh`
- [ ] Document findings and fixes

### SSL/HTTPS (P2 Task #47)

- [ ] Install Certbot
- [ ] Obtain SSL certificates (Let's Encrypt)
- [ ] Configure Nginx for HTTPS
- [ ] Set up HTTP → HTTPS redirect
- [ ] Enable HSTS header
- [ ] Configure strong TLS ciphers (TLS 1.2/1.3)
- [ ] Set up auto-renewal (twice daily)
- [ ] Test: SSL Labs scan (target: A or A+)

### Backup & Recovery (P2 Task #48)

- [ ] Configure database backups (daily, pg_dump + gzip)
- [ ] Configure files backup (daily, tar + gzip)
- [ ] Set up Backblaze B2 cloud storage
- [ ] Configure automatic cloud upload
- [ ] Set retention policies (7 days local, 90 days cloud)
- [ ] Set up restore testing (weekly, Sunday 4 AM)
- [ ] Test restore procedure
- [ ] Document disaster recovery plan

### Monitoring & Alerts (P2 Task #45)

- [ ] Set up Telegram bot
- [ ] Configure health monitoring
- [ ] Set up monitoring script (runs every 5 minutes)
- [ ] Configure alerts (CPU, memory, disk, errors)
- [ ] Test Telegram notifications
- [ ] Document monitoring procedures

### Application Security

- [ ] Use non-root user for application
- [ ] Set proper file permissions (755 dirs, 644 files, 600 .env)
- [ ] Configure HTTPS only
- [ ] Enable security headers (CSP, HSTS, X-Frame-Options)
- [ ] Implement rate limiting
- [ ] Configure CORS properly
- [ ] Sanitize user inputs
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Store passwords hashed (bcrypt)
- [ ] Implement session management
- [ ] Set secure cookie flags (httpOnly, secure, sameSite)

### Regular Maintenance

- [ ] Daily: Review Fail2ban bans, check alerts
- [ ] Weekly: Review audit logs, check for rootkits
- [ ] Monthly: Run Lynis scan, update documentation
- [ ] Quarterly: Full security audit, penetration test, DR drill

### Documentation

- [ ] Document all hardening measures
- [ ] Create incident response plan
- [ ] Document emergency contacts
- [ ] Create runbooks for common tasks
- [ ] Keep security checklist updated

### Verification

- [ ] SSH works (port 2222, keys only)
- [ ] Firewall active and rules correct
- [ ] Fail2ban active and monitoring
- [ ] Automatic updates enabled
- [ ] Audit logging working
- [ ] Security scan passed (hardening index 75+)
- [ ] Application accessible via HTTPS
- [ ] Backups running and tested
- [ ] Monitoring and alerts working
- [ ] All services healthy

### Final Check

```bash
# Run comprehensive check
echo "=== Security Status Check ==="

# SSH
echo "SSH: Port $(grep '^Port' /etc/ssh/sshd_config | awk '{print $2}'), Root login $(grep '^PermitRootLogin' /etc/ssh/sshd_config | awk '{print $2}')"

# Firewall
echo "Firewall: $(sudo ufw status | head -1)"

# Fail2ban
echo "Fail2ban: $(sudo fail2ban-client ping)"

# Updates
echo "Auto-updates: $(systemctl is-active unattended-upgrades)"

# Audit
echo "Audit rules: $(sudo auditctl -l | wc -l) rules loaded"

# SSL
echo "SSL: $(echo | openssl s_client -servername aurelle.uz -connect localhost:443 2>/dev/null | grep 'Protocol' | awk '{print $2,$3}')"

# Lynis
echo "Hardening index: $(grep 'hardening_index=' /var/log/lynis-report.dat 2>/dev/null | cut -d'=' -f2)"

echo "=== Check Complete ==="
```

---

## Conclusion

This Server Hardening Guide provides comprehensive security measures for the AURELLE Beauty Salon Booking Platform. By following these procedures and maintaining regular security practices, the server will be protected against common attacks and security threats.

### Key Achievements

✅ **SSH Hardening**: Key-only authentication, non-standard port, strong ciphers
✅ **Firewall**: UFW configured with minimal open ports
✅ **Intrusion Prevention**: Fail2ban monitoring and blocking attacks
✅ **Automatic Updates**: Security patches applied automatically
✅ **Service Minimization**: Attack surface reduced
✅ **Audit Logging**: Comprehensive system activity monitoring
✅ **Security Scanning**: Regular Lynis scans with hardening index 75+

### Ongoing Security

Security is not a one-time task but an ongoing process:

1. **Monitor**: Review logs and alerts daily
2. **Update**: Keep systems and applications patched
3. **Test**: Regular security scans and penetration tests
4. **Respond**: Have incident response plan ready
5. **Improve**: Continuously enhance security posture

### Support

For questions or issues:
- Review this documentation
- Check troubleshooting section
- Review script comments
- Contact system administrator

---

**Document Version**: 1.0
**Last Updated**: 2026-01-11
**Next Review**: 2026-04-11 (Quarterly)
