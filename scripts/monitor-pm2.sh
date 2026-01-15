#!/bin/bash

# PM2 Process Monitoring Script
# Checks PM2 processes and sends alert on crashes/restarts

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"
STATE_FILE="/tmp/aurelle-pm2-state.json"
APP_NAMES=("aurelle-production" "aurelle-staging")  # PM2 app names to monitor

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed"
    exit 1
fi

# Get current PM2 process states
get_pm2_state() {
    pm2 jlist 2>/dev/null
}

# Get previous state
get_previous_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "[]"
    fi
}

# Save current state
save_state() {
    local state="$1"
    echo "$state" > "$STATE_FILE"
}

# Check for crashes and restarts
check_pm2_status() {
    local current_state=$(get_pm2_state)
    local previous_state=$(get_previous_state)

    # Parse PM2 status for each monitored app
    for app_name in "${APP_NAMES[@]}"; do
        echo "Checking $app_name..."

        # Get current app status
        local current_status=$(echo "$current_state" | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.status" 2>/dev/null)
        local current_restarts=$(echo "$current_state" | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.restart_time" 2>/dev/null)
        local current_uptime=$(echo "$current_state" | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.pm_uptime" 2>/dev/null)
        local current_memory=$(echo "$current_state" | jq -r ".[] | select(.name==\"$app_name\") | .monit.memory" 2>/dev/null)
        local current_cpu=$(echo "$current_state" | jq -r ".[] | select(.name==\"$app_name\") | .monit.cpu" 2>/dev/null)

        # Get previous app status
        local previous_restarts=$(echo "$previous_state" | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.restart_time" 2>/dev/null)

        # Check if app exists
        if [ -z "$current_status" ]; then
            echo "⚠️  App $app_name not found in PM2"

            # Check if it existed before
            local previous_status=$(echo "$previous_state" | jq -r ".[] | select(.name==\"$app_name\") | .pm2_env.status" 2>/dev/null)
            if [ -n "$previous_status" ]; then
                # App disappeared!
                description="*App Name:* ${app_name}
*Status:* Missing from PM2
*Last Known Status:* ${previous_status}

*Action Required:* App may have been deleted or stopped"

                bash "$TELEGRAM_SCRIPT" "critical" "🚨 PM2 App Missing" "$description"
            fi
            continue
        fi

        echo "  Status: $current_status"
        echo "  Restarts: $current_restarts"

        # Check if app crashed (status changed to stopped/errored)
        if [ "$current_status" = "stopped" ] || [ "$current_status" = "errored" ]; then
            echo "🚨 App $app_name is $current_status!"

            # Get error logs
            local error_logs=$(pm2 logs "$app_name" --err --lines 10 --nostream 2>&1 | tail -10)

            description="*App Name:* ${app_name}
*Status:* ${current_status}
*Restarts:* ${current_restarts}

*Recent Error Logs:*
\`\`\`
${error_logs}
\`\`\`

*Action Required:* Investigate and restart the application"

            bash "$TELEGRAM_SCRIPT" "critical" "🚨 PM2 App Crashed" "$description"
        fi

        # Check if app restarted (restart count increased)
        if [ -n "$previous_restarts" ] && [ -n "$current_restarts" ]; then
            if [ "$current_restarts" -gt "$previous_restarts" ]; then
                local restart_diff=$((current_restarts - previous_restarts))
                echo "⚠️  App $app_name restarted $restart_diff time(s)"

                # Get last few log lines
                local recent_logs=$(pm2 logs "$app_name" --lines 20 --nostream 2>&1 | tail -20)

                # Calculate uptime in human-readable format
                local uptime_seconds=$(( ($(date +%s) * 1000 - current_uptime) / 1000 ))
                local uptime_minutes=$((uptime_seconds / 60))
                local uptime_hours=$((uptime_minutes / 60))

                # Convert memory to MB
                local memory_mb=$((current_memory / 1024 / 1024))

                description="*App Name:* ${app_name}
*Status:* ${current_status}
*Restarts:* ${current_restarts} (+${restart_diff})
*Uptime:* ${uptime_hours}h ${uptime_minutes}m
*Memory:* ${memory_mb}MB
*CPU:* ${current_cpu}%

*Recent Logs:*
\`\`\`
${recent_logs}
\`\`\`

*Info:* App has been automatically restarted by PM2"

                if [ "$restart_diff" -gt 5 ]; then
                    # Multiple restarts - critical
                    bash "$TELEGRAM_SCRIPT" "critical" "🚨 PM2 App Multiple Restarts" "$description"
                else
                    # Single restart - warning
                    bash "$TELEGRAM_SCRIPT" "warning" "⚠️  PM2 App Restarted" "$description"
                fi
            fi
        fi

        # Check if app is online but using too much memory
        if [ "$current_status" = "online" ]; then
            local memory_mb=$((current_memory / 1024 / 1024))

            # Alert if memory > 1GB
            if [ "$memory_mb" -gt 1024 ]; then
                echo "⚠️  High memory usage: ${memory_mb}MB"

                description="*App Name:* ${app_name}
*Status:* ${current_status}
*Memory:* ${memory_mb}MB
*CPU:* ${current_cpu}%
*Restarts:* ${current_restarts}

*Warning:* High memory usage detected"

                bash "$TELEGRAM_SCRIPT" "warning" "⚠️  PM2 High Memory Usage" "$description"
            fi
        fi
    done

    # Save current state for next run
    save_state "$current_state"
}

# Check PM2 daemon status
check_pm2_daemon() {
    if ! pm2 ping &> /dev/null; then
        echo "🚨 PM2 daemon is not responding!"

        description="*Issue:* PM2 daemon not responding
*Impact:* Cannot manage processes

*Action Required:* Restart PM2 daemon
\`\`\`
pm2 kill
pm2 resurrect
\`\`\`"

        bash "$TELEGRAM_SCRIPT" "critical" "🚨 PM2 Daemon Down" "$description"
        return 1
    fi

    echo "✅ PM2 daemon is running"
    return 0
}

# Main execution
echo "=== PM2 Process Monitor ==="
echo "Monitored apps: ${APP_NAMES[*]}"
echo "Time: $(date)"
echo ""

# Check PM2 daemon first
if check_pm2_daemon; then
    # Check process status
    check_pm2_status
fi

echo ""
echo "=== Monitor Complete ==="
