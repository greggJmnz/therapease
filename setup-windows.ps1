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
    
    # Check Node.js version (minimum 18.0.0)
    $versionNumber = $nodeVersion -replace 'v', ''
    $majorVersion = [int]($versionNumber.Split('.')[0])
    
    if ($majorVersion -lt 18) {
        Write-Host "ERROR: Node.js version $nodeVersion is not supported" -ForegroundColor Red
        Write-Host "Please install Node.js 18.0.0 or higher from https://nodejs.org/" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Minimum required version: Node.js 18.0.0" -ForegroundColor Yellow
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

# Run comprehensive setup
Write-Host "[1/2] Running comprehensive setup..." -ForegroundColor Yellow
try {
    npm run setup
    if ($LASTEXITCODE -ne 0) {
        throw "Setup failed"
    }
    Write-Host "Setup completed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Setup failed. Please check the error messages above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure MySQL is running and accessible" -ForegroundColor Gray
    Write-Host "2. Check your database credentials" -ForegroundColor Gray
    Write-Host "3. Ensure you have sufficient disk space" -ForegroundColor Gray
    Write-Host "4. Try running: npm run reset" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Verify setup
Write-Host "[2/2] Verifying setup..." -ForegroundColor Yellow
Write-Host "Checking if all components are ready..." -ForegroundColor Gray

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not created" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
} else {
    Write-Host "✓ .env file created" -ForegroundColor Green
}

# Check if SSL certificates exist
if (-not (Test-Path "server\certs\server.key")) {
    Write-Host "⚠ WARNING: SSL certificates not found, but setup may still work" -ForegroundColor Yellow
} else {
    Write-Host "✓ SSL certificates created" -ForegroundColor Green
}

if (-not (Test-Path "server\certs\server.crt")) {
    Write-Host "⚠ WARNING: SSL certificates not found, but setup may still work" -ForegroundColor Yellow
} else {
    Write-Host "✓ SSL certificates created" -ForegroundColor Green
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
Write-Host "Default admin credentials:" -ForegroundColor White
Write-Host "- Email: admin@therapease.com" -ForegroundColor Gray
Write-Host "- Password: SecureAdmin2024!@#$" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: Change these credentials after first login!" -ForegroundColor Yellow
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
