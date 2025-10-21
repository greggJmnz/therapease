#!/bin/bash

echo "🔍 Check PM2 Logs and Diagnose Issues"
echo "====================================="

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

BASE_DIR="/root/therapease/therapease"

echo ""
echo "🔍 Step 1: Check PM2 Status"
echo "============================"

# Check PM2 status
echo "PM2 status:"
pm2 status

echo ""
echo "🔍 Step 2: Check PM2 Logs for therapease-api"
echo "============================================"

# Check PM2 logs for therapease-api
echo "therapease-api logs (last 30 lines):"
pm2 logs therapease-api --lines 30

echo ""
echo "🔍 Step 3: Check PM2 Error Logs for therapease-api"
echo "=================================================="

# Check PM2 error logs for therapease-api
echo "therapease-api error logs (last 30 lines):"
pm2 logs therapease-api --err --lines 30

echo ""
echo "🔍 Step 4: Check PM2 Logs for therapease-public"
echo "================================================"

# Check PM2 logs for therapease-public
echo "therapease-public logs (last 30 lines):"
pm2 logs therapease-public --lines 30

echo ""
echo "🔍 Step 5: Check PM2 Error Logs for therapease-public"
echo "===================================================="

# Check PM2 error logs for therapease-public
echo "therapease-public error logs (last 30 lines):"
pm2 logs therapease-public --err --lines 30

echo ""
echo "🔍 Step 6: Check Log Files Directly"
echo "===================================="

# Check log files directly
echo "Checking log files directly..."

if [ -f "$BASE_DIR/logs/api-err.log" ]; then
    echo "API error log (last 20 lines):"
    tail -20 "$BASE_DIR/logs/api-err.log"
else
    print_status "WARN" "API error log not found"
fi

echo ""
if [ -f "$BASE_DIR/logs/api-out.log" ]; then
    echo "API output log (last 20 lines):"
    tail -20 "$BASE_DIR/logs/api-out.log"
else
    print_status "WARN" "API output log not found"
fi

echo ""
if [ -f "$BASE_DIR/logs/public-err.log" ]; then
    echo "Public error log (last 20 lines):"
    tail -20 "$BASE_DIR/logs/public-err.log"
else
    print_status "WARN" "Public error log not found"
fi

echo ""
if [ -f "$BASE_DIR/logs/public-out.log" ]; then
    echo "Public output log (last 20 lines):"
    tail -20 "$BASE_DIR/logs/public-out.log"
else
    print_status "WARN" "Public output log not found"
fi

echo ""
echo "🔍 Step 7: Test Direct Server Start"
echo "===================================="

# Test direct server start
echo "Testing direct server start..."
cd "$BASE_DIR/server"

echo "Current directory: $(pwd)"
echo "Node.js version: $(node --version)"

# Check if server files exist
if [ -f "index.js" ]; then
    print_status "PASS" "server/index.js exists"
else
    print_status "FAIL" "server/index.js not found"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "PASS" "server/node_modules exists"
else
    print_status "WARN" "server/node_modules not found"
fi

# Try to start server directly
echo "Starting server directly to see errors..."
timeout 15s node index.js 2>&1 || echo "Server start test completed"

cd "$BASE_DIR"

echo ""
echo "🔍 Step 8: Check Environment Variables"
echo "======================================"

# Check environment variables
echo "Environment variables:"
if [ -f "$BASE_DIR/.env" ]; then
    echo "First 10 lines of .env file:"
    head -10 "$BASE_DIR/.env"
else
    print_status "WARN" ".env file not found"
fi

echo ""
echo "🔍 Step 9: Check Port Status"
echo "============================="

# Check port status
echo "Port 5000 status:"
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

# Check all listening ports
echo ""
echo "All listening ports:"
ss -tlnp | grep -E ":(3000|3001|5000|443|80) "

echo ""
echo "🔍 Step 10: Check Process Details"
echo "================================="

# Check process details
echo "PM2 process details for therapease-api:"
pm2 show therapease-api

echo ""
echo "PM2 process details for therapease-public:"
pm2 show therapease-public

echo ""
echo "🔍 Step 11: Check System Resources"
echo "===================================="

# Check system resources
echo "System resources:"
echo "Memory usage:"
free -h

echo ""
echo "Disk usage:"
df -h

echo ""
echo "🔍 Step 12: Check Node.js and NPM Versions"
echo "==========================================="

# Check Node.js and NPM versions
echo "Node.js version:"
node --version

echo "NPM version:"
npm --version

echo ""
echo "🔍 Step 13: Check Server Dependencies"
echo "======================================"

# Check server dependencies
echo "Server dependencies:"
cd "$BASE_DIR/server"
if [ -f "package.json" ]; then
    echo "Package.json exists"
    echo "Dependencies:"
    cat package.json | grep -A 20 '"dependencies"'
else
    print_status "WARN" "Package.json not found"
fi

cd "$BASE_DIR"

echo ""
echo "🏁 PM2 Logs Check Complete!"
echo "==========================="

echo ""
echo "📋 PM2 Logs Check Summary:"
echo "- ✅ PM2 status checked"
echo "- ✅ PM2 logs examined"
echo "- ✅ PM2 error logs examined"
echo "- ✅ Log files checked directly"
echo "- ✅ Direct server start tested"
echo "- ✅ Environment variables checked"
echo "- ✅ Port status checked"
echo "- ✅ Process details examined"
echo "- ✅ System resources checked"
echo "- ✅ Node.js and NPM versions checked"
echo "- ✅ Server dependencies checked"
echo ""
echo "🔧 Next Steps:"
echo "1. Review the logs above for specific errors"
echo "2. Check if server is starting but crashing"
echo "3. Verify environment variables are set correctly"
echo "4. Check if database connection is working"
echo "5. Run security analysis: ./simplified-security-analyzer.sh"
echo ""
echo "🎯 PM2 logs check complete!";
