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
    echo Minimum required version: Node.js 18.0.0
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

REM Check Node.js version (minimum 18.0.0)
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
    echo ERROR: Node.js version %NODE_VERSION% is not supported
    echo Please install Node.js 18.0.0 or higher from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [1/2] Running comprehensive setup...
call npm run setup
if %errorlevel% neq 0 (
    echo ERROR: Setup failed. Please check the error messages above.
    echo.
    echo Troubleshooting tips:
    echo 1. Make sure MySQL is running and accessible
    echo 2. Check your database credentials
    echo 3. Ensure you have sufficient disk space
    echo 4. Try running: npm run reset
    pause
    exit /b 1
)

echo.
echo [2/2] Verifying setup...
echo Checking if all components are ready...

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not created
    pause
    exit /b 1
)

REM Check if SSL certificates exist
if not exist server\certs\server.key (
    echo WARNING: SSL certificates not found, but setup may still work
)

if not exist server\certs\server.crt (
    echo WARNING: SSL certificates not found, but setup may still work
)

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
echo Default admin credentials:
echo - Email: admin@therapease.com
echo - Password: SecureAdmin2024!@#$
echo.
echo IMPORTANT: Change these credentials after first login!
echo.
echo Press any key to exit...
pause >nul
