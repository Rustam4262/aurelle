@echo off
setlocal

set "PROJECT_DIR=D:\AURELLE"
set "PG_BIN=C:\Program Files\PostgreSQL\16\bin"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "NODE_EXE_SHORT=C:\PROGRA~1\nodejs\node.exe"
set "APP_PORT=5000"
set "APP_URL=http://127.0.0.1:5000"
set "SESSION_SECRET_CURRENT=local-dev-secret-local-dev-secret-local-dev-secret-local-dev-secret"

cd /d "%PROJECT_DIR%"

echo.
echo ============================================
echo        AURELLE FULL LOCAL START
echo ============================================
echo.

if not exist "%NODE_EXE%" (
  echo [ERROR] Node.js not found: %NODE_EXE%
  pause
  exit /b 1
)

if not exist "%PG_BIN%\pg_ctl.exe" (
  echo [ERROR] PostgreSQL tools not found: %PG_BIN%
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%\node_modules" (
  echo [ERROR] node_modules not found. Run npm install first.
  pause
  exit /b 1
)

echo [1/5] Checking local PostgreSQL on 127.0.0.1:5433...
netstat -ano | findstr LISTENING | findstr :5433 >nul
if errorlevel 1 (
  echo     PostgreSQL is not running. Starting local cluster...
  "%PG_BIN%\pg_ctl.exe" -D "%PROJECT_DIR%\.pgdata" -l "%PROJECT_DIR%\.pgdata\postgres-5433.log" -o "-p 5433 -h 127.0.0.1" start
  if errorlevel 1 (
    echo [ERROR] Failed to start PostgreSQL.
    pause
    exit /b 1
  )
  timeout /t 5 >nul
) else (
  echo     PostgreSQL is already running.
)

echo [2/5] Resetting local test credentials...
"%NODE_EXE%" "%PROJECT_DIR%\scripts\reset-local-credentials.cjs"
if errorlevel 1 (
  echo [ERROR] Failed to reset local credentials.
  pause
  exit /b 1
)

echo [3/5] Building local production bundle...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo [4/5] Freeing port %APP_PORT% if needed...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr LISTENING ^| findstr :%APP_PORT%') do (
  echo     Stopping process %%P on port %APP_PORT%...
  taskkill /PID %%P /F >nul 2>&1
)
timeout /t 2 >nul

echo [5/5] Starting local AURELLE on %APP_URL% ...
start "AURELLE Local" cmd /c "cd /d %PROJECT_DIR% && set SESSION_SECRET_CURRENT=%SESSION_SECRET_CURRENT% && set APP_URL=%APP_URL% && set NODE_ENV=production && set PORT=%APP_PORT% && %NODE_EXE_SHORT% dist\index.cjs >> .codex-prod.log 2>> .codex-prod.err.log"
timeout /t 6 >nul

echo.
echo ============================================
echo AURELLE is starting locally
echo URL: %APP_URL%
echo Login page: %APP_URL%/auth
echo ============================================
echo.
echo Test accounts:
echo   Admin  - admin@aurelle.local  / Admin123!
echo   Owner  - owner@aurelle.local  / Owner123!
echo   Master - master@aurelle.local / Master123!
echo   Client - client@aurelle.local / Client123!
echo.
echo Cabinets:
echo   Admin  - %APP_URL%/admin
echo   Owner  - %APP_URL%/owner
echo   Master - %APP_URL%/master
echo   Client - %APP_URL%/auth
echo.
echo Logs:
echo   %PROJECT_DIR%\.codex-prod.log
echo   %PROJECT_DIR%\.codex-prod.err.log
echo.
echo Open in browser: %APP_URL%
pause
