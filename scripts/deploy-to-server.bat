@echo off
REM Script to deploy AURELLE to production server from VS Code (Windows)
REM Usage: scripts\deploy-to-server.bat

setlocal enabledelayedexpansion

REM Configuration
set SERVER_IP=89.39.94.194
set SERVER_USER=root
set SERVER_PATH=/var/www/aurelle
set APP_NAME=aurelle-production

echo ========================================
echo   AURELLE Production Deployment
echo ========================================
echo.

REM Step 1: Check git status
echo [1/8] Checking git status...
git status --short > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not initialized or not in PATH
    pause
    exit /b 1
)

for /f %%i in ('git status --short') do set HAS_CHANGES=1

if defined HAS_CHANGES (
    echo [WARNING] You have uncommitted changes:
    git status --short
    echo.
    set /p COMMIT_CHOICE="Do you want to commit these changes? (y/n): "
    if /i "!COMMIT_CHOICE!"=="y" (
        set /p COMMIT_MSG="Enter commit message: "
        git add .
        git commit -m "!COMMIT_MSG!"
    ) else (
        echo [ERROR] Deployment cancelled. Please commit or stash your changes.
        pause
        exit /b 1
    )
)
echo [OK] Git status clean
echo.

REM Step 2: Push to GitHub
echo [2/8] Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo [ERROR] Failed to push to GitHub
    pause
    exit /b 1
)
echo [OK] Pushed to GitHub
echo.

REM Step 3: Check SSH connection
echo [3/8] Checking SSH connection to %SERVER_IP%...
ssh -o ConnectTimeout=5 -o BatchMode=yes %SERVER_USER%@%SERVER_IP% exit 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot connect to server via SSH
    echo Please ensure:
    echo   1. Server IP is correct: %SERVER_IP%
    echo   2. SSH key is configured
    echo   3. Server is accessible
    pause
    exit /b 1
)
echo [OK] SSH connection successful
echo.

REM Step 4: Setup server if needed
echo [4/8] Checking server setup...
ssh %SERVER_USER%@%SERVER_IP% "bash -s" << 'ENDSSH'
    if [ ! -d /var/www/aurelle/current ]; then
        echo "Setting up server..."

        # Install Node.js 20
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt install -y nodejs

        # Install PM2
        npm install -g pm2

        # Install PostgreSQL and Nginx
        apt install -y postgresql nginx

        # Create directory and clone
        mkdir -p /var/www/aurelle
        cd /var/www/aurelle
        git clone https://github.com/Rustam4262/aurelle.git current

        echo "Server setup complete"
    else
        echo "Project found on server"
    fi
ENDSSH
echo.

REM Step 5: Pull latest changes
echo [5/8] Pulling latest changes on server...
ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH%/current && git pull origin main"
if errorlevel 1 (
    echo [ERROR] Failed to pull changes
    pause
    exit /b 1
)
echo [OK] Latest changes pulled
echo.

REM Step 6: Install and build
echo [6/8] Installing dependencies and building...
ssh %SERVER_USER%@%SERVER_IP% "cd %SERVER_PATH%/current && npm ci --production && npm run build"
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build complete
echo.

REM Step 7: Restart application
echo [7/8] Restarting application...
ssh %SERVER_USER%@%SERVER_IP% "bash -s" << 'ENDSSH'
    if pm2 list | grep -q aurelle-production; then
        echo "Reloading application (zero-downtime)..."
        pm2 reload aurelle-production
    else
        echo "Starting application for the first time..."
        cd /var/www/aurelle/current
        pm2 start npm --name aurelle-production -- start
        pm2 save
    fi
ENDSSH
echo [OK] Application restarted
echo.

REM Step 8: Health check
echo [8/8] Running health checks...
timeout /t 3 /nobreak >nul

ssh %SERVER_USER%@%SERVER_IP% "pm2 list | grep %APP_NAME%"
echo.

echo ========================================
echo   Deployment Successful!
echo ========================================
echo.
echo Server: http://%SERVER_IP%
echo.
echo Useful commands:
echo   View logs:    ssh %SERVER_USER%@%SERVER_IP% "pm2 logs %APP_NAME%"
echo   Check status: ssh %SERVER_USER%@%SERVER_IP% "pm2 status"
echo   Restart:      ssh %SERVER_USER%@%SERVER_IP% "pm2 restart %APP_NAME%"
echo.
echo Your application is now live!
echo.
pause
