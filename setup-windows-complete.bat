@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   TherapEase Complete Windows Setup
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Not running as administrator
    echo Some operations may require elevated privileges
    echo.
)

REM Check if Node.js is installed
echo [1/6] Checking prerequisites...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Minimum required version: Node.js 18.0.0
    echo.
    echo After installation, restart your command prompt and try again.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
    echo ERROR: Node.js version %NODE_VERSION% is not supported
    echo Please install Node.js 18.0.0 or higher from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js %NODE_VERSION% detected

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    echo Please ensure npm is installed with Node.js
    pause
    exit /b 1
)

for /f %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION% detected

REM Check if MySQL is available (optional check)
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ WARNING: MySQL command line client not found in PATH
    echo Make sure MySQL is installed and running
    echo You can download MySQL from https://dev.mysql.com/downloads/
) else (
    echo ✓ MySQL detected
)

echo.

REM Check if Git is available
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ WARNING: Git not found in PATH
    echo Git is recommended for version control
    echo You can download Git from https://git-scm.com/
) else (
    echo ✓ Git detected
)

echo.

REM Check if OpenSSL is available
openssl version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ WARNING: OpenSSL not found in PATH
    echo SSL certificates may not be generated automatically
    echo You can install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html
) else (
    echo ✓ OpenSSL detected
)

echo.

REM Check available disk space
echo [2/6] Checking system requirements...
for /f "tokens=3" %%a in ('dir /-c %SystemDrive%\ ^| find "bytes free"') do set FREE_SPACE=%%a
set /a FREE_SPACE_GB=%FREE_SPACE% / 1073741824
if %FREE_SPACE_GB% LSS 2 (
    echo ⚠ WARNING: Low disk space detected (%FREE_SPACE_GB% GB free)
    echo At least 2 GB free space is recommended
) else (
    echo ✓ Sufficient disk space available (%FREE_SPACE_GB% GB free)
)

echo.

REM Check if we're in the right directory
if not exist package.json (
    echo ERROR: package.json not found
    echo Please run this script from the TherapEase project root directory
    pause
    exit /b 1
)

echo ✓ Project directory confirmed

echo.

REM Clean previous installations if requested
echo [3/6] Preparing environment...
set /p CLEAN_INSTALL="Do you want to clean previous installations? (y/N): "
if /i "%CLEAN_INSTALL%"=="y" (
    echo Cleaning previous installations...
    if exist node_modules rmdir /s /q node_modules
    if exist server\node_modules rmdir /s /q server\node_modules
    if exist client\node_modules rmdir /s /q client\node_modules
    if exist .env del .env
    echo ✓ Previous installations cleaned
) else (
    echo ✓ Keeping existing installations
)

echo.

REM Install dependencies
echo [4/6] Installing dependencies...
echo This may take several minutes...
call npm run install:all
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    echo.
    echo Troubleshooting tips:
    echo 1. Check your internet connection
    echo 2. Try running: npm cache clean --force
    echo 3. Delete node_modules folders and try again
    echo 4. Check if antivirus is blocking npm
    pause
    exit /b 1
)

echo ✓ Dependencies installed successfully

echo.

REM Run comprehensive setup
echo [5/6] Running comprehensive setup...
echo This will configure the database, security, and all services...
call npm run setup
if %errorlevel% neq 0 (
    echo ERROR: Setup failed. Please check the error messages above.
    echo.
    echo Common issues and solutions:
    echo 1. MySQL not running: Start MySQL service
    echo 2. Database connection failed: Check credentials in .env
    echo 3. Permission denied: Run as administrator
    echo 4. Port already in use: Kill processes on ports 3000, 5000, 5443
    echo.
    echo Try running: npm run reset
    pause
    exit /b 1
)

echo ✓ Setup completed successfully

echo.

REM Verify installation
echo [6/6] Verifying installation...

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not created
    pause
    exit /b 1
) else (
    echo ✓ .env file created
)

REM Check if SSL certificates exist
if exist server\certs\server.key (
    echo ✓ SSL private key created
) else (
    echo ⚠ SSL private key not found
)

if exist server\certs\server.crt (
    echo ✓ SSL certificate created
) else (
    echo ⚠ SSL certificate not found
)

REM Check if database connection works
echo Testing database connection...
cd server
node -e "require('./config/database').pool.getConnection().then(() => { console.log('✓ Database connection successful'); process.exit(0); }).catch(() => { console.log('⚠ Database connection failed'); process.exit(1); })" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ Database connection test failed
) else (
    echo ✓ Database connection successful
)
cd ..

echo.

REM Final summary
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Your TherapEase application is ready!
echo.
echo Access URLs:
echo - Client: http://localhost:3000
echo - Server: http://localhost:5000
echo - HTTPS:  https://localhost:5443
echo.
echo Default admin credentials:
echo - Email: admin@therapease.com
echo - Password: SecureAdmin2024!@#$
echo.
echo IMPORTANT: Change these credentials after first login!
echo.

REM Ask if user wants to start the server
set /p START_SERVER="Would you like to start the development server now? (y/N): "
if /i "%START_SERVER%"=="y" (
    echo.
    echo Starting development server...
    echo Press Ctrl+C to stop the server
    echo.
    call npm run dev
) else (
    echo.
    echo Setup complete! Run 'npm run dev' when ready to start.
    echo.
    echo Useful commands:
    echo - npm run dev     : Start development server
    echo - npm run build   : Build for production
    echo - npm run reset   : Clean install and setup
    echo - npm run clean   : Clean all node_modules
    echo.
    pause
)

endlocal
