#!/bin/bash

echo "🔍 Diagnose Backend Issues"
echo "=========================="

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
echo "🔍 Step 2: Check PM2 Logs"
echo "========================="

# Check PM2 logs for therapease-api
echo "therapease-api logs:"
pm2 logs therapease-api --lines 20

echo ""
echo "therapease-public logs:"
pm2 logs therapease-public --lines 20

echo ""
echo "🔍 Step 3: Check Port Status"
echo "============================"

# Check what's listening on port 5000
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
echo "🔍 Step 4: Check Server Files"
echo "============================="

# Check if server files exist
if [ -f "$BASE_DIR/server/index.js" ]; then
    print_status "PASS" "server/index.js exists"
else
    print_status "FAIL" "server/index.js not found"
fi

# Check server package.json
if [ -f "$BASE_DIR/server/package.json" ]; then
    print_status "PASS" "server/package.json exists"
    echo "Server dependencies:"
    cat "$BASE_DIR/server/package.json" | grep -A 20 '"dependencies"'
else
    print_status "WARN" "server/package.json not found"
fi

echo ""
echo "🔍 Step 5: Check Node.js Version"
echo "==============================="

# Check Node.js version
echo "Node.js version:"
node --version

echo ""
echo "🔍 Step 6: Test Direct Server Start"
echo "===================================="

# Try to start server directly to see errors
echo "Testing direct server start..."
cd "$BASE_DIR/server"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "PASS" "Server node_modules exists"
else
    print_status "WARN" "Server node_modules not found"
    echo "Installing server dependencies..."
    npm install
fi

# Try to start server directly
echo "Starting server directly to check for errors..."
timeout 10s node index.js 2>&1 || echo "Server start test completed"

echo ""
echo "🔍 Step 7: Check Environment Variables"
echo "====================================="

# Check if .env file exists
if [ -f "$BASE_DIR/.env" ]; then
    print_status "PASS" ".env file exists"
    echo "Environment variables (first 5 lines):"
    head -5 "$BASE_DIR/.env"
else
    print_status "WARN" ".env file not found"
fi

# Check if .env.production exists
if [ -f "$BASE_DIR/.env.production" ]; then
    print_status "PASS" ".env.production file exists"
else
    print_status "WARN" ".env.production file not found"
fi

echo ""
echo "🔍 Step 8: Check Database Connection"
echo "===================================="

# Check if database is accessible
echo "Testing database connection..."
if command -v mysql >/dev/null 2>&1; then
    echo "MySQL is available"
    # Try to connect to database (this will fail if no credentials, but shows if MySQL is running)
    mysql -e "SELECT 1;" 2>/dev/null && print_status "PASS" "Database connection successful" || print_status "WARN" "Database connection failed"
else
    print_status "WARN" "MySQL not available"
fi

echo ""
echo "🔍 Step 9: Check Nginx Status"
echo "============================="

# Check nginx status
if command -v nginx >/dev/null 2>&1; then
    echo "Nginx status:"
    systemctl status nginx --no-pager -l
else
    print_status "WARN" "Nginx not available"
fi

echo ""
echo "🔍 Step 10: Check System Resources"
echo "=================================="

# Check system resources
echo "System resources:"
echo "Memory usage:"
free -h

echo ""
echo "Disk usage:"
df -h

echo ""
echo "🔍 Step 11: Check Process Details"
echo "================================="

# Check process details
echo "PM2 process details:"
pm2 show therapease-api

echo ""
echo "🔍 Step 12: Test Alternative Ports"
echo "==================================="

# Test if server is running on different ports
echo "Testing alternative ports..."
for port in 3000 3001 5000 8000; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" --connect-timeout 2; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" --connect-timeout 2)
        print_status "PASS" "Port $port responding with HTTP $HTTP_CODE"
    else
        print_status "WARN" "Port $port not responding"
    fi
done

echo ""
echo "🏁 Backend Diagnosis Complete!"
echo "=============================="

echo ""
echo "📋 Diagnosis Summary:"
echo "- ✅ PM2 status checked"
echo "- ✅ PM2 logs examined"
echo "- ✅ Port status checked"
echo "- ✅ Server files verified"
echo "- ✅ Node.js version checked"
echo "- ✅ Direct server start tested"
echo "- ✅ Environment variables checked"
echo "- ✅ Database connection tested"
echo "- ✅ Nginx status checked"
echo "- ✅ System resources checked"
echo "- ✅ Process details examined"
echo "- ✅ Alternative ports tested"
echo ""
echo "🔧 Next Steps:"
echo "1. Review the logs above for specific errors"
echo "2. Check if server is starting but crashing"
echo "3. Verify environment variables are set correctly"
echo "4. Check if database connection is working"
echo "5. Run security analysis: ./simplified-security-analyzer.sh"
echo ""
echo "🎯 Backend diagnosis complete!";
