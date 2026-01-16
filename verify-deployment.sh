#!/bin/bash
# Post-Deployment Verification Script
# Usage: ./verify-deployment.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Post-Deployment Verification${NC}"
echo "================================="
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    local expected=$3

    echo -n "Testing $test_name... "

    local result=$(eval $test_command 2>&1)

    if [[ $result == *"$expected"* ]]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

# 1. Health Check
echo -e "${YELLOW}1. API Health Checks${NC}"
run_test "Health endpoint" "curl -s http://localhost:5000/api/health" "ok"
run_test "Feature flags endpoint" "curl -s http://localhost:5000/api/feature-flags" "ENHANCED_ANALYTICS"
echo ""

# 2. PM2 Status
echo -e "${YELLOW}2. PM2 Process Status${NC}"
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")
if [ "$PM2_STATUS" == "online" ]; then
    echo -e "PM2 Status: ${GREEN}✓ online${NC}"
    ((TESTS_PASSED++))
else
    echo -e "PM2 Status: ${RED}✗ $PM2_STATUS${NC}"
    ((TESTS_FAILED++))
fi

# Memory usage
MEMORY=$(pm2 jlist | jq -r '.[0].monit.memory' 2>/dev/null || echo "0")
MEMORY_MB=$((MEMORY / 1024 / 1024))
echo "Memory Usage: ${MEMORY_MB}MB"

# CPU usage
CPU=$(pm2 jlist | jq -r '.[0].monit.cpu' 2>/dev/null || echo "0")
echo "CPU Usage: ${CPU}%"

# Uptime
UPTIME=$(pm2 jlist | jq -r '.[0].pm2_env.pm_uptime' 2>/dev/null || echo "0")
if [ "$UPTIME" != "0" ]; then
    UPTIME_SECONDS=$(( ($(date +%s) * 1000 - $UPTIME) / 1000 ))
    echo "Uptime: ${UPTIME_SECONDS}s"
fi
echo ""

# 3. Database Connection
echo -e "${YELLOW}3. Database Connectivity${NC}"
DB_CHECK=$(psql -U postgres aurelle -t -c "SELECT COUNT(*) FROM salons;" 2>&1)
if [[ $DB_CHECK =~ ^[0-9]+$ ]]; then
    echo -e "Database connection: ${GREEN}✓ OK${NC}"
    echo "Total salons: $DB_CHECK"
    ((TESTS_PASSED++))
else
    echo -e "Database connection: ${RED}✗ FAILED${NC}"
    echo "Error: $DB_CHECK"
    ((TESTS_FAILED++))
fi
echo ""

# 4. Feature Flags Validation
echo -e "${YELLOW}4. Feature Flags Configuration${NC}"
FLAGS_JSON=$(curl -s http://localhost:5000/api/feature-flags)

check_flag() {
    local flag_name=$1
    local flag_value=$(echo $FLAGS_JSON | jq -r ".$flag_name" 2>/dev/null)

    if [ "$flag_value" == "false" ]; then
        echo -e "  $flag_name: ${GREEN}✓ false (disabled)${NC}"
        ((TESTS_PASSED++))
    elif [ "$flag_value" == "true" ]; then
        echo -e "  $flag_name: ${YELLOW}⚠ true (enabled)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "  $flag_name: ${RED}✗ invalid ($flag_value)${NC}"
        ((TESTS_FAILED++))
    fi
}

check_flag "ENHANCED_ANALYTICS"
check_flag "BOOKING_RESCHEDULE"
check_flag "MANUAL_BOOKING_CREATE"
check_flag "SALON_MANAGER_ROLE"
echo ""

# 5. API Endpoints
echo -e "${YELLOW}5. New API Endpoints${NC}"
# These should return 401 (unauthorized) not 404
run_test "Custom range analytics endpoint" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/owner/analytics/custom-range" "401"
run_test "Comparison analytics endpoint" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/owner/analytics/comparison" "401"
run_test "Master performance endpoint" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/owner/analytics/master-performance" "401"
run_test "Service performance endpoint" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/owner/analytics/service-performance" "401"
run_test "Peak hours endpoint" "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/owner/analytics/peak-hours" "401"
echo ""

# 6. Log Analysis
echo -e "${YELLOW}6. Recent Error Logs${NC}"
ERROR_COUNT=$(pm2 logs --nostream --lines 100 2>&1 | grep -i "error" | grep -v "0 error" | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "Recent errors: ${GREEN}✓ None found${NC}"
    ((TESTS_PASSED++))
else
    echo -e "Recent errors: ${RED}✗ Found $ERROR_COUNT errors${NC}"
    echo "Run 'pm2 logs --lines 100' to investigate"
    ((TESTS_FAILED++))
fi
echo ""

# 7. File Permissions
echo -e "${YELLOW}7. File Integrity${NC}"
if [ -f "server/featureFlags.ts" ]; then
    echo -e "featureFlags.ts: ${GREEN}✓ exists${NC}"
    ((TESTS_PASSED++))
else
    echo -e "featureFlags.ts: ${RED}✗ missing${NC}"
    ((TESTS_FAILED++))
fi

if [ -f "client/src/hooks/useFeatureFlag.ts" ]; then
    echo -e "useFeatureFlag.ts: ${GREEN}✓ exists${NC}"
    ((TESTS_PASSED++))
else
    echo -e "useFeatureFlag.ts: ${RED}✗ missing${NC}"
    ((TESTS_FAILED++))
fi

if [ -f "scripts/validate-i18n.ts" ]; then
    echo -e "validate-i18n.ts: ${GREEN}✓ exists${NC}"
    ((TESTS_PASSED++))
else
    echo -e "validate-i18n.ts: ${RED}✗ missing${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# 8. i18n Validation
echo -e "${YELLOW}8. i18n Structure Validation${NC}"
I18N_RESULT=$(npx tsx scripts/validate-i18n.ts 2>&1)
if [[ $I18N_RESULT == *"No critical errors"* ]]; then
    echo -e "i18n validation: ${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "i18n validation: ${RED}✗ FAIL${NC}"
    echo "Run: npx tsx scripts/validate-i18n.ts"
    ((TESTS_FAILED++))
fi
echo ""

# 9. Git Status
echo -e "${YELLOW}9. Git Repository Status${NC}"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

LATEST_COMMIT=$(git log -1 --format="%h - %s")
echo "Latest commit: $LATEST_COMMIT"

UNCOMMITTED=$(git status --porcelain | wc -l)
if [ $UNCOMMITTED -eq 0 ]; then
    echo -e "Uncommitted changes: ${GREEN}✓ None${NC}"
    ((TESTS_PASSED++))
else
    echo -e "Uncommitted changes: ${YELLOW}⚠ $UNCOMMITTED files${NC}"
    echo "Run 'git status' to review"
    ((TESTS_PASSED++))
fi
echo ""

# Final Summary
echo "================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "================================="
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo "Pass Rate: ${PASS_RATE}%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Deployment successful!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Review the output above.${NC}"
    exit 1
fi
