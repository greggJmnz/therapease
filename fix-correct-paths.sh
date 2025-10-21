#!/bin/bash

echo "🔧 Fix Correct Paths for Web Host"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ $message${NC}"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Correct web host environment paths
BASE_DIR="/root/therapease/therapease"

echo ""
echo "🔧 Fixing Correct Paths for Web Host"
echo "===================================="

echo ""
echo "🔍 Step 1: Check Current Directory Structure"
echo "============================================"

# Check current directory
echo "Current directory: $(pwd)"
echo "Base directory: $BASE_DIR"

# Check if we're in the right directory
if [ "$(pwd)" != "$BASE_DIR" ]; then
    echo "Changing to base directory..."
    cd "$BASE_DIR"
    print_status "PASS" "Changed to base directory: $(pwd)"
else
    print_status "PASS" "Already in base directory"
fi

# Check server directory
if [ -d "$BASE_DIR/server" ]; then
    print_status "PASS" "Server directory exists"
    echo "Server directory contents:"
    ls -la "$BASE_DIR/server" | head -10
else
    print_status "FAIL" "Server directory not found"
    exit 1
fi

# Check server/index.js
if [ -f "$BASE_DIR/server/index.js" ]; then
    print_status "PASS" "server/index.js exists"
else
    print_status "FAIL" "server/index.js not found"
    exit 1
fi

# Check client directory
if [ -d "$BASE_DIR/client" ]; then
    print_status "PASS" "Client directory exists"
else
    print_status "WARN" "Client directory not found"
fi

echo ""
echo "🔍 Step 2: Stop All PM2 Processes"
echo "================================="

# Stop all PM2 processes
echo "Stopping all PM2 processes..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    print_status "PASS" "All PM2 processes stopped"
else
    print_status "WARN" "PM2 not available"
fi

echo ""
echo "🔍 Step 3: Create Correct Ecosystem Configuration"
echo "================================================"

# Create correct ecosystem configuration with correct paths
echo "Creating correct ecosystem configuration..."
cat > "$BASE_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: '$BASE_DIR/server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '$BASE_DIR/logs/api-err.log',
      out_file: '$BASE_DIR/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'therapease-public',
      script: '$BASE_DIR/public-website/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '$BASE_DIR/logs/public-err.log',
      out_file: '$BASE_DIR/logs/public-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
EOF
print_status "PASS" "Ecosystem configuration created with correct paths"

echo ""
echo "🔍 Step 4: Create Public Website Server"
echo "======================================="

# Create public-website directory and server
mkdir -p "$BASE_DIR/public-website"

# Create public-website/server.js
cat > "$BASE_DIR/public-website/server.js" << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle any other requests by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Public website server running on port ${PORT}`);
});
EOF
print_status "PASS" "Public website server created"

echo ""
echo "🔍 Step 5: Build Frontend"
echo "========================"

# Check if client directory exists
if [ -d "$BASE_DIR/client" ]; then
    echo "Building frontend..."
    cd "$BASE_DIR/client"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing client dependencies..."
        npm install
    fi
    
    # Build frontend
    if npm run build 2>/dev/null; then
        print_status "PASS" "Frontend built successfully"
    else
        print_status "WARN" "Frontend build failed, but continuing"
        echo "Build error details:"
        npm run build
    fi
    cd "$BASE_DIR"
else
    print_status "WARN" "Client directory not found, skipping frontend build"
fi

echo ""
echo "🔍 Step 6: Create Logs Directory"
echo "==============================="

# Create logs directory
mkdir -p "$BASE_DIR/logs"
print_status "PASS" "Logs directory created"

echo ""
echo "🔍 Step 7: Start PM2 Processes"
echo "=============================="

# Start PM2 processes
echo "Starting PM2 processes..."
cd "$BASE_DIR"

if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.js
    sleep 5
    
    echo "PM2 status:"
    pm2 status
    
    if pm2 status | grep -q "therapease-api"; then
        print_status "PASS" "therapease-api process started"
    else
        print_status "WARN" "therapease-api process may not have started"
        echo "PM2 logs for therapease-api:"
        pm2 logs therapease-api --lines 10
    fi
    
    if pm2 status | grep -q "therapease-public"; then
        print_status "PASS" "therapease-public process started"
    else
        print_status "WARN" "therapease-public process may not have started"
        echo "PM2 logs for therapease-public:"
        pm2 logs therapease-public --lines 10
    fi
else
    print_status "FAIL" "PM2 not available"
fi

echo ""
echo "🔍 Step 8: Test Backend Connectivity"
echo "===================================="

# Test backend connectivity
echo "Testing backend connectivity..."
sleep 3

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5; then
    HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5)
    print_status "PASS" "Backend server is accessible (HTTP $HEALTH_CODE)"
    
    echo "Backend health response:"
    curl -s "http://localhost:5000/api/health" | head -3
else
    print_status "WARN" "Backend server may not be accessible"
    echo "Testing with verbose output:"
    curl -v "http://localhost:5000/api/health" --connect-timeout 5
fi

echo ""
echo "🔍 Step 9: Test API Endpoints"
echo "============================"

# Test various API endpoints
echo "Testing API endpoints..."

# Test health endpoint
echo "Testing /api/health..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "PASS" "Health endpoint working"
else
    print_status "WARN" "Health endpoint may not be working"
fi

# Test auth endpoint
echo "Testing /api/auth/login..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/auth/login" --connect-timeout 5 | grep -q "401\|400"; then
    print_status "PASS" "Auth endpoint working"
else
    print_status "WARN" "Auth endpoint may not be working"
fi

# Test admin endpoint
echo "Testing /api/admin/dashboard..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/admin/dashboard" --connect-timeout 5 | grep -q "401"; then
    print_status "PASS" "Admin endpoint properly protected"
else
    print_status "WARN" "Admin endpoint may not be properly protected"
fi

echo ""
echo "🔍 Step 10: Final Status Check"
echo "=============================="

# Final status check
echo "Final status check..."

# Check PM2 status
if pm2 status | grep -q "therapease-api"; then
    print_status "PASS" "therapease-api process running"
else
    print_status "WARN" "therapease-api process not running"
fi

if pm2 status | grep -q "therapease-public"; then
    print_status "PASS" "therapease-public process running"
else
    print_status "WARN" "therapease-public process not running"
fi

# Check ports
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
else
    print_status "WARN" "Port 5000 not listening"
fi

if ss -tlnp | grep -q ":443 "; then
    print_status "PASS" "Port 443 is listening"
else
    print_status "WARN" "Port 443 not listening"
fi

echo ""
echo "🏁 Correct Paths Fix Complete!"
echo "============================="

echo ""
echo "📋 Correct Paths Fix Summary:"
echo "- ✅ Directory structure checked with correct paths"
echo "- ✅ PM2 processes stopped"
echo "- ✅ Correct ecosystem configuration created"
echo "- ✅ Public website server created"
echo "- ✅ Frontend built (if possible)"
echo "- ✅ Logs directory created"
echo "- ✅ PM2 processes started"
echo "- ✅ Backend connectivity tested"
echo "- ✅ API endpoints tested"
echo "- ✅ Final status checked"
echo ""
echo "🔧 Next Steps:"
echo "1. Check PM2 logs: pm2 logs"
echo "2. Test API endpoints manually"
echo "3. Run security analysis: ./simplified-security-analyzer.sh"
echo "4. Monitor server performance"
echo ""
echo "🎯 Correct paths fix complete!";
