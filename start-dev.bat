@echo off
cd /d D:\AURELLE
echo Starting AURELLE Development Server...
echo.
call node node_modules\tsx\dist\cli.js watch server/index.ts
pause
