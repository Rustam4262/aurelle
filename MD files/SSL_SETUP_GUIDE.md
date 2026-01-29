# AURELLE SSL/HTTPS Setup Guide

Complete guide for setting up SSL certificates with Let's Encrypt for the AURELLE Beauty Salon Platform.

**Generated:** 2026-01-11
**Certificate Authority:** Let's Encrypt
**Target Rating:** SSL Labs A+

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Nginx HTTPS Configuration](#nginx-https-configuration)
6. [Auto-Renewal Setup](#auto-renewal-setup)
7. [SSL Verification](#ssl-verification)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Overview

### What This Guide Covers

- ✅ Certbot installation (via snap)
- ✅ SSL certificate generation for production and staging
- ✅ Nginx HTTPS configuration with security headers
- ✅ HTTP to HTTPS redirect
- ✅ TLS 1.2 and 1.3 only (TLS 1.0/1.1 disabled)
- ✅ Strong cipher suites (Mozilla Modern configuration)
- ✅ HSTS (HTTP Strict Transport Security) with preload
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Automatic certificate renewal
- ✅ SSL Labs A+ rating

### Domains

- **Production:** aurelle.uz, www.aurelle.uz
- **Staging:** staging.aurelle.uz

### Certificate Details

- **Provider:** Let's Encrypt
- **Type:** DV (Domain Validated)
- **Validity:** 90 days
- **Auto-Renewal:** 30 days before expiration
- **Encryption:** RSA 2048-bit

---

## Prerequisites

### System Requirements

1. **Operating System:** Ubuntu 20.04+ or Debian 10+
2. **Web Server:** Nginx installed and running
3. **Ports:** 80 (HTTP) and 443 (HTTPS) open
4. **Root Access:** sudo privileges required

### DNS Configuration

Before starting, ensure your domains point to your server:

```bash
# Check DNS resolution
dig aurelle.uz +short
dig www.aurelle.uz +short
dig staging.aurelle.uz +short

# Or use host command
host aurelle.uz
host www.aurelle.uz
host staging.aurelle.uz
```

All domains should resolve to your server's IP address.

### Firewall Rules

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Verify
sudo ufw status
```

---

## Quick Start

### One-Command Setup

```bash
# Navigate to project directory
cd /path/to/aurelle

# 1. Install Certbot
sudo bash scripts/install-certbot.sh

# 2. Setup SSL certificates
sudo bash scripts/setup-ssl.sh

# 3. Verify SSL configuration
sudo bash scripts/verify-ssl.sh

# 4. Setup auto-renewal
sudo bash scripts/setup-ssl-renewal.sh
```

That's it! Your site should now be accessible via HTTPS with A+ rating.

---

## Detailed Setup

### Step 1: Install Certbot

**Script:** `scripts/install-certbot.sh`

```bash
sudo bash scripts/install-certbot.sh
```

**What it does:**

1. Updates package list
2. Installs snapd (recommended method)
3. Removes old Certbot installations
4. Installs Certbot via snap
5. Installs Certbot Nginx plugin
6. Creates symbolic link to `/usr/bin/certbot`
7. Verifies installation

**Verification:**

```bash
certbot --version
# Should output: certbot 2.x.x
```

### Step 2: Generate SSL Certificates

**Script:** `scripts/setup-ssl.sh`

**Before running:**

- Ensure DNS is configured
- Nginx is running
- Ports 80 and 443 are open

```bash
sudo bash scripts/setup-ssl.sh
```

**What it does:**

1. **DNS Verification:** Checks all domains resolve correctly
2. **Temporary Nginx Config:** Creates HTTP-only config for ACME challenge
3. **Certificate Request (Production):**
   ```bash
   certbot certonly --webroot \
     -w /var/www/html \
     -d aurelle.uz \
     -d www.aurelle.uz \
     --email admin@aurelle.uz \
     --agree-tos \
     --non-interactive
   ```
4. **Certificate Request (Staging):**
   ```bash
   certbot certonly --webroot \
     -w /var/www/html \
     -d staging.aurelle.uz \
     --email admin@aurelle.uz \
     --agree-tos \
     --non-interactive
   ```
5. **HTTPS Nginx Config:** Installs production-ready HTTPS configuration
6. **Nginx Reload:** Activates HTTPS configuration
7. **Verification:** Tests certificate renewal

**Manual Certificate Request:**

```bash
# Production
sudo certbot certonly --nginx \
  -d aurelle.uz \
  -d www.aurelle.uz \
  --email your-email@example.com

# Staging
sudo certbot certonly --nginx \
  -d staging.aurelle.uz \
  --email your-email@example.com
```

**Certificate Locations:**

```
/etc/letsencrypt/live/aurelle.uz/
  ├── fullchain.pem   (Certificate + Chain)
  ├── privkey.pem     (Private Key)
  ├── cert.pem        (Certificate Only)
  └── chain.pem       (Chain Only)

/etc/letsencrypt/live/staging.aurelle.uz/
  ├── fullchain.pem
  ├── privkey.pem
  ├── cert.pem
  └── chain.pem
```

### Step 3: Configure Nginx for HTTPS

**Configuration File:** `configs/nginx-https.conf`

The setup script automatically installs this configuration. Key features:

#### HTTP to HTTPS Redirect

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name aurelle.uz www.aurelle.uz;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

#### SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aurelle.uz www.aurelle.uz;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/aurelle.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aurelle.uz/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/aurelle.uz/chain.pem;

    # SSL Protocols (TLS 1.2 and 1.3 only)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Strong Ciphers (Mozilla Modern)
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
    ssl_prefer_server_ciphers off;

    # SSL Session Cache
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Diffie-Hellman Parameter
    ssl_dhparam /etc/nginx/dhparam.pem;

    # ... rest of configuration
}
```

#### Security Headers

```nginx
# HSTS (1 year, includeSubDomains, preload)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; ..." always;

# Permissions Policy
add_header Permissions-Policy "geolocation=(self), microphone=(), camera=()" always;
```

#### Manual Configuration

If you need to configure Nginx manually:

```bash
# Generate DH parameters (takes a few minutes)
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048

# Copy configuration
sudo cp configs/nginx-https.conf /etc/nginx/sites-available/aurelle

# Enable configuration
sudo ln -s /etc/nginx/sites-available/aurelle /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Auto-Renewal Setup

**Script:** `scripts/setup-ssl-renewal.sh`

```bash
sudo bash scripts/setup-ssl-renewal.sh
```

### What it Creates

1. **Renewal Script:** `/usr/local/bin/certbot-renew-aurelle`
   - Runs certificate renewal
   - Reloads Nginx after renewal
   - Logs all renewal attempts
   - Sends Telegram notifications (if configured)

2. **Cron Jobs:**

   ```cron
   # Renewal check (twice daily: 3 AM and 3 PM)
   0 3,15 * * * /usr/local/bin/certbot-renew-aurelle

   # Expiration check (weekly: Monday 9 AM)
   0 9 * * 1 /usr/local/bin/check-ssl-expiration
   ```

3. **Systemd Timer:** (if available)
   - Configured to run twice daily
   - Automatic randomized delay (up to 1 hour)

4. **Expiration Monitor:** `/usr/local/bin/check-ssl-expiration`
   - Checks days until expiration
   - Sends alerts at 30 days (warning) and 14 days (critical)

### Renewal Process

Let's Encrypt certificates are valid for **90 days**. Auto-renewal happens:

- **Renewal Window:** 30 days before expiration
- **Check Frequency:** Twice daily (3 AM and 3 PM)
- **Process:**
  1. Certbot checks if renewal is needed
  2. If < 30 days until expiration, renewal is performed
  3. New certificates are saved
  4. Nginx is automatically reloaded
  5. Logs and notifications are sent

### Manual Renewal

```bash
# Dry run (test renewal without actually renewing)
sudo certbot renew --dry-run

# Force renewal (even if not due)
sudo certbot renew --force-renewal

# Renew specific certificate
sudo certbot renew --cert-name aurelle.uz

# Renew with verbose output
sudo certbot renew --verbose
```

### Monitoring Renewal

```bash
# View renewal logs
tail -f /var/log/certbot-renewal.log
tail -f /var/log/letsencrypt/letsencrypt.log

# Check certificate expiration
sudo certbot certificates

# Run expiration check
sudo /usr/local/bin/check-ssl-expiration

# View cron jobs
crontab -l | grep -i ssl

# View systemd timer
systemctl status certbot.timer
systemctl list-timers | grep certbot
```

---

## SSL Verification

**Script:** `scripts/verify-ssl.sh`

```bash
sudo bash scripts/verify-ssl.sh
```

### Automated Checks

The verification script checks:

1. **HTTPS Accessibility** - Site loads via HTTPS
2. **HTTP → HTTPS Redirect** - HTTP properly redirects
3. **Certificate Information** - Validity, expiration, SANs
4. **TLS Protocol Support** - TLS 1.2/1.3 enabled, 1.0/1.1 disabled
5. **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
6. **Cipher Configuration** - Strong ciphers in use
7. **OCSP Stapling** - Enabled for faster validation

**Output:** Detailed report saved to `/var/log/aurelle-monitoring/ssl-verification-TIMESTAMP.txt`

### Manual Verification

#### Check Certificate

```bash
# View certificate details
echo | openssl s_client -servername aurelle.uz -connect aurelle.uz:443 2>/dev/null | openssl x509 -noout -text

# Check expiration
echo | openssl s_client -servername aurelle.uz -connect aurelle.uz:443 2>/dev/null | openssl x509 -noout -dates

# Check SANs
echo | openssl s_client -servername aurelle.uz -connect aurelle.uz:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

#### Test TLS Versions

```bash
# Test TLS 1.2 (should work)
openssl s_client -tls1_2 -connect aurelle.uz:443 < /dev/null

# Test TLS 1.3 (should work)
openssl s_client -tls1_3 -connect aurelle.uz:443 < /dev/null

# Test TLS 1.1 (should fail)
openssl s_client -tls1_1 -connect aurelle.uz:443 < /dev/null
```

#### Check Security Headers

```bash
# View all headers
curl -I https://aurelle.uz

# Check specific headers
curl -I https://aurelle.uz | grep -i "strict-transport-security"
curl -I https://aurelle.uz | grep -i "x-frame-options"
curl -I https://aurelle.uz | grep -i "content-security-policy"
```

### Online Testing Tools

#### SSL Labs (Comprehensive Test)

**URL:** https://www.ssllabs.com/ssltest/analyze.html?d=aurelle.uz

**Wait 2-3 minutes** after first accessing HTTPS before testing.

**Target Rating:** A+

**Criteria for A+:**

- ✅ TLS 1.2 and 1.3 supported
- ✅ TLS 1.0 and 1.1 disabled
- ✅ Strong ciphers only
- ✅ HSTS with max-age >= 6 months
- ✅ Valid certificate chain
- ✅ No known vulnerabilities

#### Mozilla Observatory

**URL:** https://observatory.mozilla.org/analyze/aurelle.uz

Tests:

- Security headers
- Content Security Policy
- Cookie security
- Cross-origin policies

**Target Score:** A+

#### Security Headers

**URL:** https://securityheaders.com/?q=aurelle.uz

Tests all security headers.

**Target Rating:** A+

---

## Security Best Practices

### HSTS Preload

Once your site is stable with HTTPS, consider adding it to HSTS preload list:

1. **Verify HSTS header:**

   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
   ```

2. **Submit to preload list:** https://hstspreload.org/

3. **Requirements:**
   - HSTS header with `preload` directive
   - max-age >= 31536000 (1 year)
   - includeSubDomains directive
   - HTTPS on all subdomains

**Warning:** Preload is difficult to undo. Test thoroughly first!

### Certificate Pinning

For mobile apps, consider certificate pinning:

```typescript
// Example for React Native
const certificatePin = {
  "aurelle.uz": ["SHA256_HASH_HERE"],
};
```

### Monitoring

Integrate with existing monitoring (P2 Task #45):

**File:** `scripts/monitor-ssl.sh` (already created)
**Schedule:** Daily at 9 AM
**Alerts:**

- 🔴 Critical: Certificate expired
- 🟡 Warning: Certificate expires in < 30 days

### Regular Audits

**Weekly:**

```bash
# Run verification
sudo bash scripts/verify-ssl.sh

# Check expiration
sudo /usr/local/bin/check-ssl-expiration
```

**Monthly:**

```bash
# Test on SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=aurelle.uz

# Review cipher suites
sudo nginx -T | grep ssl_ciphers
```

---

## Troubleshooting

### Certificate Not Obtained

**Problem:** Certbot fails to obtain certificate

**Solutions:**

1. **Check DNS resolution:**

   ```bash
   dig aurelle.uz +short
   nslookup aurelle.uz
   ```

2. **Check firewall:**

   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Check Nginx is running:**

   ```bash
   sudo systemctl status nginx
   sudo systemctl start nginx
   ```

4. **Verify webroot is accessible:**

   ```bash
   ls -la /var/www/html
   sudo mkdir -p /var/www/html/.well-known/acme-challenge
   sudo chown -R www-data:www-data /var/www/html
   ```

5. **Check Certbot logs:**
   ```bash
   sudo tail -100 /var/log/letsencrypt/letsencrypt.log
   ```

### Mixed Content Warnings

**Problem:** Browser shows "Not Secure" despite HTTPS

**Cause:** HTTP resources loaded on HTTPS page

**Solution:**

1. Check browser console for mixed content warnings
2. Update all HTTP URLs to HTTPS:

   ```javascript
   // Bad
   <script src="http://example.com/script.js"></script>

   // Good
   <script src="https://example.com/script.js"></script>

   // Best (protocol-relative)
   <script src="//example.com/script.js"></script>
   ```

### Certificate Renewal Fails

**Problem:** Auto-renewal doesn't work

**Debug:**

1. **Test renewal manually:**

   ```bash
   sudo certbot renew --dry-run
   sudo certbot renew --verbose
   ```

2. **Check if domain still points to server:**

   ```bash
   dig aurelle.uz +short
   ```

3. **Check Nginx configuration:**

   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **Check webroot permissions:**

   ```bash
   sudo chown -R www-data:www-data /var/www/html
   ```

5. **Review logs:**
   ```bash
   tail -f /var/log/certbot-renewal.log
   tail -f /var/log/letsencrypt/letsencrypt.log
   ```

### SSL Labs Rating Below A+

**Common Issues:**

1. **TLS 1.0/1.1 Enabled**
   - Fix: Ensure `ssl_protocols TLSv1.2 TLSv1.3;` in Nginx config

2. **Weak Ciphers**
   - Fix: Use Mozilla Modern cipher suite

3. **Missing HSTS**
   - Fix: Add `Strict-Transport-Security` header

4. **Missing OCSP Stapling**
   - Fix: Enable `ssl_stapling on;` in Nginx config

5. **Missing DH Parameters**
   ```bash
   sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
   ```

### Nginx Won't Start After SSL Config

**Problem:** Nginx fails to start or reload

**Debug:**

1. **Test configuration:**

   ```bash
   sudo nginx -t
   ```

2. **Check certificate paths:**

   ```bash
   sudo ls -la /etc/letsencrypt/live/aurelle.uz/
   ```

3. **Verify DH parameters:**

   ```bash
   sudo ls -la /etc/nginx/dhparam.pem
   ```

4. **Check error logs:**

   ```bash
   sudo tail -100 /var/log/nginx/error.log
   ```

5. **Restore backup if needed:**
   ```bash
   sudo cp /etc/nginx/backups/aurelle.backup.TIMESTAMP /etc/nginx/sites-available/aurelle
   sudo systemctl restart nginx
   ```

---

## Maintenance

### Monthly Tasks

```bash
# 1. Verify certificates are valid
sudo certbot certificates

# 2. Check expiration dates
sudo /usr/local/bin/check-ssl-expiration

# 3. Test SSL configuration
sudo bash scripts/verify-ssl.sh

# 4. Test on SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=aurelle.uz
```

### Certificate Operations

#### List Certificates

```bash
sudo certbot certificates
```

#### Renew Specific Certificate

```bash
sudo certbot renew --cert-name aurelle.uz
```

#### Revoke Certificate

```bash
sudo certbot revoke --cert-path /etc/letsencrypt/live/aurelle.uz/cert.pem
sudo certbot delete --cert-name aurelle.uz
```

#### Add Domain to Existing Certificate

```bash
sudo certbot certonly --cert-name aurelle.uz \
  --expand \
  -d aurelle.uz \
  -d www.aurelle.uz \
  -d new-subdomain.aurelle.uz
```

### Nginx Configuration Updates

```bash
# Edit configuration
sudo nano /etc/nginx/sites-available/aurelle

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# If errors, check logs
sudo tail -100 /var/log/nginx/error.log
```

### Log Rotation

Nginx and Certbot logs are automatically rotated by logrotate.

**Configuration:** `/etc/logrotate.d/nginx` and `/etc/logrotate.d/certbot`

**Manual rotation:**

```bash
sudo logrotate -f /etc/logrotate.d/nginx
sudo logrotate -f /etc/logrotate.d/certbot
```

---

## Summary

### Files Created

1. **`scripts/install-certbot.sh`** - Certbot installation
2. **`scripts/setup-ssl.sh`** - SSL certificate setup
3. **`scripts/setup-ssl-renewal.sh`** - Auto-renewal configuration
4. **`scripts/verify-ssl.sh`** - SSL verification
5. **`configs/nginx-https.conf`** - Production Nginx HTTPS config

### Quick Command Reference

```bash
# Installation
sudo bash scripts/install-certbot.sh

# Setup
sudo bash scripts/setup-ssl.sh

# Verification
sudo bash scripts/verify-ssl.sh
sudo certbot certificates

# Renewal
sudo bash scripts/setup-ssl-renewal.sh
sudo certbot renew --dry-run

# Monitoring
sudo /usr/local/bin/check-ssl-expiration
tail -f /var/log/certbot-renewal.log
```

### Testing Checklist

- [ ] HTTPS accessible (https://aurelle.uz, https://www.aurelle.uz, https://staging.aurelle.uz)
- [ ] HTTP redirects to HTTPS
- [ ] Certificate valid and trusted
- [ ] TLS 1.2 and 1.3 enabled
- [ ] TLS 1.0 and 1.1 disabled
- [ ] Strong ciphers only
- [ ] HSTS header present (max-age=31536000)
- [ ] Security headers configured
- [ ] OCSP stapling enabled
- [ ] SSL Labs rating: A+
- [ ] Auto-renewal configured
- [ ] Monitoring in place

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Maintained By:** AURELLE DevOps Team
