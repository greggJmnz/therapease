#!/bin/bash

echo "🔒 TherapEase Security Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

echo ""
echo "🔍 Step 1: Environment Detection"
echo "================================"

# Detect environment
if [ -f "/home/therapease/therapease/package.json" ]; then
    ENVIRONMENT="webhost"
    BASE_DIR="/home/therapease/therapease"
    print_status "INFO" "Detected web host environment"
elif [ -f "./package.json" ]; then
    ENVIRONMENT="localhost"
    BASE_DIR="."
    print_status "INFO" "Detected local host environment"
else
    print_status "FAIL" "Could not detect environment"
    exit 1
fi

echo ""
echo "🔍 Step 2: File System Security Tests"
echo "====================================="

# Check file permissions
echo "Checking file permissions..."
find $BASE_DIR -name "*.js" -not -path "*/node_modules/*" -exec ls -la {} \; | while read line; do
    if echo "$line" | grep -q "rwxrwxrwx"; then
        print_status "FAIL" "File with 777 permissions found: $(echo $line | awk '{print $9}')"
    elif echo "$line" | grep -q "rw-rw-rw-"; then
        print_status "WARN" "File with 666 permissions found: $(echo $line | awk '{print $9}')"
    fi
done

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
    "id_rsa"
    "id_dsa"
    "known_hosts"
    "authorized_keys"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$BASE_DIR/$file" ]; then
        if [ "$(stat -c %a "$BASE_DIR/$file" 2>/dev/null)" -gt 600 ]; then
            print_status "FAIL" "Sensitive file with insecure permissions: $file"
        else
            print_status "PASS" "Sensitive file $file has secure permissions"
        fi
    fi
done

echo ""
echo "🔍 Step 3: Environment Variables Security"
echo "========================================="

# Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
SECRET_PATTERNS=(
    "password.*=.*['\"][^'\"]*['\"]"
    "secret.*=.*['\"][^'\"]*['\"]"
    "key.*=.*['\"][^'\"]*['\"]"
    "token.*=.*['\"][^'\"]*['\"]"
    "api_key.*=.*['\"][^'\"]*['\"]"
    "jwt_secret.*=.*['\"][^'\"]*['\"]"
    "database.*password.*=.*['\"][^'\"]*['\"]"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -i "$pattern" "$BASE_DIR" --include="*.js" --include="*.json" --include="*.env*" 2>/dev/null | grep -v node_modules | grep -v ".git"; then
        print_status "FAIL" "Potential hardcoded secret found matching pattern: $pattern"
    fi
done

# Check environment file security
if [ -f "$BASE_DIR/.env" ]; then
    if [ "$(stat -c %a "$BASE_DIR/.env" 2>/dev/null)" -gt 600 ]; then
        print_status "FAIL" ".env file has insecure permissions"
    else
        print_status "PASS" ".env file has secure permissions"
    fi
fi

echo ""
echo "🔍 Step 4: Dependencies Security Scan"
echo "====================================="

# Check for vulnerable dependencies
echo "Checking for vulnerable dependencies..."
if [ -f "$BASE_DIR/package.json" ]; then
    print_status "INFO" "Running npm audit..."
    cd "$BASE_DIR"
    npm audit --audit-level=moderate 2>/dev/null || print_status "WARN" "npm audit failed or found vulnerabilities"
    
    # Check for outdated packages
    print_status "INFO" "Checking for outdated packages..."
    npm outdated 2>/dev/null || print_status "WARN" "Some packages may be outdated"
fi

echo ""
echo "🔍 Step 5: Code Security Analysis"
echo "================================="

# Check for SQL injection vulnerabilities
echo "Checking for SQL injection patterns..."
if grep -r -i "query.*\$" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "WARN" "Potential SQL injection vulnerability found"
else
    print_status "PASS" "No obvious SQL injection patterns found"
fi

# Check for XSS vulnerabilities
echo "Checking for XSS vulnerabilities..."
if grep -r -i "innerHTML\|document\.write\|eval(" "$BASE_DIR/client" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v node_modules; then
    print_status "WARN" "Potential XSS vulnerability found"
else
    print_status "PASS" "No obvious XSS patterns found"
fi

# Check for hardcoded credentials
echo "Checking for hardcoded credentials..."
if grep -r -i "password.*=.*['\"][^'\"]*['\"]" "$BASE_DIR" --include="*.js" --exclude-dir=node_modules 2>/dev/null; then
    print_status "FAIL" "Hardcoded passwords found"
else
    print_status "PASS" "No hardcoded passwords found"
fi

echo ""
echo "🔍 Step 6: Network Security Tests"
echo "================================="

# Test HTTPS configuration
echo "Testing HTTPS configuration..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    # Test SSL certificate
    if openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_status "PASS" "SSL certificate is valid"
    else
        print_status "FAIL" "SSL certificate issues detected"
    fi
    
    # Test HSTS headers
    if curl -s -I https://www.therapease.site | grep -i "strict-transport-security"; then
        print_status "PASS" "HSTS header present"
    else
        print_status "WARN" "HSTS header missing"
    fi
    
    # Test security headers
    echo "Testing security headers..."
    SECURITY_HEADERS=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Content-Security-Policy"
        "Referrer-Policy"
    )
    
    for header in "${SECURITY_HEADERS[@]}"; do
        if curl -s -I https://www.therapease.site | grep -i "$header"; then
            print_status "PASS" "Security header $header present"
        else
            print_status "WARN" "Security header $header missing"
        fi
    done
fi

echo ""
echo "🔍 Step 7: Authentication Security Tests"
echo "========================================"

# Test JWT implementation
echo "Testing JWT implementation..."
if [ -f "$BASE_DIR/server/controllers/authController.js" ]; then
    if grep -q "jwt\.sign" "$BASE_DIR/server/controllers/authController.js"; then
        print_status "PASS" "JWT signing implemented"
    else
        print_status "FAIL" "JWT signing not found"
    fi
    
    if grep -q "jwt\.verify" "$BASE_DIR/server/controllers/authController.js"; then
        print_status "PASS" "JWT verification implemented"
    else
        print_status "FAIL" "JWT verification not found"
    fi
fi

# Test password hashing
echo "Testing password hashing..."
if grep -r -i "bcrypt\|hash" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "PASS" "Password hashing implemented"
else
    print_status "FAIL" "Password hashing not found"
fi

echo ""
echo "🔍 Step 8: Database Security Tests"
echo "==================================="

# Check database connection security
echo "Checking database connection security..."
if [ -f "$BASE_DIR/server/index.js" ]; then
    if grep -q "ssl.*true" "$BASE_DIR/server/index.js"; then
        print_status "PASS" "Database SSL connection enabled"
    else
        print_status "WARN" "Database SSL connection not explicitly enabled"
    fi
fi

# Check for SQL injection protection
echo "Checking for SQL injection protection..."
if grep -r -i "prepare\|parameterized" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "PASS" "Parameterized queries found"
else
    print_status "WARN" "Parameterized queries not found"
fi

echo ""
echo "🔍 Step 9: API Security Tests"
echo "============================"

# Test API endpoints
echo "Testing API endpoints..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    # Test unauthorized access
    if curl -s -o /dev/null -w "%{http_code}" https://www.therapease.site/api/admin/dashboard | grep -q "401"; then
        print_status "PASS" "Admin endpoint requires authentication"
    else
        print_status "FAIL" "Admin endpoint may be accessible without authentication"
    fi
    
    # Test CORS configuration
    if curl -s -I https://www.therapease.site/api/health | grep -i "access-control-allow-origin"; then
        print_status "PASS" "CORS headers present"
    else
        print_status "WARN" "CORS headers not found"
    fi
fi

echo ""
echo "🔍 Step 10: Logging and Monitoring"
echo "=================================="

# Check for security logging
echo "Checking for security logging..."
if grep -r -i "log.*auth\|log.*login\|log.*security" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "PASS" "Security logging implemented"
else
    print_status "WARN" "Security logging not found"
fi

# Check for error handling
echo "Checking for error handling..."
if grep -r -i "try.*catch\|error.*handling" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "PASS" "Error handling implemented"
else
    print_status "WARN" "Error handling not found"
fi

echo ""
echo "🔍 Step 11: File Upload Security"
echo "================================"

# Check file upload security
echo "Checking file upload security..."
if [ -f "$BASE_DIR/server/middleware/uploadMiddleware.js" ]; then
    if grep -q "fileFilter\|mimetype" "$BASE_DIR/server/middleware/uploadMiddleware.js"; then
        print_status "PASS" "File upload filtering implemented"
    else
        print_status "WARN" "File upload filtering not found"
    fi
fi

echo ""
echo "🔍 Step 12: Session Security"
echo "============================="

# Check session configuration
echo "Checking session configuration..."
if grep -r -i "session.*secure\|session.*httponly" "$BASE_DIR/server" --include="*.js" 2>/dev/null | grep -v node_modules; then
    print_status "PASS" "Secure session configuration found"
else
    print_status "WARN" "Secure session configuration not found"
fi

echo ""
echo "🏁 Security Test Complete!"
echo "=========================="

echo ""
echo "📋 Security Test Summary:"
echo "- ✅ File system security checked"
echo "- ✅ Environment variables security checked"
echo "- ✅ Dependencies security scanned"
echo "- ✅ Code security analyzed"
echo "- ✅ Network security tested"
echo "- ✅ Authentication security tested"
echo "- ✅ Database security tested"
echo "- ✅ API security tested"
echo "- ✅ Logging and monitoring checked"
echo "- ✅ File upload security checked"
echo "- ✅ Session security checked"
echo ""
echo "🔧 Recommendations:"
echo "1. Review any FAIL or WARN statuses above"
echo "2. Update vulnerable dependencies"
echo "3. Implement missing security headers"
echo "4. Add security logging"
echo "5. Regular security audits"
echo ""
echo "🎯 Security test complete for $ENVIRONMENT environment";
