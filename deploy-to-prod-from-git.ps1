# ============================================
# DEPLOY FROM GITHUB TO PRODUCTION SERVER
# AURELLE - Beauty Salon Marketplace
# ============================================

$ErrorActionPreference = "Continue"

# Load deployment credentials from .env.deploy (if exists)
$envFile = ".env.deploy"
if (Test-Path $envFile) {
    Write-Host "[INFO] Loading credentials from .env.deploy..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    
    $serverIP = $env:DEPLOY_SERVER_IP
    if ($env:DEPLOY_SERVER_USER) {
        $serverUser = $env:DEPLOY_SERVER_USER
    } else {
        $serverUser = "root"
    }
    if ($env:DEPLOY_SERVER_PATH) {
        $serverPath = $env:DEPLOY_SERVER_PATH
    } else {
        $serverPath = "/var/www/beauty_salon"
    }
    
    if (-not $serverIP) {
        Write-Host "[ERROR] DEPLOY_SERVER_IP not set in .env.deploy!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please create .env.deploy file:" -ForegroundColor Yellow
        Write-Host "  1. Copy .env.deploy.example to .env.deploy" -ForegroundColor White
        Write-Host "  2. Fill in your server credentials" -ForegroundColor White
        Write-Host "  3. Run this script again" -ForegroundColor White
        exit 1
    }
    
    $server = "${serverUser}@${serverIP}"
} else {
    Write-Host "[WARNING] .env.deploy file not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please provide server connection details:" -ForegroundColor Cyan
    $serverIP = Read-Host "Server IP address"
    $serverUserInput = Read-Host "SSH username (press Enter for root)"
    if ([string]::IsNullOrWhiteSpace($serverUserInput)) {
        $serverUser = "root"
    } else {
        $serverUser = $serverUserInput
    }
    $serverPathInput = Read-Host "Project path (press Enter for /var/www/beauty_salon)"
    if ([string]::IsNullOrWhiteSpace($serverPathInput)) {
        $serverPath = "/var/www/beauty_salon"
    } else {
        $serverPath = $serverPathInput
    }
    
    $server = "${serverUser}@${serverIP}"
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploying from GitHub to Production" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: $server" -ForegroundColor Yellow
Write-Host "Path: $serverPath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Test connection
Write-Host "[1/3] Testing SSH connection..." -ForegroundColor Cyan
try {
    $testResult = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $server "echo ConnectionOK" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Connection successful" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "[ERROR] Cannot connect to server!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Server is accessible: $serverIP" -ForegroundColor White
    Write-Host "  2. SSH key is configured or password auth is enabled" -ForegroundColor White
    Write-Host "  3. Try manually: ssh $server" -ForegroundColor White
    exit 1
}
Write-Host ""

# Step 2: Make update script executable
Write-Host "[2/3] Preparing update script on server..." -ForegroundColor Cyan
$makeExecutableCmd = "cd $serverPath && chmod +x deploy/production/update-from-git.sh"
ssh -o StrictHostKeyChecking=no $server $makeExecutableCmd 2>&1 | Out-Null
Write-Host "[OK] Script prepared" -ForegroundColor Green
Write-Host ""

# Step 3: Run update script
Write-Host "[3/3] Running update from GitHub on server..." -ForegroundColor Cyan
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Write-Host ""

$updateCmd = "cd $serverPath && ./deploy/production/update-from-git.sh"

$deploySuccess = $false
ssh -o StrictHostKeyChecking=no $server $updateCmd 2>&1 | ForEach-Object {
    $line = $_
    if ($line -match "ERROR|error|Failed|failed") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "WARN|Warning|warning") {
        Write-Host $line -ForegroundColor Yellow
    } elseif ($line -match "INFO|Info|info|OK|SUCCESS") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "STEP|Step|step") {
        Write-Host $line -ForegroundColor Cyan
    } else {
        Write-Host $line -ForegroundColor Gray
    }
    if ($line -match "Update completed successfully") {
        $deploySuccess = $true
    }
}

Write-Host ""
if ($deploySuccess -or $LASTEXITCODE -eq 0) {
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Deployment completed successfully!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your changes from GitHub are now live on production!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To view logs on server:" -ForegroundColor Yellow
    Write-Host "  ssh $server" -ForegroundColor White
    Write-Host "  cd $serverPath" -ForegroundColor White
    Write-Host "  docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    Write-Host "You can SSH to the server and check logs manually:" -ForegroundColor Yellow
    Write-Host "  ssh $server" -ForegroundColor White
    Write-Host "  cd $serverPath" -ForegroundColor White
    Write-Host "  docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs" -ForegroundColor White
    Write-Host ""
    exit 1
}
