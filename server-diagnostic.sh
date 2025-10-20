#!/bin/bash

# TherapEase Server-Side Diagnostic Script
# Run this on the Droplet to diagnose 500 errors

echo "🔍 TherapEase Server-Side Diagnostic Starting..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "1. 🔧 System Information"
echo "========================"
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "User: $(whoami)"
echo "Working Directory: $(pwd)"

echo ""
echo "2. 🚀 PM2 Process Status"
echo "========================"
if command_exists pm2; then
    pm2 status
    echo ""
    echo "PM2 Logs (last 20 lines):"
    pm2 logs therapease-api --lines 20 --nostream
else
    print_status "ERROR" "PM2 not found"
fi

echo ""
echo "3. 🌐 Nginx Status"
echo "=================="
if command_exists nginx; then
    systemctl status nginx --no-pager -l
    echo ""
    echo "Nginx Configuration Test:"
    nginx -t
else
    print_status "ERROR" "Nginx not found"
fi

echo ""
echo "4. 🗄️ Database Status"
echo "===================="
if command_exists mysql; then
    echo "MySQL Service Status:"
    systemctl status mysql --no-pager -l
    echo ""
    echo "Testing database connection:"
    mysql -u root -p -e "SELECT 1 as test;" 2>/dev/null && print_status "OK" "Database connection successful" || print_status "ERROR" "Database connection failed"
else
    print_status "ERROR" "MySQL not found"
fi

echo ""
echo "5. 📁 File System Check"
echo "======================="
echo "Project directory contents:"
ls -la /home/therapease/therapease/

echo ""
echo "Frontend build files:"
ls -la /home/therapease/therapease/server/public/static/js/ 2>/dev/null || print_status "ERROR" "Frontend build files not found"

echo ""
echo "Environment file:"
if [ -f "/home/therapease/.env" ]; then
    print_status "OK" "Environment file exists"
    echo "Environment variables (sensitive data masked):"
    grep -E "^(DB_|NODE_|PORT|SSL_)" /home/therapease/.env | sed 's/=.*/=***/'
else
    print_status "ERROR" "Environment file not found"
fi

echo ""
echo "6. 🔍 API Endpoint Testing"
echo "=========================="
echo "Testing local API endpoints:"

# Test health endpoint
echo -n "Health endpoint: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health && print_status "OK" "Health endpoint responding" || print_status "ERROR" "Health endpoint failed"

echo -n "Auth test endpoint: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/test && print_status "OK" "Auth test endpoint responding" || print_status "ERROR" "Auth test endpoint failed"

echo -n "Database test endpoint: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/test-db && print_status "OK" "Database test endpoint responding" || print_status "ERROR" "Database test endpoint failed"

echo ""
echo "7. 🔐 Authentication Test"
echo "========================="
echo "Testing login endpoint:"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
    print_status "OK" "Login endpoint working"
    echo "Response: $RESPONSE_BODY"
else
    print_status "ERROR" "Login endpoint failed with HTTP $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

echo ""
echo "8. 🗄️ Database Schema Check"
echo "==========================="
echo "Checking critical tables:"

# Check if tables exist
TABLES=("users" "therapists" "patients" "notifications" "appointments" "daily_notes")
for table in "${TABLES[@]}"; do
    echo -n "Table $table: "
    mysql -u root -p -e "USE therapease_db; DESCRIBE $table;" 2>/dev/null >/dev/null && print_status "OK" "Exists" || print_status "ERROR" "Missing or inaccessible"
done

echo ""
echo "9. 🔍 Error Log Analysis"
echo "========================"
echo "Recent error patterns in PM2 logs:"
pm2 logs therapease-api --lines 50 --nostream | grep -i "error\|exception\|failed" | tail -10

echo ""
echo "10. 🎯 Recommendations"
echo "====================="

# Check for common issues
if ! pm2 list | grep -q "online"; then
    print_status "ERROR" "PM2 processes not running"
    echo "   Fix: pm2 start ecosystem.config.js"
fi

if ! systemctl is-active --quiet nginx; then
    print_status "ERROR" "Nginx not running"
    echo "   Fix: sudo systemctl start nginx"
fi

if [ ! -f "/home/therapease/.env" ]; then
    print_status "ERROR" "Environment file missing"
    echo "   Fix: Copy .env.production to /home/therapease/.env"
fi

if [ ! -d "/home/therapease/therapease/server/public/static" ]; then
    print_status "ERROR" "Frontend build files missing"
    echo "   Fix: Run 'npm run build' in client directory and copy to server/public"
fi

echo ""
echo "🔍 Diagnostic Complete!"
echo "======================"
echo "For detailed analysis, check the PM2 logs:"
echo "  pm2 logs therapease-api --lines 100"
echo ""
echo "To restart services:"
echo "  pm2 restart therapease-api"
echo "  sudo systemctl restart nginx"
echo ""
echo "To test specific endpoints:"
echo "  curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@therapease.com\",\"password\":\"SecureAdmin2024!@#$\"}'"
