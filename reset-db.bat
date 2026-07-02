@echo off
title FrameKraft — Reset Database
color 0C

echo.
echo  ==========================================
echo    FRAMEKRAFT — Database Reset
echo  ==========================================
echo.
echo  WARNING: This will DELETE all data and re-import
echo  the fresh schema + sample products.
echo.
set /p CONFIRM=Type YES to continue: 
if /I NOT "%CONFIRM%"=="YES" (
    echo  Cancelled.
    pause
    exit /b 0
)

:: Find MySQL
set MYSQL_PATH=
if exist "C:\xampp\mysql\bin\mysql.exe"  set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
if exist "C:\XAMPP\mysql\bin\mysql.exe"  set MYSQL_PATH=C:\XAMPP\mysql\bin\mysql.exe
if exist "D:\xampp\mysql\bin\mysql.exe"  set MYSQL_PATH=D:\xampp\mysql\bin\mysql.exe

if "%MYSQL_PATH%"=="" (
    echo  MySQL not found. Please reset manually via phpMyAdmin.
    pause
    exit /b 1
)

echo.
echo  Dropping and re-creating database...
"%MYSQL_PATH%" -u root -e "DROP DATABASE IF EXISTS framekraft_db; CREATE DATABASE framekraft_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
"%MYSQL_PATH%" -u root framekraft_db < database\schema.sql
echo  Schema imported.
"%MYSQL_PATH%" -u root framekraft_db < database\seed.sql
echo  Sample data imported.

echo.
echo  Re-creating admin account...
call node scripts\seedAdmin.js

echo.
echo  Database reset complete!
echo  Start the server with: start.bat
echo.
pause
