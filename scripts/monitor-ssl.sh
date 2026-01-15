#!/bin/bash

# SSL Certificate Expiration Monitoring Script
# Checks SSL certificate expiration and sends alert if < 30 days

# Configuration
THRESHOLD_DAYS=30
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"
STATE_FILE="/tmp/aurelle-ssl-alert.state"

# Domains to check
DOMAINS=("aurelle.uz" "www.aurelle.uz" "staging.aurelle.uz")

# Alert cooldown (1 day)
ALERT_COOLDOWN=86400

should_send_alert() {
    local domain="$1"
    local state_file="${STATE_FILE}.${domain}"

    if [ ! -f "$state_file" ]; then
        return 0
    fi

    local last_alert=$(cat "$state_file")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_alert))

    [ $time_diff -gt $ALERT_COOLDOWN ]
}

record_alert() {
    local domain="$1"
    local state_file="${STATE_FILE}.${domain}"
    date +%s > "$state_file"
}

# Check SSL certificate expiration
check_ssl_certificate() {
    local domain="$1"
    local port="${2:-443}"

    echo "Checking SSL certificate for $domain..."

    # Get certificate expiration date
    local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:$port" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

    if [ -z "$cert_info" ]; then
        echo "❌ Failed to retrieve certificate for $domain"

        description="*Domain:* ${domain}
*Status:* Cannot retrieve SSL certificate

*Possible reasons:*
- Domain not reachable
- SSL not configured
- Network issues

*Action Required:* Investigate SSL configuration"

        bash "$TELEGRAM_SCRIPT" "warning" "⚠️  SSL Certificate Check Failed" "$description"
        return 1
    fi

    # Extract expiration date
    local not_after=$(echo "$cert_info" | grep "notAfter=" | cut -d= -f2)

    if [ -z "$not_after" ]; then
        echo "❌ Could not parse expiration date for $domain"
        return 1
    fi

    # Convert to epoch time
    local expiry_epoch=$(date -d "$not_after" +%s 2>/dev/null)

    if [ -z "$expiry_epoch" ]; then
        echo "❌ Could not convert expiration date to epoch"
        return 1
    fi

    # Calculate days until expiration
    local current_epoch=$(date +%s)
    local seconds_diff=$((expiry_epoch - current_epoch))
    local days_remaining=$((seconds_diff / 86400))

    echo "  Expires: $not_after"
    echo "  Days remaining: $days_remaining"

    # Get certificate issuer
    local issuer=$(echo | openssl s_client -servername "$domain" -connect "$domain:$port" 2>/dev/null | openssl x509 -noout -issuer 2>/dev/null | sed 's/issuer=//')

    # Get certificate subject
    local subject=$(echo | openssl s_client -servername "$domain" -connect "$domain:$port" 2>/dev/null | openssl x509 -noout -subject 2>/dev/null | sed 's/subject=//')

    # Check if certificate is expiring soon
    if [ "$days_remaining" -lt 0 ]; then
        # Certificate already expired!
        echo "🚨 Certificate EXPIRED!"

        description="*Domain:* ${domain}
*Status:* EXPIRED
*Expired:* $((-days_remaining)) days ago
*Expiry Date:* ${not_after}
*Issuer:* ${issuer}

*CRITICAL:* SSL certificate has expired!

*Action Required:*
1. Renew certificate immediately
2. Check certbot/Let's Encrypt logs
3. Verify auto-renewal is working

\`\`\`bash
sudo certbot renew --dry-run
sudo certbot certificates
\`\`\`"

        bash "$TELEGRAM_SCRIPT" "critical" "🚨 SSL Certificate EXPIRED" "$description"
        record_alert "$domain"

    elif [ "$days_remaining" -lt 7 ]; then
        # Less than 7 days - critical
        echo "🚨 Certificate expiring very soon!"

        if should_send_alert "$domain"; then
            description="*Domain:* ${domain}
*Status:* Expiring in ${days_remaining} days
*Expiry Date:* ${not_after}
*Issuer:* ${issuer}

*URGENT:* Certificate expiring very soon!

*Action Required:*
1. Renew certificate NOW
2. Verify certbot auto-renewal

\`\`\`bash
sudo certbot renew
\`\`\`"

            bash "$TELEGRAM_SCRIPT" "critical" "🚨 SSL Certificate Expiring Soon" "$description"
            record_alert "$domain"
        fi

    elif [ "$days_remaining" -lt "$THRESHOLD_DAYS" ]; then
        # Less than 30 days - warning
        echo "⚠️  Certificate expiring soon"

        if should_send_alert "$domain"; then
            description="*Domain:* ${domain}
*Status:* Expiring in ${days_remaining} days
*Expiry Date:* ${not_after}
*Issuer:* ${issuer}

*Action Required:*
1. Renew certificate soon
2. Check auto-renewal status

\`\`\`bash
sudo certbot renew --dry-run
\`\`\`"

            bash "$TELEGRAM_SCRIPT" "warning" "⚠️  SSL Certificate Expiring" "$description"
            record_alert "$domain"
        fi

    else
        # Certificate is valid
        echo "✅ Certificate is valid"

        # Send info if more than 60 days (newly renewed)
        if [ "$days_remaining" -gt 60 ]; then
            local state_file="${STATE_FILE}.${domain}"
            if [ -f "$state_file" ]; then
                # Certificate was renewed, clear alert state
                rm -f "$state_file"
            fi
        fi
    fi
}

# Main execution
echo "=== SSL Certificate Monitor ==="
echo "Threshold: ${THRESHOLD_DAYS} days"
echo "Domains: ${DOMAINS[*]}"
echo "Time: $(date)"
echo ""

for domain in "${DOMAINS[@]}"; do
    check_ssl_certificate "$domain"
    echo ""
done

echo "=== Monitor Complete ==="
