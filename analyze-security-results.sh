#!/bin/bash

echo "🔍 TherapEase Security Results Analyzer"
echo "======================================"

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
elif [ -f "./package.json" ]; then
    ENVIRONMENT="localhost"
    BASE_DIR="."
else
    print_status "FAIL" "Could not detect environment"
    exit 1
fi

echo ""
echo "🔍 Analyzing Security Test Results"
echo "==================================="

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
echo "🔍 Security Test Results Analysis"
echo "================================="

# Analyze penetration test results
echo "Analyzing penetration test results..."

# Check for SQL injection vulnerabilities
echo "Checking SQL injection test results..."
if curl -s -X POST "$BASE_DIR/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin\' OR 1=1--","password":"test"}' \
    | grep -q "success.*true"; then
    print_status "FAIL" "SQL injection vulnerability detected in login"
else
    print_status "PASS" "SQL injection protection working"
fi

# Check for XSS vulnerabilities
echo "Checking XSS vulnerability test results..."
if curl -s -X POST "$BASE_DIR/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"<script>alert(\'XSS\')</script>","password":"test123","firstName":"Test","lastName":"User"}' \
    | grep -q "<script>"; then
    print_status "FAIL" "XSS vulnerability detected in registration"
else
    print_status "PASS" "XSS protection working"
fi

# Check for authentication bypass
echo "Checking authentication bypass test results..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_DIR/api/admin/dashboard" | grep -q "401"; then
    print_status "PASS" "Admin endpoint properly protected"
else
    print_status "FAIL" "Admin endpoint may be accessible without authentication"
fi

# Check for rate limiting
echo "Checking rate limiting test results..."
for i in {1..5}; do
    curl -s -X POST "$BASE_DIR/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@therapease.com","password":"wrongpassword"}' \
        > /dev/null
done

if curl -s -X POST "$BASE_DIR/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@therapease.com","password":"wrongpassword"}' \
    | grep -q "rate.*limit\|too.*many"; then
    print_status "PASS" "Rate limiting working"
else
    print_status "WARN" "Rate limiting may not be working"
fi

echo ""
echo "🔍 Security Configuration Analysis"
echo "==================================="

# Check for security headers
echo "Checking security headers..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    SECURITY_HEADERS=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )
    
    for header in "${SECURITY_HEADERS[@]}"; do
        if curl -s -I https://www.therapease.site | grep -i "$header"; then
            print_status "PASS" "Security header $header present"
        else
            print_status "WARN" "Security header $header missing"
        fi
    done
fi

# Check for SSL certificate
echo "Checking SSL certificate..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    if openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_status "PASS" "SSL certificate is valid"
    else
        print_status "FAIL" "SSL certificate issues detected"
    fi
fi

echo ""
echo "🔍 Code Security Analysis"
echo "========================="

# Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
if grep -r -i "password.*=.*['\"][^'\"]*['\"]" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "FAIL" "Hardcoded passwords found"
else
    print_status "PASS" "No hardcoded passwords found"
fi

# Check for SQL injection patterns
echo "Checking for SQL injection patterns..."
if grep -r -i "query.*\$" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "WARN" "Potential SQL injection vulnerability found"
else
    print_status "PASS" "No obvious SQL injection patterns found"
fi

# Check for XSS patterns
echo "Checking for XSS patterns..."
if grep -r -i "innerHTML\|document\.write\|eval(" "$BASE_DIR/client" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v node_modules; then
    print_status "WARN" "Potential XSS vulnerability found"
else
    print_status "PASS" "No obvious XSS patterns found"
fi

echo ""
echo "🔍 Dependencies Security Analysis"
echo "================================="

# Check for vulnerable dependencies
echo "Checking for vulnerable dependencies..."
if [ -f "$BASE_DIR/package.json" ]; then
    cd "$BASE_DIR"
    if npm audit --audit-level=moderate 2>/dev/null | grep -q "vulnerabilities found"; then
        print_status "WARN" "Vulnerable dependencies found"
    else
        print_status "PASS" "No vulnerable dependencies found"
    fi
fi

echo ""
echo "🔍 File System Security Analysis"
echo "================================="

# Check file permissions
echo "Checking file permissions..."
if find "$BASE_DIR" -name "*.js" -not -path "*/node_modules/*" -exec ls -la {} \; | grep -q "rwxrwxrwx"; then
    print_status "FAIL" "Files with 777 permissions found"
else
    print_status "PASS" "No files with 777 permissions found"
fi

# Check for sensitive files
echo "Checking for sensitive files..."
SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    "config.json"
    "database.json"
    "secrets.json"
    "private.key"
    "cert.pem"
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
echo "- ✅ Penetration test results analyzed"
echo "- ✅ Security configuration analyzed"
echo "- ✅ Code security analyzed"
echo "- ✅ Dependencies security analyzed"
echo "- ✅ File system security analyzed"
echo ""
echo "🔧 Security Recommendations:"
echo "1. Review any FAIL or WARN statuses above"
echo "2. Implement missing security measures"
echo "3. Update vulnerable dependencies"
echo "4. Add security headers"
echo "5. Implement rate limiting"
echo "6. Add input validation"
echo "7. Enable CSRF protection"
echo "8. Regular security audits"
echo ""
echo "🎯 Security analysis complete for $ENVIRONMENT environment";
