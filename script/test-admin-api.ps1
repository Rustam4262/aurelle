# Admin Panel API Integration Test Script (PowerShell)
# Проверяет все endpoints админ панели

param(
    [string]$ApiBaseUrl = "http://localhost:5000",
    [string]$AdminToken = $env:ADMIN_TOKEN
)

if ([string]::IsNullOrEmpty($AdminToken)) {
    Write-Host "❌ Error: ADMIN_TOKEN not provided" -ForegroundColor Red
    Write-Host "Usage: .\test-admin-api.ps1 -AdminToken 'your_token'" -ForegroundColor Yellow
    Write-Host "Or set env var: `$env:ADMIN_TOKEN='your_token'; .\test-admin-api.ps1" -ForegroundColor Yellow
    exit 1
}

$Script:Passed = 0
$Script:Failed = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description,
        [int]$ExpectedCode = 200,
        [string]$Body = $null
    )

    Write-Host "`n" -NoNewline
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "  Endpoint: $Method $Endpoint"

    $headers = @{
        "Authorization" = "Bearer $AdminToken"
        "Content-Type" = "application/json"
    }

    $uri = "$ApiBaseUrl$Endpoint"

    try {
        if ($Body) {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -Body $Body -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -ErrorAction Stop
        }

        $statusCode = $response.StatusCode
        $content = $response.Content

        if ($statusCode -eq $ExpectedCode) {
            Write-Host "  ✅ PASS - HTTP $statusCode" -ForegroundColor Green
            try {
                $json = $content | ConvertFrom-Json | ConvertTo-Json -Compress
                Write-Host "  Response: $($json.Substring(0, [Math]::Min(100, $json.Length)))"
            } catch {
                Write-Host "  Response: $($content.Substring(0, [Math]::Min(100, $content.Length)))"
            }
            $Script:Passed++
            return $true
        } else {
            Write-Host "  ❌ FAIL - Expected HTTP $ExpectedCode, got $statusCode" -ForegroundColor Red
            Write-Host "  Response: $content"
            $Script:Failed++
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  ❌ FAIL - HTTP Error $statusCode" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)"
        $Script:Failed++
        return $false
    }
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Admin Panel API Integration Tests" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "API Base URL: $ApiBaseUrl"
Write-Host "==================================" -ForegroundColor Cyan

# Test 1: Dashboard Stats
Test-Endpoint -Method "GET" -Endpoint "/api/admin/dashboard" -Description "Get dashboard statistics"

# Test 2: Online Users
Test-Endpoint -Method "GET" -Endpoint "/api/admin/dashboard/online" -Description "Get online users count"

# Test 3: User Growth
Test-Endpoint -Method "GET" -Endpoint "/api/admin/dashboard/user-growth?days=30" -Description "Get user growth chart data"

# Test 4: Platform Health
Test-Endpoint -Method "GET" -Endpoint "/api/admin/dashboard/platform-health" -Description "Get platform health metrics"

# Test 5: Users List (Paginated)
Test-Endpoint -Method "GET" -Endpoint "/api/admin/users?page=1&pageSize=10" -Description "Get users list with pagination"

# Test 6: Users List with Filters
Test-Endpoint -Method "GET" -Endpoint "/api/admin/users?role=client&status=active" -Description "Get filtered users (clients, active)"

# Test 7: Users Search
Test-Endpoint -Method "GET" -Endpoint "/api/admin/users?search=test" -Description "Search users by keyword"

# Test 8: Activity Sessions
Test-Endpoint -Method "GET" -Endpoint "/api/admin/activity/sessions?limit=10" -Description "Get user activity sessions"

# Test 9: Activity Sessions (Active Only)
Test-Endpoint -Method "GET" -Endpoint "/api/admin/activity/sessions?activeOnly=true" -Description "Get active sessions only"

# Test 10: Online Users (Activity endpoint)
Test-Endpoint -Method "GET" -Endpoint "/api/admin/activity/online" -Description "Get currently online users"

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "⚠️  WRITE OPERATIONS TESTS" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "The following tests will modify data!"
$confirm = Read-Host "Press Enter to continue or Ctrl+C to skip"

# Test 11: Get a test user ID
Write-Host "`nFetching a test user..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $AdminToken"
    }
    $usersResponse = Invoke-RestMethod -Uri "$ApiBaseUrl/api/admin/users?page=1&pageSize=1&role=client" -Headers $headers
    $testUserId = $usersResponse.users[0].id

    if ($testUserId) {
        Write-Host "✅ Found test user: $testUserId" -ForegroundColor Green

        # Test 12: Block User
        $blockBody = @{
            reason = "Test blocking - automated test"
        } | ConvertTo-Json

        Test-Endpoint -Method "POST" -Endpoint "/api/admin/users/$testUserId/block" `
            -Description "Block user" -Body $blockBody

        Start-Sleep -Seconds 1

        # Test 13: Verify user is blocked
        Write-Host "`nVerifying user is blocked..." -ForegroundColor Yellow
        $userStatus = Invoke-RestMethod -Uri "$ApiBaseUrl/api/admin/users?search=$testUserId" -Headers $headers
        $isBlocked = $userStatus.users[0].isBlocked

        if ($isBlocked -eq $true) {
            Write-Host "  ✅ PASS - User is blocked" -ForegroundColor Green
            $Script:Passed++
        } else {
            Write-Host "  ❌ FAIL - User is not blocked (isBlocked: $isBlocked)" -ForegroundColor Red
            $Script:Failed++
        }

        Start-Sleep -Seconds 1

        # Test 14: Unblock User
        Test-Endpoint -Method "POST" -Endpoint "/api/admin/users/$testUserId/unblock" `
            -Description "Unblock user"

        Start-Sleep -Seconds 1

        # Test 15: Verify user is unblocked
        Write-Host "`nVerifying user is unblocked..." -ForegroundColor Yellow
        $userStatus = Invoke-RestMethod -Uri "$ApiBaseUrl/api/admin/users?search=$testUserId" -Headers $headers
        $isBlocked = $userStatus.users[0].isBlocked

        if ($isBlocked -eq $false) {
            Write-Host "  ✅ PASS - User is unblocked" -ForegroundColor Green
            $Script:Passed++
        } else {
            Write-Host "  ❌ FAIL - User is still blocked (isBlocked: $isBlocked)" -ForegroundColor Red
            $Script:Failed++
        }

        # Test 16: Get user activity stats
        Test-Endpoint -Method "GET" -Endpoint "/api/admin/activity/stats?userId=$testUserId" `
            -Description "Get user activity statistics"
    } else {
        Write-Host "❌ No test user found. Skipping write operations." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error fetching test user: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ Passed: $Script:Passed" -ForegroundColor Green
Write-Host "❌ Failed: $Script:Failed" -ForegroundColor Red
Write-Host "==================================" -ForegroundColor Cyan

if ($Script:Failed -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some tests failed." -ForegroundColor Red
    exit 1
}
