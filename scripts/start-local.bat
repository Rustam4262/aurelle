@echo off
REM Script to start AURELLE platform locally on Windows
REM Author: AURELLE Development Team

echo ========================================
echo   AURELLE Platform - Local Development
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Checking Node.js version...
node --version
echo.

REM Check if npm packages are installed
if not exist "node_modules" (
    echo [2/5] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [2/5] Dependencies already installed
)
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found
    echo Please copy .env.example to .env and configure it
    pause
    exit /b 1
)

echo [3/5] Checking database connection...
echo Please make sure PostgreSQL is running and database 'aurelle' exists
echo.
timeout /t 3 /nobreak >nul

echo [4/5] Creating test users...
call npx tsx scripts/create-test-users.ts
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Failed to create test users (database might not be ready)
    echo You can create them manually later by running:
    echo   npx tsx scripts/create-test-users.ts
    echo.
)

echo [5/5] Starting development server...
echo.
echo ========================================
echo   Server will start at http://localhost:5000
echo ========================================
echo.
echo Test user credentials:
echo   Admin:        admin@aurelle.uz / password123
echo   Salon Owner:  salon1@aurelle.uz / password123
echo   Specialist:   specialist1@aurelle.uz / password123
echo   Client:       client1@aurelle.uz / password123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the development server
call npm run dev
