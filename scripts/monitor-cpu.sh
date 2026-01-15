#!/bin/bash

# CPU Usage Monitoring Script
# Checks CPU usage and sends alert if > 80% for 5 minutes

# Configuration
THRESHOLD=80
CHECK_DURATION=300  # 5 minutes in seconds
CHECK_INTERVAL=10   # Check every 10 seconds
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"
STATE_FILE="/tmp/aurelle-cpu-alert.state"
ALERT_COOLDOWN=1800  # 30 minutes between duplicate alerts

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

# Get current CPU usage
get_cpu_usage() {
    # Method 1: Using top
    if command -v top &> /dev/null; then
        local cpu_idle=$(top -bn2 -d 1 | grep "Cpu(s)" | tail -1 | awk '{print $8}' | cut -d'%' -f1)
        local cpu_usage=$(awk "BEGIN {printf \"%.0f\", 100 - $cpu_idle}")
        echo "$cpu_usage"
    # Method 2: Using mpstat (if available)
    elif command -v mpstat &> /dev/null; then
        local cpu_idle=$(mpstat 1 1 | awk '/Average/ {print $NF}')
        local cpu_usage=$(awk "BEGIN {printf \"%.0f\", 100 - $cpu_idle}")
        echo "$cpu_usage"
    else
        # Fallback: read from /proc/stat
        local cpu_usage=$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {printf "%.0f", usage}')
        echo "$cpu_usage"
    fi
}

# Monitor CPU for specified duration
monitor_cpu_sustained() {
    local num_checks=$((CHECK_DURATION / CHECK_INTERVAL))
    local high_usage_count=0
    local total_usage=0

    echo "Monitoring CPU for $CHECK_DURATION seconds (checking every $CHECK_INTERVAL seconds)..."

    for ((i=1; i<=num_checks; i++)); do
        local cpu_usage=$(get_cpu_usage)
        total_usage=$((total_usage + cpu_usage))

        echo "Check $i/$num_checks: CPU ${cpu_usage}%"

        if [ "$cpu_usage" -gt "$THRESHOLD" ]; then
            high_usage_count=$((high_usage_count + 1))
        fi

        # Don't sleep on last iteration
        if [ $i -lt $num_checks ]; then
            sleep $CHECK_INTERVAL
        fi
    done

    local avg_usage=$((total_usage / num_checks))
    local high_usage_percent=$((high_usage_count * 100 / num_checks))

    echo ""
    echo "Results:"
    echo "  Average CPU: ${avg_usage}%"
    echo "  High usage checks: ${high_usage_count}/${num_checks} (${high_usage_percent}%)"

    # Alert if more than 80% of checks showed high CPU usage
    if [ "$high_usage_percent" -gt 80 ]; then
        return 0  # Send alert
    else
        return 1  # Don't send alert
    fi
}

# Quick check (single measurement)
quick_check() {
    local cpu_usage=$(get_cpu_usage)
    echo "Current CPU Usage: ${cpu_usage}%"

    if [ "$cpu_usage" -gt "$THRESHOLD" ]; then
        echo "⚠️  CPU usage ${cpu_usage}% exceeds threshold ${THRESHOLD}%"
        return 0
    else
        echo "✅ CPU usage is normal"
        return 1
    fi
}

# Main check function
check_cpu_usage() {
    # First do a quick check
    if ! quick_check; then
        # CPU is normal, clear alert state if exists
        if [ -f "$STATE_FILE" ]; then
            echo "✅ CPU usage back to normal"
            clear_alert

            local cpu_usage=$(get_cpu_usage)
            description="*Usage:* ${cpu_usage}%
*Status:* Back to normal"

            bash "$TELEGRAM_SCRIPT" "success" "CPU Usage Recovered" "$description"
        fi
        return
    fi

    # CPU is high, monitor for sustained high usage
    if monitor_cpu_sustained; then
        local cpu_usage=$(get_cpu_usage)
        echo "🚨 Sustained high CPU usage detected!"

        if should_send_alert; then
            # Get top CPU consuming processes
            local top_processes=$(ps aux --sort=-%cpu | head -6 | tail -5 | awk '{printf "%s: %.1f%%\n", $11, $3}')

            # Determine alert level
            if [ "$cpu_usage" -gt 95 ]; then
                alert_type="critical"
                alert_title="🚨 CRITICAL: CPU Overload"
            elif [ "$cpu_usage" -gt 90 ]; then
                alert_type="critical"
                alert_title="🚨 CPU Usage Critical"
            else
                alert_type="warning"
                alert_title="⚠️  High CPU Usage (Sustained)"
            fi

            description="*Current Usage:* ${cpu_usage}%
*Duration:* Sustained for 5+ minutes
*Threshold:* ${THRESHOLD}%

*Top CPU Consumers:*
\`\`\`
${top_processes}
\`\`\`

*Action Required:* Investigate and optimize processes."

            bash "$TELEGRAM_SCRIPT" "$alert_type" "$alert_title" "$description"
            record_alert
        else
            echo "Alert in cooldown period, skipping..."
        fi
    else
        echo "CPU usage spike was temporary, not sending alert"
    fi
}

# Main execution
echo "=== CPU Usage Monitor ==="
echo "Threshold: ${THRESHOLD}%"
echo "Sustained check: ${CHECK_DURATION}s"
echo "Time: $(date)"
echo ""

check_cpu_usage

echo ""
echo "=== Monitor Complete ==="
