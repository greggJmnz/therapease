@echo off
echo ========================================
echo    TherapEase Windows Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    echo Please ensure npm is installed with Node.js
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.
echo npm version:
npm --version
echo.

REM Install dependencies
echo [1/4] Installing dependencies...
call npm run install:all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Setting up security configuration...
cd server
call npm run security:setup
if %errorlevel% neq 0 (
    echo WARNING: Security setup failed, but continuing...
)
cd ..

echo.
echo [3/4] Initializing database...
cd server
call npm run db:init
if %errorlevel% neq 0 (
    echo ERROR: Database initialization failed
    echo Please check your MySQL configuration in .env file
    pause
    exit /b 1
)
cd ..

echo.
echo [4/4] Testing SSL configuration...
cd server
call npm run security:test
if %errorlevel% neq 0 (
    echo WARNING: SSL test failed, but setup is complete
)
cd ..

echo.
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the development server: npm run dev
echo 2. Open your browser to http://localhost:3000
echo 3. For HTTPS, use https://localhost:5443
echo.
echo Default login credentials:
echo - Admin: admin@therapease.com / Admin123!@#
echo - Therapist: therapist@therapease.com / Therapist123!@#
echo - Patient: emma@example.com / Patient123!@#
echo.
echo Press any key to exit...
pause >nul
