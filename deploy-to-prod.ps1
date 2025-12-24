# Production Deployment Script
# AURELLE Beauty Salon Marketplace
# ============================================
# IMPORTANT: Create .env.deploy file with your credentials
# Copy .env.deploy.example to .env.deploy and fill in values
# ============================================

$ErrorActionPreference = "Continue"

# Load deployment credentials from .env.deploy
$envFile = ".env.deploy"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env.deploy file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.deploy.example to .env.deploy and fill in your credentials" -ForegroundColor Yellow
    Write-Host "cp .env.deploy.example .env.deploy" -ForegroundColor White
    Write-Host "nano .env.deploy  # Fill in your server credentials" -ForegroundColor White
    exit 1
}

# Read .env.deploy file
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Server credentials from environment
$serverIP = $env:DEPLOY_SERVER_IP
$serverUser = $env:DEPLOY_SERVER_USER ?? "root"
$serverPath = $env:DEPLOY_SERVER_PATH ?? "/var/www/beauty_salon"
$projectPath = Get-Location

if (-not $serverIP) {
    Write-Host "[ERROR] DEPLOY_SERVER_IP not set in .env.deploy!" -ForegroundColor Red
    exit 1
}

$server = "${serverUser}@${serverIP}"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "AURELLE Production Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create deployment archive
Write-Host "[1/6] Creating deployment archive..." -ForegroundColor Yellow
$archiveName = "deploy-temp.tar.gz"

# Remove old archive if exists
if (Test-Path "deploy-temp.tar.gz") {
    Remove-Item "deploy-temp.tar.gz" -Force
}

# Create archive
try {
    tar -czf "deploy-temp.tar.gz" --exclude="node_modules" --exclude=".git" --exclude="venv" --exclude="__pycache__" --exclude="*.db" --exclude=".env" --exclude="dist" --exclude="*.log" . 2>&1 | Out-Null
    
    if (Test-Path "deploy-temp.tar.gz") {
        Write-Host "[OK] Archive created" -ForegroundColor Green
    } else {
        throw "Archive creation failed"
    }
} catch {
    Write-Host "[ERROR] Failed to create archive" -ForegroundColor Red
    exit 1
}

# Step 2: Upload to server
Write-Host ""
Write-Host "[2/6] Uploading files to server..." -ForegroundColor Yellow
Write-Host "Please enter SSH password when prompted" -ForegroundColor Cyan

try {
    ssh -o StrictHostKeyChecking=no $server "mkdir -p $serverPath" 2>&1 | Out-Null
    scp -o StrictHostKeyChecking=no "deploy-temp.tar.gz" "${server}:${serverPath}/deploy-temp.tar.gz" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Files uploaded" -ForegroundColor Green
    } else {
        throw "Upload failed"
    }
} catch {
    Write-Host "[ERROR] Upload failed. Please check SSH connection." -ForegroundColor Red
    Write-Host "Try: ssh $server" -ForegroundColor Yellow
    Remove-Item "deploy-temp.tar.gz" -Force -ErrorAction SilentlyContinue
    exit 1
}

# Step 3: Extract and setup on server
Write-Host ""
Write-Host "[3/6] Setting up project on server..." -ForegroundColor Yellow

$setupScript = "cd $serverPath && tar -xzf deploy-temp.tar.gz && rm deploy-temp.tar.gz && chmod +x deploy/production/deploy.sh && echo 'Setup completed'"

ssh -o StrictHostKeyChecking=no $server $setupScript 2>&1 | ForEach-Object {
    Write-Host $_ -ForegroundColor Gray
}

Write-Host "[OK] Project extracted" -ForegroundColor Green

# Step 4: Check if .env exists
Write-Host ""
Write-Host "[4/6] Checking environment configuration..." -ForegroundColor Yellow

$envExists = ssh -o StrictHostKeyChecking=no $server "test -f $serverPath/.env && echo 'YES' || echo 'NO'" 2>&1

if ($envExists -match "NO") {
    Write-Host "[WARNING] .env file not found. Creating template..." -ForegroundColor Yellow
    Write-Host ""
        $dbPassword = Read-Host "Enter database password (press Enter to use from .env.deploy)"
        
        if (-not $dbPassword) {
            $dbPassword = $env:DEPLOY_DB_PASSWORD
        }
        
        if ($dbPassword) {
            # Generate SECRET_KEY
            $secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
            
            $dbHost = $env:DEPLOY_DB_HOST ?? "localhost"
            $dbPort = $env:DEPLOY_DB_PORT ?? "5432"
            $dbName = $env:DEPLOY_DB_NAME ?? "aurelleu_aurelle_db"
            $dbUser = $env:DEPLOY_DB_USER ?? "aurelleu_aurelle_user"
            $appUrl = $env:DEPLOY_APP_URL ?? "http://$serverIP"
            $apiUrl = $env:DEPLOY_API_URL ?? "$appUrl/api"
            
            $envContent = "DATABASE_URL=postgresql://${dbUser}:$dbPassword@${dbHost}:${dbPort}/${dbName}`nSECRET_KEY=$secretKey`nCORS_ORIGINS=$appUrl`nALLOWED_HOSTS=$serverIP`nVITE_API_URL=$apiUrl`nENVIRONMENT=production`nREDIS_URL=redis://redis:6379/0`nYANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0`nVITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0`n"
        
        $envContent | Out-File -FilePath "temp-env.txt" -Encoding utf8 -NoNewline
        
        scp -o StrictHostKeyChecking=no "temp-env.txt" "${server}:${serverPath}/.env" 2>&1 | Out-Null
        Remove-Item "temp-env.txt" -Force
        
        Write-Host "[OK] .env file created" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Skipping .env creation. Please create manually:" -ForegroundColor Yellow
        Write-Host "  ssh $server" -ForegroundColor White
        Write-Host "  cd $serverPath && nano .env" -ForegroundColor White
    }
} else {
    Write-Host "[OK] .env file exists" -ForegroundColor Green
}

# Step 5: Deploy application
Write-Host ""
Write-Host "[5/6] Deploying application..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan

$deployScript = "cd $serverPath && ./deploy/production/deploy.sh"

Write-Host "Running deployment script on server..." -ForegroundColor Cyan
ssh -o StrictHostKeyChecking=no $server $deployScript 2>&1 | ForEach-Object {
    if ($_ -match "ERROR|error|failed|Failed") {
        Write-Host $_ -ForegroundColor Red
    } elseif ($_ -match "OK|SUCCESS|success|INFO") {
        Write-Host $_ -ForegroundColor Green
    } else {
        Write-Host $_ -ForegroundColor Gray
    }
}

# Step 6: Check status
Write-Host ""
Write-Host "[6/6] Checking deployment status..." -ForegroundColor Yellow

$statusScript = "cd $serverPath && docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps"

ssh -o StrictHostKeyChecking=no $server $statusScript 2>&1 | ForEach-Object {
    Write-Host $_ -ForegroundColor Gray
}

# Cleanup
Remove-Item "deploy-temp.tar.gz" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
$appUrl = $env:DEPLOY_APP_URL ?? "http://$serverIP"
$apiUrl = $env:DEPLOY_API_URL ?? "$appUrl/api"

Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: $appUrl" -ForegroundColor White
Write-Host "  API: $apiUrl" -ForegroundColor White
Write-Host "  API Docs: $apiUrl/docs" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  ssh $server" -ForegroundColor White
Write-Host "  cd $serverPath" -ForegroundColor White
Write-Host "  docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f" -ForegroundColor White
Write-Host ""
