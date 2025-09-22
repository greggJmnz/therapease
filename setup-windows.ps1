# TherapEase Windows PowerShell Setup Script
# Run this script in PowerShell as Administrator if needed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TherapEase Windows Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not available" -ForegroundColor Red
    Write-Host "Please ensure npm is installed with Node.js" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
try {
    npm run install:all
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Setup security
Write-Host "[2/4] Setting up security configuration..." -ForegroundColor Yellow
try {
    Set-Location server
    npm run security:setup
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Security setup failed, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "Security configuration completed" -ForegroundColor Green
    }
    Set-Location ..
} catch {
    Write-Host "WARNING: Security setup failed, but continuing..." -ForegroundColor Yellow
}

Write-Host ""

# Initialize database
Write-Host "[3/4] Initializing database..." -ForegroundColor Yellow
try {
    Set-Location server
    npm run db:init
    if ($LASTEXITCODE -ne 0) {
        throw "Database initialization failed"
    }
    Write-Host "Database initialized successfully" -ForegroundColor Green
    Set-Location ..
} catch {
    Write-Host "ERROR: Database initialization failed" -ForegroundColor Red
    Write-Host "Please check your MySQL configuration in .env file" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Test SSL
Write-Host "[4/4] Testing SSL configuration..." -ForegroundColor Yellow
try {
    Set-Location server
    npm run security:test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: SSL test failed, but setup is complete" -ForegroundColor Yellow
    } else {
        Write-Host "SSL configuration test passed" -ForegroundColor Green
    }
    Set-Location ..
} catch {
    Write-Host "WARNING: SSL test failed, but setup is complete" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Start the development server: npm run dev" -ForegroundColor Gray
Write-Host "2. Open your browser to http://localhost:3000" -ForegroundColor Gray
Write-Host "3. For HTTPS, use https://localhost:5443" -ForegroundColor Gray
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor White
Write-Host "- Admin: admin@therapease.com / Admin123!@#" -ForegroundColor Gray
Write-Host "- Therapist: therapist@therapease.com / Therapist123!@#" -ForegroundColor Gray
Write-Host "- Patient: emma@example.com / Patient123!@#" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to start the server
$startServer = Read-Host "Would you like to start the development server now? (y/N)"
if ($startServer -eq "y" -or $startServer -eq "Y" -or $startServer -eq "yes") {
    Write-Host "Starting development server..." -ForegroundColor Green
    npm run dev
} else {
    Write-Host "Setup complete. Run 'npm run dev' when ready to start." -ForegroundColor Green
    Read-Host "Press Enter to exit"
}
