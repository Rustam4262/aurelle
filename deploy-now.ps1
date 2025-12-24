# Quick deployment script
# IMPORTANT: Create .env.deploy file first!
# cp .env.deploy.example .env.deploy

# Load credentials from .env.deploy
if (Test-Path ".env.deploy") {
    Get-Content ".env.deploy" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    $serverIP = $env:DEPLOY_SERVER_IP
    $serverUser = $env:DEPLOY_SERVER_USER ?? "root"
    $path = $env:DEPLOY_SERVER_PATH ?? "/var/www/beauty_salon"
    
    if (-not $serverIP) {
        Write-Host "ERROR: DEPLOY_SERVER_IP not set in .env.deploy" -ForegroundColor Red
        exit 1
    }
    $server = "${serverUser}@${serverIP}"
} else {
    Write-Host "ERROR: .env.deploy not found!" -ForegroundColor Red
    Write-Host "Create it: cp .env.deploy.example .env.deploy" -ForegroundColor Yellow
    exit 1
}

Write-Host "AURELLE Deployment Script" -ForegroundColor Cyan
Write-Host "Server: $server" -ForegroundColor Cyan
Write-Host ""

# Check connection
Write-Host "Testing connection..." -ForegroundColor Yellow
ssh -o ConnectTimeout=5 $server "echo 'OK'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect to server!" -ForegroundColor Red
    Write-Host "Please check SSH connection first: ssh $server" -ForegroundColor Yellow
    exit 1
}

Write-Host "Connection OK!" -ForegroundColor Green
Write-Host ""

# Upload files
Write-Host "Uploading files..." -ForegroundColor Yellow
Write-Host "Please enter SSH password when prompted" -ForegroundColor Yellow

ssh $server "mkdir -p $path"

# Use tar + scp for simplicity
$tarFile = "deploy.tar.gz"
Write-Host "Creating archive..." -ForegroundColor Yellow
tar -czf $tarFile --exclude="node_modules" --exclude=".git" --exclude="venv" --exclude="__pycache__" --exclude="*.db" . 2>&1 | Out-Null

if (Test-Path $tarFile) {
    Write-Host "Uploading archive..." -ForegroundColor Yellow
    scp $tarFile "$server`:$path/" 2>&1
    
    Write-Host "Extracting on server..." -ForegroundColor Yellow
    ssh $server "cd $path && tar -xzf deploy.tar.gz && rm deploy.tar.gz && chmod +x deploy/production/deploy.sh"
    
    Remove-Item $tarFile -Force
    Write-Host "Files uploaded!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create archive" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Connect to server: ssh $server" -ForegroundColor White
Write-Host "2. Create .env file: cd $path && nano .env" -ForegroundColor White
Write-Host "3. Run deploy: cd $path && ./deploy/production/deploy.sh" -ForegroundColor White
Write-Host ""
Write-Host "See README_DEPLOY.md for details" -ForegroundColor Yellow

