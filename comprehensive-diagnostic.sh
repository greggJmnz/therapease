#!/bin/bash

# Comprehensive Diagnostic Script for TherapEase Issues
echo "🔍 Comprehensive TherapEase Diagnostic Script"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DIAGNOSTIC]${NC} $1"
}

cd /home/therapease/therapease

# 1. Check PM2 Status
print_header "1. Checking PM2 Status..."
pm2 status
echo ""

# 2. Check Port Usage
print_header "2. Checking Port Usage..."
echo "Port 5000 (API):"
ss -tlnp | grep :5000 || netstat -tlnp | grep :5000 || echo "Port 5000 not in use"
echo ""
echo "Port 8080 (Public Website):"
ss -tlnp | grep :8080 || netstat -tlnp | grep :8080 || echo "Port 8080 not in use"
echo ""

# 3. Check API Routes
print_header "3. Testing API Routes..."
echo "Testing maintenance status:"
curl -s http://localhost:5000/api/maintenance-status || echo "Maintenance status failed"
echo ""
echo "Testing auth login route:"
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' || echo "Auth login route failed"
echo ""

# 4. Check Frontend Build
print_header "4. Checking Frontend Build..."
if [ -d "client/build" ]; then
    print_status "Frontend build directory exists"
    echo "Build contents:"
    ls -la client/build/ | head -10
else
    print_error "Frontend build directory missing!"
fi
echo ""

# 5. Check Server Public Directory
print_header "5. Checking Server Public Directory..."
if [ -d "server/public" ]; then
    print_status "Server public directory exists"
    echo "Public contents:"
    ls -la server/public/ | head -10
else
    print_error "Server public directory missing!"
fi
echo ""

# 6. Check Environment Variables
print_header "6. Checking Environment Variables..."
echo "API Base URL in frontend build:"
if [ -f "client/build/static/js/main.*.js" ]; then
    grep -o "REACT_APP_API_URL[^\"]*" client/build/static/js/main.*.js 2>/dev/null || echo "Not found in build"
else
    echo "Build files not found"
fi
echo ""

# 7. Check Nginx Configuration
print_header "7. Checking Nginx Configuration..."
echo "Nginx status:"
sudo systemctl status nginx --no-pager -l | head -5
echo ""
echo "Nginx sites enabled:"
ls -la /etc/nginx/sites-enabled/ | grep therapease || echo "TherapEase site not enabled"
echo ""

# 8. Check API Logs for 404 Errors
print_header "8. Checking API Logs for 404 Errors..."
echo "Recent API requests:"
pm2 logs therapease-api --lines 20 | grep -E "(POST|GET|404|auth)" || echo "No relevant logs found"
echo ""

# 9. Test Direct API Access
print_header "9. Testing Direct API Access..."
echo "Testing https://api.therapease.site/api/maintenance-status:"
curl -s https://api.therapease.site/api/maintenance-status || echo "External API failed"
echo ""
echo "Testing https://api.therapease.site/api/auth/login:"
curl -s -X POST https://api.therapease.site/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' || echo "External auth API failed"
echo ""

# 10. Check Frontend API Configuration
print_header "10. Checking Frontend API Configuration..."
echo "Current API base URL configuration:"
if [ -f "client/src/services/api.js" ]; then
    grep -A 5 "getApiBaseUrl" client/src/services/api.js
    echo ""
    echo "Auth API endpoints:"
    grep -A 10 "authAPI" client/src/services/api.js
else
    echo "API configuration file not found"
fi
echo ""

# 11. Check for Port Conflicts
print_header "11. Checking for Port Conflicts..."
echo "Processes using port 8080:"
lsof -i :8080 2>/dev/null || echo "No processes using port 8080"
echo ""
echo "Processes using port 5000:"
lsof -i :5000 2>/dev/null || echo "No processes using port 5000"
echo ""

# 12. Check Database Connection
print_header "12. Checking Database Connection..."
echo "Testing database connection:"
mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" 2>/dev/null && print_status "Database connection OK" || print_error "Database connection failed"
echo ""

# 13. Check for Missing Routes
print_header "13. Checking for Missing Routes..."
echo "Available routes in server:"
grep -r "app.use.*auth" server/ || echo "Auth routes not found"
echo ""

# 14. Check Frontend Environment
print_header "14. Checking Frontend Environment..."
if [ -f "client/.env" ]; then
    echo "Client .env file:"
    cat client/.env | grep -E "(REACT_APP|API)" || echo "No API configuration found"
else
    echo "No client .env file found"
fi
echo ""

# 15. Check Build Process
print_header "15. Checking Build Process..."
echo "Checking if frontend needs rebuilding:"
if [ "client/src/services/api.js" -nt "client/build/static/js/main.*.js" 2>/dev/null ]; then
    print_warning "Frontend source is newer than build - needs rebuilding"
else
    print_status "Frontend build appears up to date"
fi
echo ""

# 16. Summary and Recommendations
print_header "16. DIAGNOSTIC SUMMARY"
echo "========================"

# Check if the main issues are identified
if curl -s http://localhost:5000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' | grep -q "404"; then
    print_error "❌ MAIN ISSUE: /api/auth/login returns 404"
    echo "   - This means the auth routes are not properly registered"
    echo "   - Frontend is calling the wrong endpoint"
fi

if pm2 status | grep -q "errored"; then
    print_error "❌ PM2 ISSUE: Some processes are errored"
    echo "   - therapease-public is crashing due to port conflicts"
fi

if [ ! -d "client/build" ] || [ ! -d "server/public" ]; then
    print_error "❌ BUILD ISSUE: Frontend not properly built/deployed"
    echo "   - Frontend needs to be built and copied to server/public"
fi

echo ""
print_header "17. RECOMMENDED FIXES"
echo "=========================="
echo "1. Fix port conflict for therapease-public"
echo "2. Rebuild and redeploy frontend"
echo "3. Verify auth routes are properly registered"
echo "4. Test all API endpoints"
echo ""

print_status "Diagnostic complete!"
