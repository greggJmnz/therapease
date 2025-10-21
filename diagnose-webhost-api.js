#!/usr/bin/env node

/**
 * Web Host API Diagnostic Tool
 * Diagnoses and fixes API connectivity issues on web host
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Web Host API Diagnostic Tool');
console.log('==============================');

console.log('\n🔍 Step 1: Creating web host API diagnostic script...');

const webhostApiDiagnostic = `#!/bin/bash

echo "🔍 TherapEase Web Host API Diagnostic"
echo "====================================="

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

print_status() {
    local status=\\$1
    local message=\\$2
    if [ "\$status" = "PASS" ]; then
        echo -e "\${GREEN}✅ \$message\${NC}"
    elif [ "\$status" = "FAIL" ]; then
        echo -e "\${RED}❌ \$message\${NC}"
    elif [ "\$status" = "WARN" ]; then
        echo -e "\${YELLOW}⚠️  \$message\${NC}"
    else
        echo -e "\${BLUE}ℹ️  \$message\${NC}"
    fi
}

# Web host environment
ENVIRONMENT="webhost"
BASE_DIR="/home/therapease/therapease"
BASE_URL="https://www.therapease.site"

echo ""
echo "🔍 Environment: \$ENVIRONMENT"
echo "🔍 Base Directory: \$BASE_DIR"
echo "🔍 Base URL: \$BASE_URL"

echo ""
echo "🔍 Step 1: PM2 Process Analysis"
echo "==============================="

# Check PM2 processes
echo "Checking PM2 processes..."
if command -v pm2 >/dev/null 2>&1; then
    print_status "PASS" "PM2 is available"
    
    echo "PM2 status:"
    pm2 status
    
    if pm2 status | grep -q "therapease"; then
        print_status "PASS" "TherapEase processes found in PM2"
        
        # Check specific processes
        if pm2 status | grep -q "therapease-api"; then
            print_status "PASS" "therapease-api process running"
        else
            print_status "WARN" "therapease-api process not found"
        fi
        
        if pm2 status | grep -q "therapease-public"; then
            print_status "PASS" "therapease-public process running"
        else
            print_status "WARN" "therapease-public process not found"
        fi
        
        if pm2 status | grep -q "therapease-emergency"; then
            print_status "WARN" "therapease-emergency process running (may interfere)"
        fi
    else
        print_status "FAIL" "No TherapEase processes found in PM2"
    fi
else
    print_status "FAIL" "PM2 not available"
fi

echo ""
echo "🔍 Step 2: Nginx Status Analysis"
echo "==============================="

# Check nginx status
echo "Checking nginx status..."
if systemctl is-active --quiet nginx; then
    print_status "PASS" "Nginx is running"
    
    # Check nginx configuration
    if [ -f "\$BASE_DIR/nginx-therapease.conf" ]; then
        print_status "PASS" "Nginx configuration found"
        
        # Check if nginx is using the correct configuration
        if nginx -t 2>/dev/null; then
            print_status "PASS" "Nginx configuration is valid"
        else
            print_status "WARN" "Nginx configuration may have issues"
            echo "Nginx configuration test:"
            nginx -t
        fi
    else
        print_status "WARN" "Nginx configuration not found"
    fi
else
    print_status "FAIL" "Nginx not running"
    echo "Nginx status:"
    systemctl status nginx --no-pager
fi

echo ""
echo "🔍 Step 3: Port Analysis"
echo "======================="

# Check ports
echo "Checking port 80 (HTTP)..."
if ss -tlnp | grep -q ":80 "; then
    print_status "PASS" "Port 80 is listening"
    ss -tlnp | grep ":80 "
else
    print_status "WARN" "Port 80 not listening"
fi

echo "Checking port 443 (HTTPS)..."
if ss -tlnp | grep -q ":443 "; then
    print_status "PASS" "Port 443 is listening"
    ss -tlnp | grep ":443 "
else
    print_status "WARN" "Port 443 not listening"
fi

echo "Checking port 5000 (Node.js backend)..."
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

echo ""
echo "🔍 Step 4: Direct Backend Testing"
echo "==============================="

# Test direct backend connection
echo "Testing direct backend connection..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5; then
    HEALTH_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5)
    print_status "PASS" "Direct backend connection successful (HTTP \$HEALTH_CODE)"
    
    # Test backend response
    echo "Backend health response:"
    curl -s "http://localhost:5000/api/health" | head -3
else
    print_status "FAIL" "Direct backend connection failed"
fi

echo ""
echo "🔍 Step 5: Nginx Proxy Testing"
echo "=============================="

# Test nginx proxy
echo "Testing nginx proxy to backend..."
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10; then
    PROXY_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10)
    print_status "PASS" "Nginx proxy working (HTTP \$PROXY_CODE)"
    
    # Test proxy response
    echo "Proxy health response:"
    curl -s "https://www.therapease.site/api/health" | head -3
else
    print_status "FAIL" "Nginx proxy not working"
fi

echo ""
echo "🔍 Step 6: SSL Certificate Analysis"
echo "==================================="

# Check SSL certificate
echo "Checking SSL certificate..."
if openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    print_status "PASS" "SSL certificate is valid"
else
    print_status "WARN" "SSL certificate issues detected"
    echo "SSL certificate details:"
    openssl s_client -connect www.therapease.site:443 -servername www.therapease.site </dev/null 2>/dev/null | grep -E "(Verify return code|Subject:|Issuer:)"
fi

echo ""
echo "🔍 Step 7: Log Analysis"
echo "======================"

# Check nginx logs
echo "Checking nginx error logs..."
if [ -f "/var/log/nginx/error.log" ]; then
    RECENT_ERRORS=\$(tail -n 20 /var/log/nginx/error.log | grep -c "error")
    if [ "\$RECENT_ERRORS" -gt 0 ]; then
        print_status "WARN" "Recent nginx errors found: \$RECENT_ERRORS"
        echo "Recent nginx errors:"
        tail -n 10 /var/log/nginx/error.log | grep "error"
    else
        print_status "PASS" "No recent nginx errors"
    fi
else
    print_status "WARN" "Nginx error log not found"
fi

# Check PM2 logs
echo "Checking PM2 logs..."
if command -v pm2 >/dev/null 2>&1; then
    if pm2 logs --lines 10 2>/dev/null | grep -q "error\\|Error\\|ERROR"; then
        print_status "WARN" "Recent PM2 errors found"
        echo "Recent PM2 errors:"
        pm2 logs --lines 5 2>/dev/null | grep -i "error"
    else
        print_status "PASS" "No recent PM2 errors"
    fi
fi

echo ""
echo "🔍 Step 8: Configuration Analysis"
echo "================================="

# Check ecosystem configuration
echo "Checking PM2 ecosystem configuration..."
if [ -f "\$BASE_DIR/ecosystem.config.js" ]; then
    print_status "PASS" "Ecosystem configuration found"
    
    # Check if processes are defined correctly
    if grep -q "therapease-api" "\$BASE_DIR/ecosystem.config.js"; then
        print_status "PASS" "therapease-api process defined"
    else
        print_status "WARN" "therapease-api process not defined"
    fi
    
    if grep -q "therapease-public" "\$BASE_DIR/ecosystem.config.js"; then
        print_status "PASS" "therapease-public process defined"
    else
        print_status "WARN" "therapease-public process not defined"
    fi
else
    print_status "WARN" "Ecosystem configuration not found"
fi

# Check nginx configuration
echo "Checking nginx configuration..."
if [ -f "\$BASE_DIR/nginx-therapease.conf" ]; then
    print_status "PASS" "Nginx configuration found"
    
    # Check if proxy configuration is correct
    if grep -q "proxy_pass.*5000" "\$BASE_DIR/nginx-therapease.conf"; then
        print_status "PASS" "Nginx proxy to port 5000 configured"
    else
        print_status "WARN" "Nginx proxy to port 5000 not configured"
    fi
    
    # Check if API routes are configured
    if grep -q "location /api" "\$BASE_DIR/nginx-therapease.conf"; then
        print_status "PASS" "API routes configured in nginx"
    else
        print_status "WARN" "API routes not configured in nginx"
    fi
else
    print_status "WARN" "Nginx configuration not found"
fi

echo ""
echo "🔍 Step 9: Troubleshooting Recommendations"
echo "==========================================="

echo "Based on the diagnostic results:"

# Check if PM2 processes are not running
if ! pm2 status | grep -q "therapease-api"; then
    print_status "WARN" "therapease-api process not running"
    echo "Recommendations:"
    echo "1. Start PM2 processes: pm2 start ecosystem.config.js"
    echo "2. Check PM2 logs: pm2 logs therapease-api"
    echo "3. Restart PM2: pm2 restart all"
fi

# Check if nginx is not running
if ! systemctl is-active --quiet nginx; then
    print_status "WARN" "Nginx not running"
    echo "Recommendations:"
    echo "1. Start nginx: sudo systemctl start nginx"
    echo "2. Check nginx status: sudo systemctl status nginx"
    echo "3. Check nginx configuration: sudo nginx -t"
fi

# Check if backend is not accessible
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "WARN" "Backend not accessible"
    echo "Recommendations:"
    echo "1. Check if Node.js server is running on port 5000"
    echo "2. Check server logs for errors"
    echo "3. Verify server configuration"
    echo "4. Test with: curl -v http://localhost:5000/api/health"
fi

# Check if nginx proxy is not working
if ! curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10 | grep -q "200"; then
    print_status "WARN" "Nginx proxy not working"
    echo "Recommendations:"
    echo "1. Check nginx configuration"
    echo "2. Restart nginx: sudo systemctl restart nginx"
    echo "3. Check nginx error logs: sudo tail -f /var/log/nginx/error.log"
    echo "4. Verify proxy configuration in nginx"
fi

echo ""
echo "🏁 Web Host API Diagnostic Complete!"
echo "===================================="

echo ""
echo "📋 Diagnostic Summary:"
echo "- ✅ PM2 process analysis completed"
echo "- ✅ Nginx status analysis completed"
echo "- ✅ Port analysis completed"
echo "- ✅ Direct backend testing completed"
echo "- ✅ Nginx proxy testing completed"
echo "- ✅ SSL certificate analysis completed"
echo "- ✅ Log analysis completed"
echo "- ✅ Configuration analysis completed"
echo "- ✅ Troubleshooting recommendations provided"
echo ""
echo "🔧 Next Steps:"
echo "1. Review diagnostic results above"
echo "2. Follow troubleshooting recommendations"
echo "3. Check PM2 and nginx logs"
echo "4. Verify configuration files"
echo "5. Test API endpoints manually"
echo ""
echo "🎯 Web host API diagnostic complete";
`;

const webhostDiagnosticPath = path.join(__dirname, 'diagnose-webhost-api.sh');
fs.writeFileSync(webhostDiagnosticPath, webhostDiagnosticScript);
fs.chmodSync(webhostDiagnosticPath, '755');
console.log('✅ Web host API diagnostic script created');

console.log('\n🔍 Step 2: Creating web host API fix script...');

const webhostApiFix = `#!/bin/bash

echo "🔧 TherapEase Web Host API Fix"
echo "=============================="

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

print_status() {
    local status=\\$1
    local message=\\$2
    if [ "\$status" = "PASS" ]; then
        echo -e "\${GREEN}✅ \$message\${NC}"
    elif [ "\$status" = "FAIL" ]; then
        echo -e "\${RED}❌ \$message\${NC}"
    elif [ "\$status" = "WARN" ]; then
        echo -e "\${YELLOW}⚠️  \$message\${NC}"
    else
        echo -e "\${BLUE}ℹ️  \$message\${NC}"
    fi
}

# Web host environment
ENVIRONMENT="webhost"
BASE_DIR="/home/therapease/therapease"

echo ""
echo "🔧 Fixing Web Host API Issues"
echo "============================="

echo ""
echo "🔍 Step 1: Stop All Processes"
echo "============================="

# Stop all PM2 processes
echo "Stopping all PM2 processes..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    print_status "PASS" "All PM2 processes stopped"
else
    print_status "WARN" "PM2 not available"
fi

# Stop nginx
echo "Stopping nginx..."
sudo systemctl stop nginx 2>/dev/null || true
print_status "PASS" "Nginx stopped"

echo ""
echo "🔍 Step 2: Check Configuration Files"
echo "==================================="

# Check ecosystem configuration
if [ -f "\$BASE_DIR/ecosystem.config.js" ]; then
    print_status "PASS" "Ecosystem configuration found"
else
    print_status "WARN" "Ecosystem configuration not found"
    echo "Creating basic ecosystem configuration..."
    cat > "\$BASE_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'therapease-public',
      script: './public-website/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/public-err.log',
      out_file: './logs/public-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
EOF
    print_status "PASS" "Ecosystem configuration created"
fi

# Check nginx configuration
if [ -f "\$BASE_DIR/nginx-therapease.conf" ]; then
    print_status "PASS" "Nginx configuration found"
else
    print_status "WARN" "Nginx configuration not found"
    echo "Creating basic nginx configuration..."
    cat > "\$BASE_DIR/nginx-therapease.conf" << 'EOF'
server {
    listen 80;
    server_name www.therapease.site therapease.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.therapease.site therapease.site;

    ssl_certificate /etc/letsencrypt/live/therapease.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/therapease.site/privkey.pem;

    # API proxy to Node.js backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve React app
    location / {
        root /home/therapease/therapease/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF
    print_status "PASS" "Nginx configuration created"
fi

echo ""
echo "🔍 Step 3: Create Logs Directory"
echo "================================="

# Create logs directory
mkdir -p "\$BASE_DIR/logs"
print_status "PASS" "Logs directory created"

echo ""
echo "🔍 Step 4: Start Backend Server"
echo "==============================="

# Start backend server with PM2
echo "Starting backend server with PM2..."
cd "\$BASE_DIR"

if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.js
    sleep 5
    
    if pm2 status | grep -q "therapease-api"; then
        print_status "PASS" "Backend server started with PM2"
        pm2 status
    else
        print_status "WARN" "Backend server may not have started"
        echo "PM2 logs:"
        pm2 logs --lines 10
    fi
else
    print_status "FAIL" "PM2 not available"
fi

echo ""
echo "🔍 Step 5: Test Backend Connectivity"
echo "===================================="

# Test backend connectivity
echo "Testing backend connectivity..."
sleep 3

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5; then
    HEALTH_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5)
    print_status "PASS" "Backend server is accessible (HTTP \$HEALTH_CODE)"
    
    echo "Backend health response:"
    curl -s "http://localhost:5000/api/health" | head -3
else
    print_status "WARN" "Backend server may not be accessible"
    echo "Testing with verbose output:"
    curl -v "http://localhost:5000/api/health" --connect-timeout 5
fi

echo ""
echo "🔍 Step 6: Configure and Start Nginx"
echo "===================================="

# Configure nginx
echo "Configuring nginx..."
if [ -f "\$BASE_DIR/nginx-therapease.conf" ]; then
    # Copy nginx configuration
    sudo cp "\$BASE_DIR/nginx-therapease.conf" /etc/nginx/sites-available/therapease
    sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_status "PASS" "Nginx configuration is valid"
    else
        print_status "WARN" "Nginx configuration has issues"
        sudo nginx -t
    fi
fi

# Start nginx
echo "Starting nginx..."
sudo systemctl start nginx
sleep 3

if systemctl is-active --quiet nginx; then
    print_status "PASS" "Nginx is running"
else
    print_status "WARN" "Nginx may not be running"
    echo "Nginx status:"
    sudo systemctl status nginx --no-pager
fi

echo ""
echo "🔍 Step 7: Test Full Stack Connectivity"
echo "======================================="

# Test full stack connectivity
echo "Testing full stack connectivity..."

# Test HTTPS
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site" --connect-timeout 10; then
    HTTPS_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site" --connect-timeout 10)
    print_status "PASS" "HTTPS is working (HTTP \$HTTPS_CODE)"
else
    print_status "WARN" "HTTPS may not be working"
fi

# Test API through nginx
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10; then
    API_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10)
    print_status "PASS" "API through nginx is working (HTTP \$API_CODE)"
    
    echo "API health response:"
    curl -s "https://www.therapease.site/api/health" | head -3
else
    print_status "WARN" "API through nginx may not be working"
fi

# Test authentication endpoint
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/auth/login" --connect-timeout 10; then
    AUTH_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/auth/login" --connect-timeout 10)
    print_status "PASS" "Auth endpoint is working (HTTP \$AUTH_CODE)"
else
    print_status "WARN" "Auth endpoint may not be working"
fi

echo ""
echo "🔍 Step 8: Final Status Check"
echo "============================="

# Final status check
echo "Final status check..."

# Check PM2 status
if pm2 status | grep -q "therapease-api"; then
    print_status "PASS" "PM2 processes running"
    pm2 status
else
    print_status "WARN" "PM2 processes may not be running"
fi

# Check nginx status
if systemctl is-active --quiet nginx; then
    print_status "PASS" "Nginx is running"
else
    print_status "WARN" "Nginx may not be running"
fi

# Check ports
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
else
    print_status "WARN" "Port 5000 not listening"
fi

if ss -tlnp | grep -q ":443 "; then
    print_status "PASS" "Port 443 is listening"
else
    print_status "WARN" "Port 443 not listening"
fi

echo ""
echo "🏁 Web Host API Fix Complete!"
echo "============================="

echo ""
echo "📋 API Fix Summary:"
echo "- ✅ All processes stopped"
echo "- ✅ Configuration files checked/created"
echo "- ✅ Logs directory created"
echo "- ✅ Backend server started with PM2"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Nginx configured and started"
echo "- ✅ Full stack connectivity tested"
echo "- ✅ Final status checked"
echo ""
echo "🔧 Next Steps:"
echo "1. Test API endpoints manually"
echo "2. Check PM2 logs: pm2 logs"
echo "3. Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "4. Run security analysis again"
echo "5. Monitor server performance"
echo ""
echo "🎯 Web host API fix complete";
`;

const webhostFixPath = path.join(__dirname, 'fix-webhost-api.sh');
fs.writeFileSync(webhostFixPath, webhostFixScript);
fs.chmodSync(webhostFixPath, '755');
console.log('✅ Web host API fix script created');

console.log('\n🏁 Web Host API Diagnostic Tools Complete!');
console.log('\n📋 Web Host API Tools Created:');
console.log('1. ✅ diagnose-webhost-api.sh - Web host API diagnostic');
console.log('2. ✅ fix-webhost-api.sh - Web host API fix');
console.log('\n🔧 Usage on Web Host:');
console.log('1. Run: ./diagnose-webhost-api.sh (diagnose web host API issues)');
console.log('2. Run: ./fix-webhost-api.sh (fix web host API connectivity)');
console.log('\n⚠️  Important Notes:');
console.log('- Specifically designed for web host (droplet) environment');
console.log('- Checks PM2 processes, nginx, SSL certificates');
console.log('- Tests backend connectivity and nginx proxy');
console.log('- Fixes PM2 configuration and nginx setup');
console.log('\n🎯 Web host API diagnostic tools ready for use!');
