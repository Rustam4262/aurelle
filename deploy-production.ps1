# ============================================
# AUTOMATIC PRODUCTION DEPLOYMENT SCRIPT
# AURELLE Beauty Salon Marketplace
# Server: 89.39.94.194
# ============================================

$ErrorActionPreference = "Stop"

# Server credentials
$serverIP = "89.39.94.194"
$serverUser = "root"
$serverPassword = "w2@nT*6D"
$serverPath = "/var/www/beauty_salon"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "AURELLE Production Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
try {
    $sshVersion = ssh -V 2>&1
    Write-Host "[OK] SSH is available" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] SSH is not available. Please install OpenSSH." -ForegroundColor Red
    exit 1
}

# Function to execute SSH command
function Invoke-SSHCommand {
    param(
        [string]$Command,
        [switch]$IgnoreErrors
    )
    
    Write-Host "[SSH] Executing: $Command" -ForegroundColor Yellow
    
    # Using plink or ssh with password (requires sshpass or key-based auth)
    # For Windows, we'll use ssh with password prompt or key-based auth
    try {
        $result = & ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$serverUser@$serverIP" $Command 2>&1
        if (-not $IgnoreErrors -and $LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] SSH command failed" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            return $false
        }
        Write-Host $result
        return $true
    } catch {
        Write-Host "[ERROR] SSH connection failed: $_" -ForegroundColor Red
        return $false
    }
}

# Step 1: Check server connection
Write-Host ""
Write-Host "[STEP 1/7] Checking server connection..." -ForegroundColor Cyan
$connected = Invoke-SSHCommand "echo 'Connection successful' && uname -a"
if (-not $connected) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "Cannot connect to server!" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Server is accessible: $serverIP" -ForegroundColor Yellow
    Write-Host "  2. SSH key is configured or password auth is enabled" -ForegroundColor Yellow
    Write-Host "  3. Firewall allows SSH connections" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can manually connect first:" -ForegroundColor Yellow
    Write-Host "  ssh $serverUser@$serverIP" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Step 2: Check/Install Docker
Write-Host ""
Write-Host "[STEP 2/7] Checking Docker installation..." -ForegroundColor Cyan
$dockerCheck = Invoke-SSHCommand "docker --version 2>&1 || echo 'DOCKER_NOT_INSTALLED'" -IgnoreErrors
if ($dockerCheck -match "DOCKER_NOT_INSTALLED") {
    Write-Host "[INFO] Docker not found, installing..." -ForegroundColor Yellow
    Invoke-SSHCommand "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh" -IgnoreErrors
    Invoke-SSHCommand "apt install docker-compose -y" -IgnoreErrors
} else {
    Write-Host "[OK] Docker is installed" -ForegroundColor Green
}

# Step 3: Create project directory
Write-Host ""
Write-Host "[STEP 3/7] Creating project directory..." -ForegroundColor Cyan
Invoke-SSHCommand "mkdir -p $serverPath && cd $serverPath && pwd" -IgnoreErrors

# Step 4: Upload project files
Write-Host ""
Write-Host "[STEP 4/7] Uploading project files..." -ForegroundColor Cyan
Write-Host "[INFO] This may take a few minutes..." -ForegroundColor Yellow

$excludeList = @(
    "node_modules",
    ".git",
    "venv",
    "__pycache__",
    "*.pyc",
    ".env",
    "dist"
)

$excludeArgs = $excludeList | ForEach-Object { "--exclude=$_" }
$rsyncArgs = "-avz", $excludeArgs, ".", "$serverUser@${serverIP}:$serverPath/"

# Try rsync first, fallback to scp
try {
    Write-Host "[INFO] Using rsync to upload files..." -ForegroundColor Yellow
    & rsync $rsyncArgs 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Files uploaded successfully" -ForegroundColor Green
    } else {
        throw "rsync failed"
    }
} catch {
    Write-Host "[WARN] rsync not available, using scp..." -ForegroundColor Yellow
    Write-Host "[INFO] This will upload all files (may take longer)..." -ForegroundColor Yellow
    
    # Create tar archive and upload
    $tarFile = "deploy-temp.tar.gz"
    Write-Host "[INFO] Creating archive..." -ForegroundColor Yellow
    
    # Use tar to create archive excluding certain directories
    & tar -czf $tarFile --exclude="node_modules" --exclude=".git" --exclude="venv" --exclude="__pycache__" . 2>&1
    
    if (Test-Path $tarFile) {
        Write-Host "[INFO] Uploading archive..." -ForegroundColor Yellow
        & scp $tarFile "$serverUser@${serverIP}:$serverPath/" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[INFO] Extracting on server..." -ForegroundColor Yellow
            Invoke-SSHCommand "cd $serverPath && tar -xzf $tarFile && rm $tarFile"
            Remove-Item $tarFile -Force
            Write-Host "[OK] Files uploaded and extracted" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Failed to upload files" -ForegroundColor Red
            Remove-Item $tarFile -Force -ErrorAction SilentlyContinue
            exit 1
        }
    } else {
        Write-Host "[ERROR] Failed to create archive" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Create .env file (need DB password)
Write-Host ""
Write-Host "[STEP 5/7] Setting up environment variables..." -ForegroundColor Cyan
Write-Host "[WARNING] You need to provide database password!" -ForegroundColor Yellow
Write-Host ""

$dbPassword = Read-Host "Enter database password for 'aurelleu_aurelle_user' (or press Enter to skip and set manually)"

if ($dbPassword) {
    # Generate SECRET_KEY
    $secretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    
    $envContent = @"
DATABASE_URL=postgresql://aurelleu_aurelle_user:$dbPassword@localhost:5432/aurelleu_aurelle_db
SECRET_KEY=$secretKey
CORS_ORIGINS=http://89.39.94.194
ALLOWED_HOSTS=89.39.94.194
VITE_API_URL=http://89.39.94.194/api
ENVIRONMENT=production
REDIS_URL=redis://redis:6379/0
YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
VITE_YANDEX_MAPS_API_KEY=99a4c9a9-dfb0-4d51-88c1-90b6e3f4c9d0
"@
    
    # Create temporary .env file and upload
    $tempEnvFile = "temp.env"
    $envContent | Out-File -FilePath $tempEnvFile -Encoding utf8 -NoNewline
    & scp $tempEnvFile "$serverUser@${serverIP}:$serverPath/.env" 2>&1
    Remove-Item $tempEnvFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] .env file created" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Failed to upload .env, please create manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] Skipping .env creation. Please create it manually on server:" -ForegroundColor Yellow
    Write-Host "  ssh $serverUser@$serverIP" -ForegroundColor White
    Write-Host "  cd $serverPath" -ForegroundColor White
    Write-Host "  nano .env" -ForegroundColor White
}

# Step 6: Deploy application
Write-Host ""
Write-Host "[STEP 6/7] Deploying application..." -ForegroundColor Cyan

$deployScript = @"
cd $serverPath
chmod +x deploy/production/deploy.sh
./deploy/production/deploy.sh
"@

Invoke-SSHCommand $deployScript -IgnoreErrors

# Step 7: Check deployment status
Write-Host ""
Write-Host "[STEP 7/7] Checking deployment status..." -ForegroundColor Cyan
Invoke-SSHCommand "cd $serverPath && docker-compose -f deploy/production/docker-compose.prod-external-db.yml ps" -IgnoreErrors

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://$serverIP" -ForegroundColor White
Write-Host "  API: http://$serverIP/api" -ForegroundColor White
Write-Host "  API Docs: http://$serverIP/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  ssh $serverUser@$serverIP" -ForegroundColor White
Write-Host "  cd $serverPath" -ForegroundColor White
Write-Host "  docker-compose -f deploy/production/docker-compose.prod-external-db.yml logs -f" -ForegroundColor White
Write-Host ""

