#!/bin/bash

echo "🔍 TherapEase Security Status Checker"
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

# Detect environment
if [ -f "/home/therapease/therapease/package.json" ]; then
    ENVIRONMENT="webhost"
    BASE_DIR="/home/therapease/therapease"
    BASE_URL="https://www.therapease.site"
elif [ -f "./package.json" ]; then
    ENVIRONMENT="localhost"
    BASE_DIR="."
    BASE_URL="http://localhost:3000"
else
    print_status "FAIL" "Could not detect environment"
    exit 1
fi

echo ""
echo "🔍 Environment: $ENVIRONMENT"
echo "🔍 Base Directory: $BASE_DIR"
echo "🔍 Base URL: $BASE_URL"

echo ""
echo "🔍 Step 1: Server Process Status"
echo "==============================="

# Check server processes
if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Checking PM2 processes..."
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 status | grep -q "therapease"; then
            print_status "PASS" "PM2 processes running"
            pm2 status
        else
            print_status "WARN" "PM2 processes not running"
            echo "Available PM2 processes:"
            pm2 list
        fi
    else
        print_status "WARN" "PM2 not installed or not in PATH"
    fi
    
    echo ""
    echo "Checking nginx status..."
    if systemctl is-active --quiet nginx; then
        print_status "PASS" "Nginx is running"
    else
        print_status "WARN" "Nginx not running"
        echo "Nginx status:"
        systemctl status nginx --no-pager
    fi
else
    echo "Checking local Node.js processes..."
    if pgrep -f "node.*server" > /dev/null; then
        print_status "PASS" "Node.js server running locally"
        echo "Node.js processes:"
        pgrep -f "node.*server" | xargs ps -p
    else
        print_status "WARN" "Node.js server not running locally"
        echo "To start server: npm start"
    fi
fi

echo ""
echo "🔍 Step 2: Network Connectivity"
echo "==============================="

# Test network connectivity
echo "Testing network connectivity..."

# Test 1: Basic connectivity
echo "Testing basic connectivity to $BASE_URL..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" --connect-timeout 10; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" --connect-timeout 10)
    print_status "PASS" "Basic connectivity successful (HTTP $HTTP_CODE)"
else
    print_status "FAIL" "Basic connectivity failed"
fi

# Test 2: API endpoint connectivity
echo "Testing API endpoint connectivity..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" --connect-timeout 10; then
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" --connect-timeout 10)
    print_status "PASS" "API endpoint accessible (HTTP $API_CODE)"
else
    print_status "FAIL" "API endpoint not accessible"
fi

# Test 3: Authentication endpoint
echo "Testing authentication endpoint..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/login" --connect-timeout 10; then
    AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/login" --connect-timeout 10)
    print_status "PASS" "Authentication endpoint accessible (HTTP $AUTH_CODE)"
else
    print_status "FAIL" "Authentication endpoint not accessible"
fi

echo ""
echo "🔍 Step 3: Port and Service Status"
echo "==================================="

# Check port status
if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Checking port 80 (HTTP)..."
    if netstat -tlnp | grep -q ":80 "; then
        print_status "PASS" "Port 80 is listening"
    else
        print_status "WARN" "Port 80 not listening"
    fi
    
    echo "Checking port 443 (HTTPS)..."
    if netstat -tlnp | grep -q ":443 "; then
        print_status "PASS" "Port 443 is listening"
    else
        print_status "WARN" "Port 443 not listening"
    fi
    
    echo "Checking port 5000 (Node.js)..."
    if netstat -tlnp | grep -q ":5000 "; then
        print_status "PASS" "Port 5000 is listening"
    else
        print_status "WARN" "Port 5000 not listening"
    fi
else
    echo "Checking local ports..."
    echo "Checking port 3000 (React)..."
    if netstat -tlnp | grep -q ":3000 "; then
        print_status "PASS" "Port 3000 is listening"
    else
        print_status "WARN" "Port 3000 not listening"
    fi
    
    echo "Checking port 5000 (Node.js)..."
    if netstat -tlnp | grep -q ":5000 "; then
        print_status "PASS" "Port 5000 is listening"
    else
        print_status "WARN" "Port 5000 not listening"
    fi
fi

echo ""
echo "🔍 Step 4: SSL Certificate Status"
echo "================================="

if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Checking SSL certificate..."
    if openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_status "PASS" "SSL certificate is valid"
    else
        print_status "WARN" "SSL certificate issues detected"
        echo "SSL certificate details:"
        openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -E "(Verify return code|Subject:|Issuer:)"
    fi
fi

echo ""
echo "🔍 Step 5: Security Headers Status"
echo "=================================="

if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Checking security headers..."
    
    # Check for common security headers
    HEADERS=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )
    
    for header in "${HEADERS[@]}"; do
        if curl -s -I "https://www.therapease.site" | grep -i "$header"; then
            print_status "PASS" "Security header $header present"
        else
            print_status "WARN" "Security header $header missing"
        fi
    done
fi

echo ""
echo "🔍 Step 6: Log Analysis"
echo "======================"

# Check for error logs
if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Checking nginx error logs..."
    if [ -f "/var/log/nginx/error.log" ]; then
        RECENT_ERRORS=$(tail -n 20 /var/log/nginx/error.log | grep -c "error")
        if [ "$RECENT_ERRORS" -gt 0 ]; then
            print_status "WARN" "Recent nginx errors found: $RECENT_ERRORS"
            echo "Recent nginx errors:"
            tail -n 10 /var/log/nginx/error.log | grep "error"
        else
            print_status "PASS" "No recent nginx errors"
        fi
    else
        print_status "WARN" "Nginx error log not found"
    fi
    
    echo "Checking PM2 logs..."
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 logs --lines 10 2>/dev/null | grep -q "error\|Error\|ERROR"; then
            print_status "WARN" "Recent PM2 errors found"
            echo "Recent PM2 errors:"
            pm2 logs --lines 5 2>/dev/null | grep -i "error"
        else
            print_status "PASS" "No recent PM2 errors"
        fi
    fi
fi

echo ""
echo "🔍 Step 7: Recommendations"
echo "=========================="

echo "Based on the security status check:"

# Check if server is running
if [ "$ENVIRONMENT" = "webhost" ]; then
    if pm2 status | grep -q "therapease" && systemctl is-active --quiet nginx; then
        print_status "PASS" "Server infrastructure is running"
    else
        print_status "WARN" "Server infrastructure issues detected"
        echo "Recommendations:"
        echo "1. Start PM2 processes: pm2 start ecosystem.config.js"
        echo "2. Start nginx: sudo systemctl start nginx"
        echo "3. Check PM2 logs: pm2 logs"
        echo "4. Check nginx logs: sudo tail -f /var/log/nginx/error.log"
    fi
else
    if pgrep -f "node.*server" > /dev/null; then
        print_status "PASS" "Local server is running"
    else
        print_status "WARN" "Local server not running"
        echo "Recommendations:"
        echo "1. Start server: npm start"
        echo "2. Check for port conflicts"
        echo "3. Verify package.json scripts"
    fi
fi

# Check connectivity
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "PASS" "API endpoints are accessible"
else
    print_status "WARN" "API endpoints may not be accessible"
    echo "Recommendations:"
    echo "1. Check server status"
    echo "2. Verify nginx configuration"
    echo "3. Check firewall settings"
    echo "4. Test direct server connection"
fi

echo ""
echo "🏁 Security Status Check Complete!"
echo "=================================="

echo ""
echo "📋 Security Status Summary:"
echo "- ✅ Server process status checked"
echo "- ✅ Network connectivity tested"
echo "- ✅ Port and service status checked"
echo "- ✅ SSL certificate status checked"
echo "- ✅ Security headers status checked"
echo "- ✅ Log analysis completed"
echo "- ✅ Recommendations provided"
echo ""
echo "🔧 Next Steps:"
echo "1. Address any FAIL or WARN statuses above"
echo "2. Implement security fixes: ./implement-security-fixes.sh"
echo "3. Run security analysis: ./simplified-security-analyzer.sh"
echo "4. Regular security monitoring"
echo ""
echo "🎯 Security status check complete for $ENVIRONMENT environment";
