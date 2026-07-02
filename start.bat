@echo off
title FrameKraft — Running
color 0A

echo.
echo  ==========================================
echo    FRAMEKRAFT SERVER STARTING...
echo  ==========================================
echo.
echo  Store:       http://localhost:3000
echo  Admin Panel: http://localhost:3000/admin/login
echo.
echo  Press Ctrl+C to stop.
echo.

:: Check .env exists
if not exist ".env" (
    echo  ERROR: .env file not found.
    echo  Please run setup.bat first!
    echo.
    pause
    exit /b 1
)

:: Check node_modules exists
if not exist "node_modules" (
    echo  node_modules not found. Running npm install...
    call npm install --loglevel=error
)

call npm run dev
pause
