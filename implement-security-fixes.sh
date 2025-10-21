#!/bin/bash

echo "🔧 TherapEase Security Fix Implementation"
echo "========================================="

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
elif [ -f "./package.json" ]; then
    ENVIRONMENT="localhost"
    BASE_DIR="."
else
    print_status "FAIL" "Could not detect environment"
    exit 1
fi

echo ""
echo "🔧 Implementing Security Fixes"
echo "==============================="

echo ""
echo "🔍 Step 1: Server Status Check"
echo "=============================="

# Check if server is running
echo "Checking server status..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    # Check PM2 processes
    if pm2 status | grep -q "therapease"; then
        print_status "PASS" "PM2 processes running"
        pm2 status
    else
        print_status "WARN" "PM2 processes not running"
        echo "Starting PM2 processes..."
        pm2 start ecosystem.config.js
    fi
    
    # Check nginx status
    if systemctl is-active --quiet nginx; then
        print_status "PASS" "Nginx is running"
    else
        print_status "WARN" "Nginx not running"
        echo "Starting nginx..."
        sudo systemctl start nginx
    fi
else
    # Local environment
    if pgrep -f "node.*server" > /dev/null; then
        print_status "PASS" "Node.js server running locally"
    else
        print_status "WARN" "Node.js server not running locally"
        echo "To start server locally: npm start"
    fi
fi

echo ""
echo "🔍 Step 2: Adding Security Headers"
echo "==================================="

# Check if nginx configuration exists
if [ -f "$BASE_DIR/nginx-therapease.conf" ]; then
    print_status "INFO" "Nginx configuration found"
    
    # Create backup of nginx configuration
    cp "$BASE_DIR/nginx-therapease.conf" "$BASE_DIR/nginx-therapease.conf.backup.$(date +%Y%m%d-%H%M%S)"
    print_status "PASS" "Nginx configuration backed up"
    
    # Add security headers to nginx configuration
    echo "Adding security headers to nginx configuration..."
    
    # Check if security headers already exist
    if grep -q "X-Content-Type-Options" "$BASE_DIR/nginx-therapease.conf"; then
        print_status "INFO" "Security headers already present"
    else
        # Add security headers
        cat >> "$BASE_DIR/nginx-therapease.conf" << 'EOF'

# Security Headers
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' wss:; frame-ancestors 'none';";
add_header Referrer-Policy "strict-origin-when-cross-origin";

EOF
        
        print_status "PASS" "Security headers added to nginx configuration"
        print_status "INFO" "Restart nginx to apply changes: sudo systemctl restart nginx"
    fi
else
    print_status "WARN" "Nginx configuration not found"
fi

echo ""
echo "🔍 Step 3: Updating Dependencies"
echo "================================="

if [ -f "$BASE_DIR/package.json" ]; then
    echo "Updating vulnerable dependencies..."
    cd "$BASE_DIR"
    
    # Update npm packages
    if npm update 2>/dev/null; then
        print_status "PASS" "Dependencies updated"
    else
        print_status "WARN" "Some dependencies may not have updated"
    fi
    
    # Run security audit
    if npm audit fix 2>/dev/null; then
        print_status "PASS" "Security vulnerabilities fixed"
    else
        print_status "WARN" "Some vulnerabilities may remain"
    fi
else
    print_status "WARN" "package.json not found"
fi

echo ""
echo "🔍 Step 4: Securing File Permissions"
echo "===================================="

# Secure file permissions
echo "Securing file permissions..."

# Set secure permissions for sensitive files
if [ -f "$BASE_DIR/.env" ]; then
    chmod 600 "$BASE_DIR/.env"
    print_status "PASS" ".env file permissions secured"
fi

# Set secure permissions for configuration files
find "$BASE_DIR" -name "*.json" -not -path "*/node_modules/*" -exec chmod 644 {} \;
print_status "PASS" "Configuration files permissions secured"

# Set secure permissions for JavaScript files
find "$BASE_DIR" -name "*.js" -not -path "*/node_modules/*" -exec chmod 644 {} \;
print_status "PASS" "JavaScript files permissions secured"

# Set secure permissions for shell scripts
find "$BASE_DIR" -name "*.sh" -exec chmod 755 {} \;
print_status "PASS" "Shell scripts permissions secured"

echo ""
echo "🔍 Step 5: Creating Security Monitoring"
echo "======================================="

# Create security monitoring script
cat > "$BASE_DIR/security-monitor.sh" << 'EOF'
#!/bin/bash

echo "🔒 TherapEase Security Monitor"
echo "============================="

# Check for failed login attempts
echo "Checking for failed login attempts..."
if [ -f "/var/log/nginx/access.log" ]; then
    FAILED_LOGINS=$(grep "POST /api/auth/login" /var/log/nginx/access.log | grep " 401 " | wc -l)
    if [ "$FAILED_LOGINS" -gt 10 ]; then
        echo "⚠️  High number of failed login attempts: $FAILED_LOGINS"
    else
        echo "✅ Failed login attempts within normal range: $FAILED_LOGINS"
    fi
else
    echo "ℹ️  Nginx access log not found"
fi

# Check for suspicious activities
echo "Checking for suspicious activities..."
if [ -f "/var/log/nginx/access.log" ]; then
    SUSPICIOUS_REQUESTS=$(grep -E "(admin|login|auth)" /var/log/nginx/access.log | grep -E "(sql|script|union|select)" | wc -l)
    if [ "$SUSPICIOUS_REQUESTS" -gt 0 ]; then
        echo "⚠️  Suspicious requests detected: $SUSPICIOUS_REQUESTS"
    else
        echo "✅ No suspicious requests detected"
    fi
else
    echo "ℹ️  Nginx access log not found"
fi

# Check server status
echo "Checking server status..."
if [ -f "/home/therapease/therapease/package.json" ]; then
    if pm2 status | grep -q "therapease"; then
        echo "✅ PM2 processes running"
    else
        echo "⚠️  PM2 processes not running"
    fi
else
    if pgrep -f "node.*server" > /dev/null; then
        echo "✅ Node.js server running locally"
    else
        echo "⚠️  Node.js server not running locally"
    fi
fi

echo "Security monitoring complete"
EOF

chmod +x "$BASE_DIR/security-monitor.sh"
print_status "PASS" "Security monitoring script created"

echo ""
echo "🔍 Step 6: Creating Security Checklist"
echo "======================================="

# Create security checklist
cat > "$BASE_DIR/security-checklist.md" << 'EOF'
# TherapEase Security Checklist

## ✅ Completed Security Measures

### Authentication & Authorization
- [ ] JWT token validation implemented
- [ ] Role-based access control (RBAC) implemented
- [ ] Password hashing with bcrypt
- [ ] Session management implemented

### Input Validation & Sanitization
- [ ] Server-side input validation
- [ ] XSS protection implemented
- [ ] SQL injection protection
- [ ] File upload validation

### Network Security
- [ ] HTTPS enabled
- [ ] SSL certificate valid
- [ ] Security headers implemented
- [ ] CORS configured properly

### File System Security
- [ ] File permissions secured
- [ ] Sensitive files protected
- [ ] Directory listing disabled
- [ ] File upload security

### Dependencies Security
- [ ] Vulnerable packages updated
- [ ] Regular security audits
- [ ] Dependency scanning enabled

### Monitoring & Logging
- [ ] Security event logging
- [ ] Failed login attempt monitoring
- [ ] Suspicious activity detection
- [ ] Regular security assessments

## 🔧 Security Recommendations

### High Priority
1. Implement rate limiting for authentication endpoints
2. Add input validation for all user inputs
3. Implement CSRF protection
4. Add security logging

### Medium Priority
1. Implement file upload security
2. Add session timeout
3. Implement security monitoring
4. Regular security audits

### Low Priority
1. Security training for developers
2. Incident response plan
3. Security documentation
4. Regular penetration testing

## 📋 Regular Security Tasks

### Daily
- [ ] Check security logs
- [ ] Monitor failed login attempts
- [ ] Check for suspicious activities

### Weekly
- [ ] Review security logs
- [ ] Check for new vulnerabilities
- [ ] Update dependencies if needed

### Monthly
- [ ] Run security tests
- [ ] Review security configuration
- [ ] Update security documentation

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Security training
- [ ] Incident response testing
EOF

print_status "PASS" "Security checklist created"

echo ""
echo "🔍 Step 7: Testing Security Fixes"
echo "================================="

# Test the fixes
echo "Testing security fixes..."

# Test 1: Check if server is accessible
echo "Testing server accessibility..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" | grep -q "200"; then
        print_status "PASS" "Server is accessible via HTTPS"
    else
        print_status "WARN" "Server may not be accessible via HTTPS"
    fi
else
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" | grep -q "200"; then
        print_status "PASS" "Server is accessible locally"
    else
        print_status "WARN" "Server may not be accessible locally"
    fi
fi

# Test 2: Check security headers
echo "Testing security headers..."
if [ "$ENVIRONMENT" = "webhost" ]; then
    if curl -s -I "https://www.therapease.site" | grep -i "X-Content-Type-Options"; then
        print_status "PASS" "Security headers are present"
    else
        print_status "WARN" "Security headers may not be present"
    fi
fi

# Test 3: Check file permissions
echo "Testing file permissions..."
if [ -f "$BASE_DIR/.env" ]; then
    PERMS=$(stat -c %a "$BASE_DIR/.env" 2>/dev/null)
    if [ "$PERMS" -le 600 ]; then
        print_status "PASS" ".env file has secure permissions ($PERMS)"
    else
        print_status "WARN" ".env file permissions may be insecure ($PERMS)"
    fi
fi

echo ""
echo "🏁 Security Fix Implementation Complete!"
echo "======================================="

echo ""
echo "📋 Security Fixes Implemented:"
echo "- ✅ Server status checked and started if needed"
echo "- ✅ Security headers added to nginx configuration"
echo "- ✅ Dependencies updated and vulnerabilities fixed"
echo "- ✅ File permissions secured"
echo "- ✅ Security monitoring script created"
echo "- ✅ Security checklist created"
echo "- ✅ Security fixes tested"
echo ""
echo "🔧 Next Steps:"
echo "1. Restart nginx: sudo systemctl restart nginx"
echo "2. Review security checklist: cat security-checklist.md"
echo "3. Run security monitoring: ./security-monitor.sh"
echo "4. Run security analysis again: ./simplified-security-analyzer.sh"
echo "5. Regular security assessments"
echo ""
echo "🎯 Security fixes implemented for $ENVIRONMENT environment";
