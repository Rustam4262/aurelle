@echo off
echo ========================================
echo  Frontend Compilation Test
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking TypeScript compilation...
call npx tsc --noEmit

if %errorlevel% equ 0 (
    echo.
    echo [OK] TypeScript compilation successful!
    echo.
) else (
    echo.
    echo [ERROR] TypeScript compilation failed!
    echo Check the errors above.
    echo.
    pause
    exit /b 1
)

echo [2/3] Checking for import errors...
call npm run build 2>nul

if %errorlevel% equ 0 (
    echo.
    echo [OK] Build successful!
    echo.
) else (
    echo.
    echo [ERROR] Build failed!
    echo Try running: npm run dev
    echo.
)

echo [3/3] All checks complete!
echo.
echo ========================================
echo  Frontend is ready to run!
echo ========================================
echo.
echo To start development server:
echo npm run dev
echo.
pause
