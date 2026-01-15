#!/bin/bash

# Health Endpoint Monitoring Script
# Checks application health endpoint every 5 minutes

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEGRAM_SCRIPT="$SCRIPT_DIR/telegram-send.sh"
STATE_FILE="/tmp/aurelle-health-alert.state"
ALERT_COOLDOWN=600  # 10 minutes between duplicate alerts

# Health endpoints to check
ENDPOINTS=(
    "https://aurelle.uz/api/health|production"
    "https://staging.aurelle.uz/api/health|staging"
    "http://localhost:5000/api/health|local-production"
    "http://localhost:5001/api/health|local-staging"
)

should_send_alert() {
    local endpoint_id="$1"
    local state_file="${STATE_FILE}.${endpoint_id}"

    if [ ! -f "$state_file" ]; then
        return 0
    fi

    local last_alert=$(cat "$state_file")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_alert))

    [ $time_diff -gt $ALERT_COOLDOWN ]
}

record_alert() {
    local endpoint_id="$1"
    local state_file="${STATE_FILE}.${endpoint_id}"
    date +%s > "$state_file"
}

clear_alert() {
    local endpoint_id="$1"
    local state_file="${STATE_FILE}.${endpoint_id}"
    rm -f "$state_file"
}

# Check single health endpoint
check_health_endpoint() {
    local url="$1"
    local name="$2"
    local endpoint_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

    echo "Checking $name ($url)..."

    # Make request with timeout
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" -m 10 "$url" 2>/dev/null)
    local end_time=$(date +%s%N)

    # Parse response
    local body=$(echo "$response" | head -1)
    local status_code=$(echo "$response" | sed -n '2p')
    local response_time=$(echo "$response" | sed -n '3p')

    # Calculate response time in ms
    local response_time_ms=$(awk "BEGIN {printf \"%.0f\", $response_time * 1000}")

    if [ -z "$status_code" ]; then
        # Request failed completely
        echo "❌ Request failed (timeout or connection error)"

        if should_send_alert "$endpoint_id"; then
            description="*Endpoint:* ${name}
*URL:* ${url}
*Status:* Connection failed
*Error:* Timeout or unreachable

*Possible causes:*
- Application not running
- Network issues
- Firewall blocking request
- PM2 process crashed

*Action Required:*
1. Check if application is running
\`\`\`bash
pm2 status
curl -I ${url}
\`\`\`"

            bash "$TELEGRAM_SCRIPT" "critical" "🚨 Health Check Failed" "$description"
            record_alert "$endpoint_id"
        fi
        return 1
    fi

    echo "  Status: $status_code"
    echo "  Response time: ${response_time_ms}ms"

    # Check status code
    if [ "$status_code" = "200" ]; then
        echo "✅ Health check passed"

        # Clear alert if it was previously failing
        if [ -f "${STATE_FILE}.${endpoint_id}" ]; then
            clear_alert "$endpoint_id"

            description="*Endpoint:* ${name}
*URL:* ${url}
*Status:* Recovered (HTTP 200)
*Response time:* ${response_time_ms}ms"

            bash "$TELEGRAM_SCRIPT" "success" "Health Check Recovered" "$description"
        fi

        # Warn if response time is slow
        if [ "$response_time_ms" -gt 5000 ]; then
            echo "⚠️  Slow response time: ${response_time_ms}ms"

            description="*Endpoint:* ${name}
*URL:* ${url}
*Status:* HTTP 200 (OK)
*Response time:* ${response_time_ms}ms

*Warning:* Response time is very slow (> 5s)"

            bash "$TELEGRAM_SCRIPT" "warning" "⚠️  Slow Health Check Response" "$description"
        fi

        return 0
    else
        # Non-200 status code
        echo "❌ Health check failed: HTTP $status_code"

        if should_send_alert "$endpoint_id"; then
            # Try to parse error message from body
            local error_msg=$(echo "$body" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "$body")

            description="*Endpoint:* ${name}
*URL:* ${url}
*Status:* HTTP ${status_code}
*Response time:* ${response_time_ms}ms
*Error:* ${error_msg}

*Action Required:*
1. Check application logs
\`\`\`bash
pm2 logs
\`\`\`
2. Check application status
\`\`\`bash
pm2 status
\`\`\`"

            if [ "$status_code" -ge 500 ]; then
                bash "$TELEGRAM_SCRIPT" "critical" "🚨 Health Check Error (HTTP $status_code)" "$description"
            else
                bash "$TELEGRAM_SCRIPT" "warning" "⚠️  Health Check Warning (HTTP $status_code)" "$description"
            fi

            record_alert "$endpoint_id"
        fi
        return 1
    fi
}

# Main execution
echo "=== Health Endpoint Monitor ==="
echo "Time: $(date)"
echo ""

all_passed=true

for endpoint_config in "${ENDPOINTS[@]}"; do
    # Parse endpoint configuration
    IFS='|' read -r url name <<< "$endpoint_config"

    check_health_endpoint "$url" "$name"
    result=$?

    if [ $result -ne 0 ]; then
        all_passed=false
    fi

    echo ""
done

if [ "$all_passed" = true ]; then
    echo "✅ All health checks passed"
else
    echo "❌ Some health checks failed"
fi

echo "=== Monitor Complete ==="
