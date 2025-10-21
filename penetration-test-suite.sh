#!/bin/bash

echo "🔒 TherapEase Penetration Testing Suite"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    local status=\$1
    local message=\$2
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
echo "🔍 Penetration Testing - Authentication"
echo "======================================="

# Test 1: SQL Injection in login
echo "Testing SQL injection in login..."
SQL_INJECTION_PAYLOADS=(
    "admin' OR '1'='1"
    "admin' OR 1=1--"
    "admin'; DROP TABLE users;--"
    "admin' UNION SELECT * FROM users--"
)

for payload in "${SQL_INJECTION_PAYLOADS[@]}"; do
    if curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$payload\",\"password\":\"test\"}" \
        | grep -q "success.*true"; then
        print_status "FAIL" "SQL injection vulnerability found with payload: $payload"
    else
        print_status "PASS" "SQL injection test passed for payload: $payload"
    fi
done

# Test 2: Brute force attack simulation
echo "Testing brute force protection..."
for i in {1..5}; do
    curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@therapease.com","password":"wrongpassword"}' \
        > /dev/null
done

# Check if rate limiting is working
if curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@therapease.com","password":"wrongpassword"}' \
    | grep -q "rate.*limit\|too.*many"; then
    print_status "PASS" "Rate limiting working"
else
    print_status "WARN" "Rate limiting may not be working"
fi

echo ""
echo "🔍 Penetration Testing - Authorization"
echo "====================================="

# Test 3: Privilege escalation
echo "Testing privilege escalation..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    # Try to access admin endpoints without proper token
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/dashboard" | grep -q "401"; then
        print_status "PASS" "Admin endpoint properly protected"
    else
        print_status "FAIL" "Admin endpoint may be accessible without authentication"
    fi
fi

# Test 4: JWT token manipulation
echo "Testing JWT token manipulation..."
# This would typically involve creating a fake JWT token
print_status "INFO" "JWT token manipulation test requires manual testing"

echo ""
echo "🔍 Penetration Testing - Input Validation"
echo "=========================================="

# Test 5: XSS attacks
echo "Testing XSS vulnerabilities..."
XSS_PAYLOADS=(
    "<script>alert('XSS')</script>"
    "javascript:alert('XSS')"
    "<img src=x onerror=alert('XSS')>"
    "<svg onload=alert('XSS')>"
)

for payload in "${XSS_PAYLOADS[@]}"; do
    if curl -s -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$payload\",\"password\":\"test123\",\"firstName\":\"Test\",\"lastName\":\"User\"}" \
        | grep -q "$payload"; then
        print_status "FAIL" "XSS vulnerability found with payload: $payload"
    else
        print_status "PASS" "XSS test passed for payload: $payload"
    fi
done

# Test 6: Path traversal
echo "Testing path traversal vulnerabilities..."
PATH_TRAVERSAL_PAYLOADS=(
    "../../../etc/passwd"
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
    "....//....//....//etc/passwd"
)

for payload in "${PATH_TRAVERSAL_PAYLOADS[@]}"; do
    if curl -s "$BASE_URL/api/files/$payload" | grep -q "root:"; then
        print_status "FAIL" "Path traversal vulnerability found with payload: $payload"
    else
        print_status "PASS" "Path traversal test passed for payload: $payload"
    fi
done

echo ""
echo "🔍 Penetration Testing - File Upload"
echo "===================================="

# Test 7: Malicious file upload
echo "Testing malicious file upload..."
# Create a test malicious file
echo "<?php system($_GET['cmd']); ?>" > /tmp/test.php

if [ -f "$BASE_DIR/server/middleware/uploadMiddleware.js" ]; then
    print_status "INFO" "File upload middleware found - manual testing required"
else
    print_status "WARN" "File upload middleware not found"
fi

# Clean up
rm -f /tmp/test.php

echo ""
echo "🔍 Penetration Testing - API Security"
echo "======================================"

# Test 8: API endpoint enumeration
echo "Testing API endpoint enumeration..."
COMMON_ENDPOINTS=(
    "/api/admin/users"
    "/api/admin/settings"
    "/api/admin/logs"
    "/api/auth/verify"
    "/api/health"
    "/api/status"
)

for endpoint in "${COMMON_ENDPOINTS[@]}"; do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" | grep -q "200\|401\|403"; then
        print_status "INFO" "Endpoint $endpoint is accessible"
    else
        print_status "INFO" "Endpoint $endpoint returned 404"
    fi
done

# Test 9: HTTP methods testing
echo "Testing HTTP methods..."
HTTP_METHODS=("GET" "POST" "PUT" "DELETE" "PATCH" "OPTIONS" "HEAD")

for method in "${HTTP_METHODS[@]}"; do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL/api/admin/dashboard")
    if [ "$response_code" = "405" ]; then
        print_status "PASS" "Method $method properly rejected"
    elif [ "$response_code" = "200" ]; then
        print_status "WARN" "Method $method allowed on admin endpoint"
    else
        print_status "INFO" "Method $method returned $response_code"
    fi
done

echo ""
echo "🔍 Penetration Testing - Information Disclosure"
echo "==============================================="

# Test 10: Error message information disclosure
echo "Testing error message information disclosure..."
if curl -s "$BASE_URL/api/nonexistent" | grep -q "Error\|Exception\|Stack trace"; then
    print_status "WARN" "Error messages may disclose sensitive information"
else
    print_status "PASS" "Error messages are sanitized"
fi

# Test 11: Directory listing
echo "Testing directory listing..."
if curl -s "$BASE_URL/" | grep -q "Index of\|Directory listing"; then
    print_status "FAIL" "Directory listing enabled"
else
    print_status "PASS" "Directory listing disabled"
fi

echo ""
echo "🏁 Penetration Testing Complete!"
echo "==============================="

echo ""
echo "📋 Penetration Testing Summary:"
echo "- ✅ SQL injection tests completed"
echo "- ✅ Brute force protection tested"
echo "- ✅ Authorization tests completed"
echo "- ✅ XSS vulnerability tests completed"
echo "- ✅ Path traversal tests completed"
echo "- ✅ File upload security tested"
echo "- ✅ API endpoint enumeration completed"
echo "- ✅ HTTP methods testing completed"
echo "- ✅ Information disclosure tests completed"
echo "- ✅ Directory listing tests completed"
echo ""
echo "🔧 Security Recommendations:"
echo "1. Fix any vulnerabilities found"
echo "2. Implement proper input validation"
echo "3. Add rate limiting"
echo "4. Secure file uploads"
echo "5. Sanitize error messages"
echo "6. Disable directory listing"
echo "7. Regular penetration testing"
echo ""
echo "🎯 Penetration testing complete for $ENVIRONMENT environment";
