#!/bin/bash

# Disk Usage Monitoring Script
# Checks disk usage and sends alert if > 85%

# Configuration
THRESHOLD=85
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"

# State file to avoid duplicate alerts
STATE_FILE="/tmp/aurelle-disk-alert.state"
ALERT_COOLDOWN=3600  # 1 hour between duplicate alerts

# Check if alert was sent recently
should_send_alert() {
    if [ ! -f "$STATE_FILE" ]; then
        return 0  # No previous alert, send it
    fi

    local last_alert=$(cat "$STATE_FILE")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_alert))

    if [ $time_diff -gt $ALERT_COOLDOWN ]; then
        return 0  # Cooldown expired, send alert
    else
        return 1  # Still in cooldown period
    fi
}

# Record alert time
record_alert() {
    date +%s > "$STATE_FILE"
}

# Clear alert state (called when usage is back to normal)
clear_alert() {
    rm -f "$STATE_FILE"
}

# Get disk usage
check_disk_usage() {
    # Check all mounted filesystems
    df -h | grep -vE '^Filesystem|tmpfs|cdrom|loop' | while read -r line; do
        # Extract mount point and usage percentage
        usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
        mount_point=$(echo "$line" | awk '{print $6}')
        filesystem=$(echo "$line" | awk '{print $1}')
        size=$(echo "$line" | awk '{print $2}')
        used=$(echo "$line" | awk '{print $3}')
        available=$(echo "$line" | awk '{print $4}')

        echo "Checking $mount_point: ${usage}%"

        if [ "$usage" -gt "$THRESHOLD" ]; then
            echo "⚠️  Disk usage ${usage}% exceeds threshold ${THRESHOLD}% on $mount_point"

            if should_send_alert; then
                # Determine alert level
                if [ "$usage" -gt 95 ]; then
                    alert_type="critical"
                    alert_title="🚨 CRITICAL: Disk Space Almost Full"
                elif [ "$usage" -gt 90 ]; then
                    alert_type="critical"
                    alert_title="🚨 Disk Space Critical"
                else
                    alert_type="warning"
                    alert_title="⚠️  Disk Space Warning"
                fi

                description="*Mount Point:* ${mount_point}
*Filesystem:* ${filesystem}
*Usage:* ${usage}%
*Size:* ${size}
*Used:* ${used}
*Available:* ${available}

*Action Required:* Please free up disk space immediately."

                # Send alert
                bash "$TELEGRAM_SCRIPT" "$alert_type" "$alert_title" "$description"

                record_alert
            else
                echo "Alert in cooldown period, skipping..."
            fi
        else
            # Usage is below threshold, clear alert state
            if [ -f "$STATE_FILE" ]; then
                echo "✅ Disk usage back to normal: ${usage}%"
                clear_alert

                # Send recovery notification
                description="*Mount Point:* ${mount_point}
*Usage:* ${usage}%
*Status:* Back to normal"

                bash "$TELEGRAM_SCRIPT" "success" "Disk Usage Recovered" "$description"
            fi
        fi
    done
}

# Main execution
echo "=== Disk Usage Monitor ==="
echo "Threshold: ${THRESHOLD}%"
echo "Time: $(date)"
echo ""

check_disk_usage

echo ""
echo "=== Monitor Complete ==="
