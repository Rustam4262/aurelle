#!/bin/bash

# Daily Analytics Report Script
# Queries PostgreSQL for key metrics and sends via Telegram

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DATE=$(date '+%Y-%m-%d')
TELEGRAM_SCRIPT="/var/www/aurelle/scripts/telegram-send.sh"
LOG_FILE="/var/log/aurelle-reports/daily-report.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load database credentials
if [ -f "/etc/aurelle-db.conf" ]; then
    source /etc/aurelle-db.conf
else
    echo -e "${RED}✗${NC} Database credentials not found"
    exit 1
fi

log "=== Daily Report Generation Started ==="

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Function to query database
query_db() {
    psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

# Get yesterday's date for comparisons
YESTERDAY=$(date -d "yesterday" '+%Y-%m-%d')

# ==================== ACQUISITION METRICS ====================

echo -e "${BLUE}Fetching Acquisition Metrics...${NC}"

# Total Visitors (Last 24 hours)
VISITORS_TODAY=$(query_db "
SELECT COUNT(DISTINCT session_id)
FROM analytics_events
WHERE event_name = 'page_view'
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

VISITORS_YESTERDAY=$(query_db "
SELECT COUNT(DISTINCT session_id)
FROM analytics_events
WHERE event_name = 'page_view'
  AND created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at < CURRENT_DATE;
")

# Calculate change percentage
if [ "$VISITORS_YESTERDAY" -gt 0 ]; then
    VISITORS_CHANGE=$(awk "BEGIN {printf \"%.1f\", (($VISITORS_TODAY - $VISITORS_YESTERDAY) / $VISITORS_YESTERDAY) * 100}")
else
    VISITORS_CHANGE="N/A"
fi

# Top Salons Viewed
TOP_SALONS=$(query_db "
SELECT
  s.name || ' (' || COUNT(*) || ' views)'
FROM analytics_events ae
JOIN salons s ON (ae.event_properties->>'salon_id')::uuid = s.id
WHERE ae.event_name = 'salon_viewed'
  AND ae.created_at >= CURRENT_DATE
  AND ae.created_at < CURRENT_DATE + INTERVAL '1 day'
GROUP BY s.id, s.name
ORDER BY COUNT(*) DESC
LIMIT 5;
" | tr '\n' '\n' | sed 's/^/  • /')

if [ -z "$TOP_SALONS" ]; then
    TOP_SALONS="  • No data"
fi

log "Acquisition metrics: Visitors=$VISITORS_TODAY"

# ==================== ACTIVATION METRICS ====================

echo -e "${BLUE}Fetching Activation Metrics...${NC}"

# Sign-ups Today
SIGNUPS_TODAY=$(query_db "
SELECT COUNT(*)
FROM users
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

SIGNUPS_YESTERDAY=$(query_db "
SELECT COUNT(*)
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at < CURRENT_DATE;
")

# First Bookings Today
FIRST_BOOKINGS=$(query_db "
SELECT COUNT(DISTINCT b.user_id)
FROM bookings b
WHERE b.created_at >= CURRENT_DATE
  AND b.created_at < CURRENT_DATE + INTERVAL '1 day'
  AND NOT EXISTS (
    SELECT 1 FROM bookings b2
    WHERE b2.user_id = b.user_id
      AND b2.created_at < b.created_at
  );
")

# Sign-up Rate
if [ "$VISITORS_TODAY" -gt 0 ]; then
    SIGNUP_RATE=$(awk "BEGIN {printf \"%.1f\", ($SIGNUPS_TODAY / $VISITORS_TODAY) * 100}")
else
    SIGNUP_RATE="0.0"
fi

log "Activation metrics: Signups=$SIGNUPS_TODAY, FirstBookings=$FIRST_BOOKINGS"

# ==================== RETENTION METRICS ====================

echo -e "${BLUE}Fetching Retention Metrics...${NC}"

# Daily Active Users (DAU)
DAU=$(query_db "
SELECT COUNT(DISTINCT user_id)
FROM user_activities
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

# Weekly Active Users (WAU)
WAU=$(query_db "
SELECT COUNT(DISTINCT user_id)
FROM user_activities
WHERE created_at >= CURRENT_DATE - INTERVAL '6 days';
")

# Monthly Active Users (MAU)
MAU=$(query_db "
SELECT COUNT(DISTINCT user_id)
FROM user_activities
WHERE created_at >= CURRENT_DATE - INTERVAL '29 days';
")

# DAU/MAU Ratio (Stickiness)
if [ "$MAU" -gt 0 ]; then
    STICKINESS=$(awk "BEGIN {printf \"%.1f\", ($DAU / $MAU) * 100}")
else
    STICKINESS="0.0"
fi

log "Retention metrics: DAU=$DAU, WAU=$WAU, MAU=$MAU"

# ==================== REVENUE METRICS ====================

echo -e "${BLUE}Fetching Revenue Metrics...${NC}"

# Revenue Today
REVENUE_TODAY=$(query_db "
SELECT COALESCE(SUM(amount), 0)
FROM payments
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

REVENUE_YESTERDAY=$(query_db "
SELECT COALESCE(SUM(amount), 0)
FROM payments
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at < CURRENT_DATE;
")

# Format revenue (add thousands separator)
REVENUE_TODAY_FORMATTED=$(echo "$REVENUE_TODAY" | awk '{printf "%'"'"'d", $1}')
REVENUE_YESTERDAY_FORMATTED=$(echo "$REVENUE_YESTERDAY" | awk '{printf "%'"'"'d", $1}')

# Calculate change percentage
if [ "$REVENUE_YESTERDAY" -gt 0 ]; then
    REVENUE_CHANGE=$(awk "BEGIN {printf \"%.1f\", (($REVENUE_TODAY - $REVENUE_YESTERDAY) / $REVENUE_YESTERDAY) * 100}")
else
    REVENUE_CHANGE="N/A"
fi

# Bookings Today
BOOKINGS_TODAY=$(query_db "
SELECT COUNT(*)
FROM bookings
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

BOOKINGS_YESTERDAY=$(query_db "
SELECT COUNT(*)
FROM bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
  AND created_at < CURRENT_DATE;
")

# Average Order Value
if [ "$BOOKINGS_TODAY" -gt 0 ]; then
    AOV=$(awk "BEGIN {printf \"%.0f\", $REVENUE_TODAY / $BOOKINGS_TODAY}")
else
    AOV="0"
fi

AOV_FORMATTED=$(echo "$AOV" | awk '{printf "%'"'"'d", $1}')

# Conversion Rate
if [ "$VISITORS_TODAY" -gt 0 ]; then
    CONVERSION_RATE=$(awk "BEGIN {printf \"%.2f\", ($BOOKINGS_TODAY / $VISITORS_TODAY) * 100}")
else
    CONVERSION_RATE="0.00"
fi

# Top Revenue Salons
TOP_REVENUE_SALONS=$(query_db "
SELECT
  s.name || ' (₸' || SUM(p.amount)::INTEGER || ')'
FROM payments p
JOIN bookings b ON p.booking_id = b.id
JOIN salons s ON b.salon_id = s.id
WHERE p.status = 'completed'
  AND p.created_at >= CURRENT_DATE
  AND p.created_at < CURRENT_DATE + INTERVAL '1 day'
GROUP BY s.id, s.name
ORDER BY SUM(p.amount) DESC
LIMIT 5;
" | tr '\n' '\n' | sed 's/^/  • /')

if [ -z "$TOP_REVENUE_SALONS" ]; then
    TOP_REVENUE_SALONS="  • No data"
fi

log "Revenue metrics: Revenue=₸$REVENUE_TODAY_FORMATTED, Bookings=$BOOKINGS_TODAY"

# ==================== REFERRAL METRICS ====================

echo -e "${BLUE}Fetching Referral Metrics...${NC}"

# Referrals Sent Today
REFERRALS_SENT=$(query_db "
SELECT COUNT(*)
FROM analytics_events
WHERE event_name = 'referral_sent'
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

# Referral Sign-ups Today
REFERRAL_SIGNUPS=$(query_db "
SELECT COUNT(*)
FROM analytics_events
WHERE event_name = 'referral_signup'
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

# Social Shares Today
SOCIAL_SHARES=$(query_db "
SELECT COUNT(*)
FROM social_shares
WHERE created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';
")

# NPS Score (Last 7 days)
NPS_SCORE=$(query_db "
WITH nps_data AS (
  SELECT
    CASE
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END as category
  FROM nps_surveys
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  COALESCE(
    ROUND(
      (COUNT(*) FILTER (WHERE category = 'promoter')::NUMERIC -
       COUNT(*) FILTER (WHERE category = 'detractor')::NUMERIC) * 100.0 /
      NULLIF(COUNT(*), 0)
    , 1),
    0
  )
FROM nps_data;
")

if [ -z "$NPS_SCORE" ]; then
    NPS_SCORE="N/A"
fi

log "Referral metrics: ReferralsSent=$REFERRALS_SENT, NPS=$NPS_SCORE"

# ==================== FORMAT TELEGRAM MESSAGE ====================

# Determine trend emoji
get_trend_emoji() {
    local current=$1
    local previous=$2

    if [ -z "$previous" ] || [ "$previous" = "0" ]; then
        echo "━"
        return
    fi

    if [ "$current" -gt "$previous" ]; then
        echo "📈"
    elif [ "$current" -lt "$previous" ]; then
        echo "📉"
    else
        echo "━"
    fi
}

VISITORS_TREND=$(get_trend_emoji "$VISITORS_TODAY" "$VISITORS_YESTERDAY")
SIGNUPS_TREND=$(get_trend_emoji "$SIGNUPS_TODAY" "$SIGNUPS_YESTERDAY")
BOOKINGS_TREND=$(get_trend_emoji "$BOOKINGS_TODAY" "$BOOKINGS_YESTERDAY")
REVENUE_TREND=$(get_trend_emoji "$REVENUE_TODAY" "$REVENUE_YESTERDAY")

# Format change percentage
format_change() {
    local change=$1
    if [ "$change" = "N/A" ]; then
        echo ""
    elif [ "${change:0:1}" = "-" ]; then
        echo " ($change%)"
    else
        echo " (+$change%)"
    fi
}

VISITORS_CHANGE_STR=$(format_change "$VISITORS_CHANGE")
REVENUE_CHANGE_STR=$(format_change "$REVENUE_CHANGE")

# Build Telegram message
MESSAGE="*📊 AURELLE Daily Report*
_$REPORT_DATE_

*🔍 ACQUISITION*
• Visitors: $VISITORS_TODAY $VISITORS_TREND$VISITORS_CHANGE_STR
• Sign-up Rate: $SIGNUP_RATE%

*Top Salons Viewed:*
$TOP_SALONS

*✨ ACTIVATION*
• Sign-ups: $SIGNUPS_TODAY $SIGNUPS_TREND
• First Bookings: $FIRST_BOOKINGS

*🔄 RETENTION*
• DAU: $DAU users
• WAU: $WAU users
• MAU: $MAU users
• Stickiness: $STICKINESS% (DAU/MAU)

*💰 REVENUE*
• Revenue: ₸$REVENUE_TODAY_FORMATTED $REVENUE_TREND$REVENUE_CHANGE_STR
• Bookings: $BOOKINGS_TODAY $BOOKINGS_TREND
• AOV: ₸$AOV_FORMATTED
• Conversion: $CONVERSION_RATE%

*Top Revenue Salons:*
$TOP_REVENUE_SALONS

*🎁 REFERRAL*
• Referrals Sent: $REFERRALS_SENT
• Referral Sign-ups: $REFERRAL_SIGNUPS
• Social Shares: $SOCIAL_SHARES
• NPS Score (7d): $NPS_SCORE

---
📊 View full dashboard: https://metrics.aurelle.uz"

# ==================== SEND TELEGRAM NOTIFICATION ====================

echo ""
echo -e "${BLUE}Sending Telegram notification...${NC}"

if [ -f "$TELEGRAM_SCRIPT" ]; then
    bash "$TELEGRAM_SCRIPT" "info" "Daily Report" "$MESSAGE"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Telegram notification sent"
        log "Telegram notification sent successfully"
    else
        echo -e "${RED}✗${NC} Failed to send Telegram notification"
        log "ERROR: Failed to send Telegram notification"
    fi
else
    echo -e "${YELLOW}⚠${NC} Telegram script not found: $TELEGRAM_SCRIPT"
    log "WARNING: Telegram script not found"
fi

# ==================== SAVE REPORT TO FILE ====================

REPORT_DIR="/var/backups/aurelle/reports"
mkdir -p "$REPORT_DIR"

REPORT_FILE="$REPORT_DIR/daily-report-$REPORT_DATE.txt"

cat > "$REPORT_FILE" <<EOF
AURELLE Daily Analytics Report
Date: $REPORT_DATE
Generated: $(date '+%Y-%m-%d %H:%M:%S')

================================================================================
ACQUISITION METRICS
================================================================================
Visitors (Today):           $VISITORS_TODAY
Visitors (Yesterday):       $VISITORS_YESTERDAY
Change:                     $VISITORS_CHANGE%
Sign-up Rate:               $SIGNUP_RATE%

Top Salons Viewed:
$TOP_SALONS

================================================================================
ACTIVATION METRICS
================================================================================
Sign-ups (Today):           $SIGNUPS_TODAY
Sign-ups (Yesterday):       $SIGNUPS_YESTERDAY
First Bookings (Today):     $FIRST_BOOKINGS

================================================================================
RETENTION METRICS
================================================================================
Daily Active Users (DAU):   $DAU
Weekly Active Users (WAU):  $WAU
Monthly Active Users (MAU): $MAU
Stickiness (DAU/MAU):       $STICKINESS%

================================================================================
REVENUE METRICS
================================================================================
Revenue (Today):            ₸$REVENUE_TODAY_FORMATTED
Revenue (Yesterday):        ₸$REVENUE_YESTERDAY_FORMATTED
Change:                     $REVENUE_CHANGE%

Bookings (Today):           $BOOKINGS_TODAY
Bookings (Yesterday):       $BOOKINGS_YESTERDAY

Average Order Value:        ₸$AOV_FORMATTED
Conversion Rate:            $CONVERSION_RATE%

Top Revenue Salons:
$TOP_REVENUE_SALONS

================================================================================
REFERRAL METRICS
================================================================================
Referrals Sent:             $REFERRALS_SENT
Referral Sign-ups:          $REFERRAL_SIGNUPS
Social Shares:              $SOCIAL_SHARES
NPS Score (7 days):         $NPS_SCORE

================================================================================
Dashboard: https://metrics.aurelle.uz
================================================================================
EOF

echo -e "${GREEN}✓${NC} Report saved to: $REPORT_FILE"
log "Report saved to: $REPORT_FILE"

# ==================== SUMMARY ====================

echo ""
echo "================================================================"
echo -e "${GREEN}✓ Daily Report Generated Successfully${NC}"
echo "================================================================"
echo ""
echo "Key Metrics:"
echo "  Visitors:  $VISITORS_TODAY"
echo "  Sign-ups:  $SIGNUPS_TODAY"
echo "  Bookings:  $BOOKINGS_TODAY"
echo "  Revenue:   ₸$REVENUE_TODAY_FORMATTED"
echo "  DAU:       $DAU"
echo ""
echo "Report file: $REPORT_FILE"
echo ""

log "=== Daily Report Generation Completed ==="
log ""

exit 0
