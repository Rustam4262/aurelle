#!/bin/bash

# Memory Usage Monitoring Script
# Checks memory usage and sends alert if > 90%

# Configuration
THRESHOLD=90
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"
STATE_FILE="/tmp/aurelle-memory-alert.state"
ALERT_COOLDOWN=1800  # 30 minutes between duplicate alerts

# Check if alert was sent recently
should_send_alert() {
    if [ ! -f "$STATE_FILE" ]; then
        return 0
    fi

    local last_alert=$(cat "$STATE_FILE")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_alert))

    [ $time_diff -gt $ALERT_COOLDOWN ]
}

record_alert() {
    date +%s > "$STATE_FILE"
}

clear_alert() {
    rm -f "$STATE_FILE"
}

# Get memory usage
check_memory_usage() {
    # Get memory info from /proc/meminfo or free command
    if command -v free &> /dev/null; then
        # Use free command (more reliable)
        local mem_total=$(free -m | awk 'NR==2{print $2}')
        local mem_used=$(free -m | awk 'NR==2{print $3}')
        local mem_free=$(free -m | awk 'NR==2{print $4}')
        local mem_available=$(free -m | awk 'NR==2{print $7}')

        # Calculate usage percentage
        local mem_usage_percent=$((mem_used * 100 / mem_total))

        echo "Memory Usage: ${mem_usage_percent}% (${mem_used}MB / ${mem_total}MB)"

        if [ "$mem_usage_percent" -gt "$THRESHOLD" ]; then
            echo "⚠️  Memory usage ${mem_usage_percent}% exceeds threshold ${THRESHOLD}%"

            if should_send_alert; then
                # Get top memory consuming processes
                local top_processes=$(ps aux --sort=-%mem | head -6 | tail -5 | awk '{printf "%s: %.1f%%\n", $11, $4}')

                # Determine alert level
                if [ "$mem_usage_percent" -gt 95 ]; then
                    alert_type="critical"
                    alert_title="🚨 CRITICAL: Memory Almost Exhausted"
                elif [ "$mem_usage_percent" -gt 92 ]; then
                    alert_type="critical"
                    alert_title="🚨 Memory Usage Critical"
                else
                    alert_type="warning"
                    alert_title="⚠️  High Memory Usage"
                fi

                description="*Usage:* ${mem_usage_percent}%
*Total Memory:* ${mem_total}MB
*Used:* ${mem_used}MB
*Available:* ${mem_available}MB

*Top Memory Consumers:*
\`\`\`
${top_processes}
\`\`\`

*Action Required:* Investigate and reduce memory usage."

                bash "$TELEGRAM_SCRIPT" "$alert_type" "$alert_title" "$description"
                record_alert
            else
                echo "Alert in cooldown period, skipping..."
            fi
        else
            # Memory usage is below threshold
            if [ -f "$STATE_FILE" ]; then
                echo "✅ Memory usage back to normal: ${mem_usage_percent}%"
                clear_alert

                description="*Usage:* ${mem_usage_percent}%
*Available:* ${mem_available}MB
*Status:* Back to normal"

                bash "$TELEGRAM_SCRIPT" "success" "Memory Usage Recovered" "$description"
            fi
        fi
    else
        echo "Error: 'free' command not found"
        exit 1
    fi
}

# Main execution
echo "=== Memory Usage Monitor ==="
echo "Threshold: ${THRESHOLD}%"
echo "Time: $(date)"
echo ""

check_memory_usage

echo ""
echo "=== Monitor Complete ==="
