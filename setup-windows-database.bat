@echo off
echo ==========================================
echo   TherapEase Windows Database Setup
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if MySQL is running
echo 🔍 Checking MySQL connection...
node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host: process.env.DB_HOST||'localhost', user: process.env.DB_USER||'root', password: process.env.DB_PASSWORD||'', port: process.env.DB_PORT||3306}).then(() => {console.log('✅ MySQL connection successful'); process.exit(0);}).catch(err => {console.log('❌ MySQL connection failed:', err.message); process.exit(1);});" 2>nul
if %errorlevel% neq 0 (
    echo ❌ MySQL connection failed
    echo Please ensure MySQL is running and credentials are correct in .env file
    pause
    exit /b 1
)

echo ✅ MySQL connection successful
echo.

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📋 Copying environment configuration...
    copy .env-windows .env
    echo ✅ Environment file created
    echo.
    echo ⚠️  Please update .env file with your database credentials before continuing
    echo.
    pause
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM Initialize database
echo 🗄️  Initializing database...
node server/scripts/init-database.js
if %errorlevel% neq 0 (
    echo ❌ Database initialization failed
    pause
    exit /b 1
)

echo ✅ Database initialized
echo.

REM Run Windows database migration
echo 🔄 Running Windows database migration...
node server/scripts/windows-database-migration.js
if %errorlevel% neq 0 (
    echo ❌ Database migration failed
    pause
    exit /b 1
)

echo ✅ Database migration completed
echo.

REM Generate VAPID keys for push notifications
echo 🔑 Generating VAPID keys for push notifications...
node server/scripts/generate-vapid-keys.js
if %errorlevel% neq 0 (
    echo ⚠️  VAPID key generation failed (optional)
) else (
    echo ✅ VAPID keys generated
)

echo.
echo 🎉 Windows Database Setup Completed Successfully!
echo ==========================================
echo.
echo 📝 Next Steps:
echo   1. Update your .env file with any missing credentials
echo   2. Run: npm run dev
echo   3. Open http://localhost:3000 in your browser
echo.
echo 🔧 Troubleshooting:
echo   - If you get database errors, check your MySQL credentials in .env
echo   - If you get VAPID key errors, run: node server/scripts/generate-vapid-keys.js
echo   - If you get port errors, check if ports 3000 and 5000 are available
echo.
pause
