#!/bin/bash

# Telegram Alert Script for AURELLE Infrastructure Monitoring
# Sends notifications to Telegram chat via Bot API

# Configuration
TELEGRAM_BOT_TOKEN="7985842709:AAE_0p3pDQdw8jis9RkCXlDFIMuqZZqmUvo"
TELEGRAM_CHAT_ID="1680204574"
TELEGRAM_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"

# Colors for different alert levels
ALERT_EMOJI_CRITICAL="🚨"
ALERT_EMOJI_WARNING="⚠️"
ALERT_EMOJI_INFO="ℹ️"
ALERT_EMOJI_SUCCESS="✅"

# Function to send message
send_telegram_message() {
    local message="$1"
    local parse_mode="${2:-Markdown}"  # Default to Markdown

    # Escape special characters for Markdown
    # Note: Telegram uses MarkdownV2 which requires escaping

    # Send message
    curl -s -X POST "$TELEGRAM_API" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="$message" \
        -d parse_mode="$parse_mode" \
        > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ Telegram notification sent"
        return 0
    else
        echo "❌ Failed to send Telegram notification"
        return 1
    fi
}

# Function to send critical alert
send_critical_alert() {
    local title="$1"
    local description="$2"
    local server="${3:-$(hostname)}"

    local message="${ALERT_EMOJI_CRITICAL} *CRITICAL ALERT*

*Server:* ${server}
*Issue:* ${title}

${description}

*Time:* $(date '+%Y-%m-%d %H:%M:%S')
*Priority:* CRITICAL"

    send_telegram_message "$message"
}

# Function to send warning alert
send_warning_alert() {
    local title="$1"
    local description="$2"
    local server="${3:-$(hostname)}"

    local message="${ALERT_EMOJI_WARNING} *WARNING*

*Server:* ${server}
*Issue:* ${title}

${description}

*Time:* $(date '+%Y-%m-%d %H:%M:%S')
*Priority:* WARNING"

    send_telegram_message "$message"
}

# Function to send info alert
send_info_alert() {
    local title="$1"
    local description="$2"
    local server="${3:-$(hostname)}"

    local message="${ALERT_EMOJI_INFO} *INFO*

*Server:* ${server}
*Event:* ${title}

${description}

*Time:* $(date '+%Y-%m-%d %H:%M:%S')"

    send_telegram_message "$message"
}

# Function to send success notification
send_success_alert() {
    local title="$1"
    local description="$2"
    local server="${3:-$(hostname)}"

    local message="${ALERT_EMOJI_SUCCESS} *SUCCESS*

*Server:* ${server}
*Event:* ${title}

${description}

*Time:* $(date '+%Y-%m-%d %H:%M:%S')"

    send_telegram_message "$message"
}

# Main function - handle command line arguments
main() {
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <alert_type> <title> <description> [server]"
        echo ""
        echo "Alert types:"
        echo "  critical  - Critical alert (🚨)"
        echo "  warning   - Warning alert (⚠️)"
        echo "  info      - Information alert (ℹ️)"
        echo "  success   - Success notification (✅)"
        echo ""
        echo "Examples:"
        echo "  $0 critical \"Disk Space Critical\" \"Disk usage: 95%\""
        echo "  $0 warning \"High Memory Usage\" \"Memory: 85%\" \"production-server\""
        echo "  $0 info \"Deployment Started\" \"Version 1.0.0\""
        echo "  $0 success \"Deployment Complete\" \"All checks passed\""
        exit 1
    fi

    local alert_type="$1"
    local title="$2"
    local description="$3"
    local server="${4:-}"

    case "$alert_type" in
        critical)
            send_critical_alert "$title" "$description" "$server"
            ;;
        warning)
            send_warning_alert "$title" "$description" "$server"
            ;;
        info)
            send_info_alert "$title" "$description" "$server"
            ;;
        success)
            send_success_alert "$title" "$description" "$server"
            ;;
        *)
            echo "Error: Unknown alert type '$alert_type'"
            echo "Valid types: critical, warning, info, success"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
