#!/bin/bash

# Admin Panel API Integration Test Script
# Проверяет все endpoints админ панели

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"
ADMIN_TOKEN="${ADMIN_TOKEN}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ Error: ADMIN_TOKEN environment variable not set${NC}"
  echo "Usage: ADMIN_TOKEN=your_token ./test-admin-api.sh"
  exit 1
fi

PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local expected_code=${4:-200}
  local data=$5

  echo -e "\n${YELLOW}Testing: ${description}${NC}"
  echo "  Endpoint: ${method} ${endpoint}"

  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X ${method} \
      "${API_BASE_URL}${endpoint}" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${data}")
  else
    response=$(curl -s -w "\n%{http_code}" -X ${method} \
      "${API_BASE_URL}${endpoint}" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -eq "$expected_code" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - HTTP $http_code"
    echo "  Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body | head -c 100)"
    ((PASSED++))
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC} - Expected HTTP $expected_code, got $http_code"
    echo "  Response: $body"
    ((FAILED++))
    return 1
  fi
}

echo "=================================="
echo "Admin Panel API Integration Tests"
echo "=================================="
echo "API Base URL: $API_BASE_URL"
echo "=================================="

# Test 1: Dashboard Stats
test_endpoint "GET" "/api/admin/dashboard" "Get dashboard statistics"

# Test 2: Online Users
test_endpoint "GET" "/api/admin/dashboard/online" "Get online users count"

# Test 3: User Growth
test_endpoint "GET" "/api/admin/dashboard/user-growth?days=30" "Get user growth chart data"

# Test 4: Platform Health
test_endpoint "GET" "/api/admin/dashboard/platform-health" "Get platform health metrics"

# Test 5: Users List (Paginated)
test_endpoint "GET" "/api/admin/users?page=1&pageSize=10" "Get users list with pagination"

# Test 6: Users List with Filters
test_endpoint "GET" "/api/admin/users?role=client&status=active" "Get filtered users (clients, active)"

# Test 7: Users Search
test_endpoint "GET" "/api/admin/users?search=test" "Search users by keyword"

# Test 8: Activity Sessions
test_endpoint "GET" "/api/admin/activity/sessions?limit=10" "Get user activity sessions"

# Test 9: Activity Sessions (Active Only)
test_endpoint "GET" "/api/admin/activity/sessions?activeOnly=true" "Get active sessions only"

# Test 10: Online Users (Activity endpoint)
test_endpoint "GET" "/api/admin/activity/online" "Get currently online users"

echo ""
echo "=================================="
echo "⚠️  WRITE OPERATIONS TESTS"
echo "=================================="
echo "The following tests will modify data!"
echo "Press Enter to continue or Ctrl+C to skip..."
read

# Test 11: Get a test user ID (assuming we have users)
echo -e "\n${YELLOW}Fetching a test user...${NC}"
test_user_response=$(curl -s -X GET \
  "${API_BASE_URL}/api/admin/users?page=1&pageSize=1&role=client" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

TEST_USER_ID=$(echo "$test_user_response" | jq -r '.users[0].id' 2>/dev/null)

if [ -z "$TEST_USER_ID" ] || [ "$TEST_USER_ID" == "null" ]; then
  echo -e "${RED}❌ No test user found. Skipping write operations.${NC}"
else
  echo -e "${GREEN}✅ Found test user: ${TEST_USER_ID}${NC}"

  # Test 12: Block User
  test_endpoint "POST" "/api/admin/users/${TEST_USER_ID}/block" \
    "Block user" 200 '{"reason":"Test blocking - automated test"}'

  sleep 1

  # Test 13: Verify user is blocked
  echo -e "\n${YELLOW}Verifying user is blocked...${NC}"
  user_status=$(curl -s -X GET \
    "${API_BASE_URL}/api/admin/users?search=${TEST_USER_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")

  is_blocked=$(echo "$user_status" | jq -r '.users[0].isBlocked' 2>/dev/null)

  if [ "$is_blocked" == "true" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - User is blocked"
    ((PASSED++))
  else
    echo -e "  ${RED}❌ FAIL${NC} - User is not blocked (isBlocked: $is_blocked)"
    ((FAILED++))
  fi

  sleep 1

  # Test 14: Unblock User
  test_endpoint "POST" "/api/admin/users/${TEST_USER_ID}/unblock" \
    "Unblock user" 200

  sleep 1

  # Test 15: Verify user is unblocked
  echo -e "\n${YELLOW}Verifying user is unblocked...${NC}"
  user_status=$(curl -s -X GET \
    "${API_BASE_URL}/api/admin/users?search=${TEST_USER_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")

  is_blocked=$(echo "$user_status" | jq -r '.users[0].isBlocked' 2>/dev/null)

  if [ "$is_blocked" == "false" ]; then
    echo -e "  ${GREEN}✅ PASS${NC} - User is unblocked"
    ((PASSED++))
  else
    echo -e "  ${RED}❌ FAIL${NC} - User is still blocked (isBlocked: $is_blocked)"
    ((FAILED++))
  fi

  # Test 16: Get user activity stats
  test_endpoint "GET" "/api/admin/activity/stats?userId=${TEST_USER_ID}" \
    "Get user activity statistics"
fi

# Summary
echo ""
echo "=================================="
echo "TEST SUMMARY"
echo "=================================="
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo "=================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed.${NC}"
  exit 1
fi
