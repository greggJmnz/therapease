#!/bin/bash

echo "🔍 TherapEase Simplified Security Analyzer"
echo "=========================================="

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
echo "🔍 Security Test Results Analysis"
echo "================================="

# Check for security report files
echo "Looking for security report files..."
if ls security-report-*.txt 2>/dev/null; then
    print_status "PASS" "Security report files found"
    LATEST_REPORT=$(ls -t security-report-*.txt | head -1)
    print_status "INFO" "Latest report: $LATEST_REPORT"
else
    print_status "WARN" "No security report files found"
fi

echo ""
echo "🔍 Basic Security Tests"
echo "======================="

# Test 1: Check if API is accessible
echo "Testing API accessibility..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" | grep -q "200"; then
    print_status "PASS" "API is accessible"
else
    print_status "WARN" "API may not be accessible"
fi

# Test 2: Check authentication endpoint
echo "Testing authentication endpoint..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/login" | grep -q "401\|400"; then
    print_status "PASS" "Authentication endpoint responding"
else
    print_status "WARN" "Authentication endpoint may not be working"
fi

# Test 3: Check admin endpoint protection
echo "Testing admin endpoint protection..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/dashboard" | grep -q "401"; then
    print_status "PASS" "Admin endpoint properly protected"
else
    print_status "WARN" "Admin endpoint may be accessible without authentication"
fi

# Test 4: Check SSL certificate (webhost only)
if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Testing SSL certificate..."
    if openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_status "PASS" "SSL certificate is valid"
    else
        print_status "WARN" "SSL certificate issues detected"
    fi
fi

echo ""
echo "🔍 Security Headers Check"
echo "========================="

if [ "$ENVIRONMENT" = "webhost" ]; then
    echo "Checking security headers..."
    
    # Check for common security headers
    if curl -s -I https://www.therapease.site | grep -i "X-Content-Type-Options"; then
        print_status "PASS" "X-Content-Type-Options header present"
    else
        print_status "WARN" "X-Content-Type-Options header missing"
    fi
    
    if curl -s -I https://www.therapease.site | grep -i "X-Frame-Options"; then
        print_status "PASS" "X-Frame-Options header present"
    else
        print_status "WARN" "X-Frame-Options header missing"
    fi
    
    if curl -s -I https://www.therapease.site | grep -i "X-XSS-Protection"; then
        print_status "PASS" "X-XSS-Protection header present"
    else
        print_status "WARN" "X-XSS-Protection header missing"
    fi
    
    if curl -s -I https://www.therapease.site | grep -i "Strict-Transport-Security"; then
        print_status "PASS" "Strict-Transport-Security header present"
    else
        print_status "WARN" "Strict-Transport-Security header missing"
    fi
fi

echo ""
echo "🔍 Dependencies Security Check"
echo "=============================="

if [ -f "$BASE_DIR/package.json" ]; then
    echo "Checking for vulnerable dependencies..."
    cd "$BASE_DIR"
    if npm audit --audit-level=moderate 2>/dev/null | grep -q "vulnerabilities found"; then
        print_status "WARN" "Vulnerable dependencies found"
    else
        print_status "PASS" "No vulnerable dependencies found"
    fi
fi

echo ""
echo "🔍 File System Security Check"
echo "============================="

# Check for sensitive files
echo "Checking for sensitive files..."
SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "config.json"
    "database.json"
    "secrets.json"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$BASE_DIR/$file" ]; then
        if [ "$(stat -c %a "$BASE_DIR/$file" 2>/dev/null)" -gt 600 ]; then
            print_status "FAIL" "Sensitive file $file has insecure permissions"
        else
            print_status "PASS" "Sensitive file $file has secure permissions"
        fi
    fi
done

echo ""
echo "🏁 Security Analysis Complete!"
echo "============================="

echo ""
echo "📋 Security Analysis Summary:"
echo "- ✅ Basic security tests completed"
echo "- ✅ Security headers checked"
echo "- ✅ Dependencies security checked"
echo "- ✅ File system security checked"
echo ""
echo "🔧 Security Recommendations:"
echo "1. Review any FAIL or WARN statuses above"
echo "2. Implement missing security measures"
echo "3. Update vulnerable dependencies"
echo "4. Add security headers"
echo "5. Regular security audits"
echo ""
echo "🎯 Security analysis complete for $ENVIRONMENT environment";
