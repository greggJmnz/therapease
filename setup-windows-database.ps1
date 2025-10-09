# TherapEase Windows Database Setup Script
# PowerShell version for better Windows compatibility

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   TherapEase Windows Database Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📋 Creating environment configuration..." -ForegroundColor Yellow
    Copy-Item ".env-windows" ".env"
    Write-Host "✅ Environment file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Please update .env file with your database credentials before continuing" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter after updating .env file"
}

# Check MySQL connection
Write-Host "🔍 Checking MySQL connection..." -ForegroundColor Yellow
try {
    $mysqlTest = node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host: process.env.DB_HOST||'localhost', user: process.env.DB_USER||'root', password: process.env.DB_PASSWORD||'', port: process.env.DB_PORT||3306}).then(() => {console.log('✅ MySQL connection successful'); process.exit(0);}).catch(err => {console.log('❌ MySQL connection failed:', err.message); process.exit(1);});" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL connection failed"
    }
    Write-Host "✅ MySQL connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL connection failed" -ForegroundColor Red
    Write-Host "Please ensure MySQL is running and credentials are correct in .env file" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Initialize database
Write-Host "🗄️  Initializing database..." -ForegroundColor Yellow
try {
    node server/scripts/init-database.js
    if ($LASTEXITCODE -ne 0) {
        throw "Database initialization failed"
    }
    Write-Host "✅ Database initialized" -ForegroundColor Green
} catch {
    Write-Host "❌ Database initialization failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Run Windows database migration
Write-Host "🔄 Running Windows database migration..." -ForegroundColor Yellow
try {
    node server/scripts/windows-database-migration.js
    if ($LASTEXITCODE -ne 0) {
        throw "Database migration failed"
    }
    Write-Host "✅ Database migration completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Database migration failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Generate VAPID keys for push notifications
Write-Host "🔑 Generating VAPID keys for push notifications..." -ForegroundColor Yellow
try {
    node server/scripts/generate-vapid-keys.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  VAPID key generation failed (optional)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ VAPID keys generated" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  VAPID key generation failed (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Windows Database Setup Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Update your .env file with any missing credentials" -ForegroundColor White
Write-Host "  2. Run: npm run dev" -ForegroundColor White
Write-Host "  3. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor Cyan
Write-Host "  - If you get database errors, check your MySQL credentials in .env" -ForegroundColor White
Write-Host "  - If you get VAPID key errors, run: node server/scripts/generate-vapid-keys.js" -ForegroundColor White
Write-Host "  - If you get port errors, check if ports 3000 and 5000 are available" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
