#!/bin/bash

# ==========================================
# TELEGRAM NOTIFICATION SCRIPT
# AURELLE - Beauty Salon Marketplace
# ==========================================
# Отправляет уведомления в Telegram
# Использование:
#   bash send_telegram.sh "Ваше сообщение"
#
# Настройка:
#   1. Создайте бота через @BotFather
#   2. Получите токен
#   3. Получите свой chat_id через @userinfobot
#   4. Добавьте в .env:
#      TELEGRAM_BOT_TOKEN=ваш_токен
#      TELEGRAM_ADMIN_CHAT_ID=ваш_chat_id
# ==========================================

# Load environment
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if token and chat_id are set
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_ADMIN_CHAT_ID" ]; then
    echo "❌ Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in .env"
    exit 0  # Exit without error (optional feature)
fi

# Get message from argument
MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    echo "Usage: $0 \"Your message\""
    exit 1
fi

# Send message
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_ADMIN_CHAT_ID}" \
  -d text="${MESSAGE}" \
  -d parse_mode="HTML")

# Check if successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✓ Telegram message sent"
else
    echo "✗ Failed to send Telegram message"
    echo "$RESPONSE"
    exit 1
fi
