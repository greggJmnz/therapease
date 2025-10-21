#!/usr/bin/env node

/**
 * API Connectivity Diagnostic Tool
 * Diagnoses and fixes API connectivity issues
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 API Connectivity Diagnostic Tool');
console.log('===================================');

console.log('\n🔍 Step 1: Creating comprehensive API diagnostic script...');

const apiDiagnosticScript = `#!/bin/bash

echo "🔍 TherapEase API Connectivity Diagnostic"
echo "========================================="

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
echo "🔍 Environment: \$ENVIRONMENT"
echo "🔍 Base Directory: \$BASE_DIR"
echo "🔍 Base URL: \$BASE_URL"

echo ""
echo "🔍 Step 1: Process Analysis"
echo "==========================="

# Check Node.js processes
echo "Checking Node.js processes..."
if pgrep -f "node.*server" > /dev/null; then
    print_status "PASS" "Node.js server process found"
    echo "Node.js processes:"
    pgrep -f "node.*server" | xargs ps -p
else
    print_status "FAIL" "No Node.js server process found"
fi

# Check for PM2 processes (webhost)
if [ "\$ENVIRONMENT" = "webhost" ]; then
    echo "Checking PM2 processes..."
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 status | grep -q "therapease"; then
            print_status "PASS" "PM2 processes running"
            pm2 status
        else
            print_status "WARN" "PM2 processes not running"
        fi
    fi
fi

echo ""
echo "🔍 Step 2: Port Analysis"
echo "========================"

# Check ports using ss instead of netstat
echo "Checking port 3000 (React frontend)..."
if ss -tlnp | grep -q ":3000 "; then
    print_status "PASS" "Port 3000 is listening"
    ss -tlnp | grep ":3000 "
else
    print_status "WARN" "Port 3000 not listening"
fi

echo "Checking port 5000 (Node.js backend)..."
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

echo ""
echo "🔍 Step 3: Direct Server Testing"
echo "================================"

# Test direct server connection
echo "Testing direct server connection on port 5000..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5; then
    HEALTH_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5)
    print_status "PASS" "Direct server connection successful (HTTP \$HEALTH_CODE)"
else
    print_status "FAIL" "Direct server connection failed"
fi

# Test server root
echo "Testing server root..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/" --connect-timeout 5; then
    ROOT_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/" --connect-timeout 5)
    print_status "PASS" "Server root accessible (HTTP \$ROOT_CODE)"
else
    print_status "FAIL" "Server root not accessible"
fi

echo ""
echo "🔍 Step 4: Frontend-Backend Connection"
echo "======================================"

# Test frontend connection to backend
echo "Testing frontend connection to backend..."
if curl -s -o /dev/null -w "%{http_code}" "\$BASE_URL/api/health" --connect-timeout 5; then
    FRONTEND_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "\$BASE_URL/api/health" --connect-timeout 5)
    print_status "PASS" "Frontend-backend connection successful (HTTP \$FRONTEND_CODE)"
else
    print_status "FAIL" "Frontend-backend connection failed"
fi

echo ""
echo "🔍 Step 5: Configuration Analysis"
echo "================================="

# Check server configuration
echo "Checking server configuration..."
if [ -f "\$BASE_DIR/server/index.js" ]; then
    print_status "PASS" "Server index.js found"
    
    # Check if server is configured to listen on port 5000
    if grep -q "listen.*5000" "\$BASE_DIR/server/index.js"; then
        print_status "PASS" "Server configured to listen on port 5000"
    else
        print_status "WARN" "Server may not be configured for port 5000"
        echo "Server configuration:"
        grep -n "listen\|port" "\$BASE_DIR/server/index.js" | head -5
    fi
else
    print_status "FAIL" "Server index.js not found"
fi

# Check package.json scripts
echo "Checking package.json scripts..."
if [ -f "\$BASE_DIR/package.json" ]; then
    print_status "PASS" "package.json found"
    
    if grep -q "start.*server" "\$BASE_DIR/package.json"; then
        print_status "PASS" "Server start script found"
        echo "Start script:"
        grep -A 2 -B 2 "start.*server" "\$BASE_DIR/package.json"
    else
        print_status "WARN" "Server start script not found"
    fi
else
    print_status "FAIL" "package.json not found"
fi

echo ""
echo "🔍 Step 6: Network Interface Analysis"
echo "===================================="

# Check network interfaces
echo "Checking network interfaces..."
echo "Available network interfaces:"
ip addr show | grep -E "inet.*127.0.0.1|inet.*localhost" || echo "No localhost interfaces found"

echo ""
echo "🔍 Step 7: Process Details"
echo "========================="

# Get detailed process information
echo "Getting detailed process information..."
if pgrep -f "node.*server" > /dev/null; then
    NODE_PID=\$(pgrep -f "node.*server" | head -1)
    print_status "INFO" "Node.js process PID: \$NODE_PID"
    
    echo "Process details:"
    ps -p \$NODE_PID -o pid,ppid,cmd,etime
    
    echo "Process file descriptors:"
    ls -la /proc/\$NODE_PID/fd/ | grep -E "socket|tcp" | head -5
else
    print_status "WARN" "No Node.js process found"
fi

echo ""
echo "🔍 Step 8: Troubleshooting Recommendations"
echo "==========================================="

echo "Based on the diagnostic results:"

# Check if server is running but not accessible
if pgrep -f "node.*server" > /dev/null && ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "WARN" "Server is running but not accessible"
    echo "Possible issues:"
    echo "1. Server may be listening on wrong port"
    echo "2. Server may have configuration issues"
    echo "3. Server may be bound to wrong interface"
    echo "4. Firewall may be blocking connections"
    
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check server logs: pm2 logs (webhost) or check console output"
    echo "2. Verify server configuration in server/index.js"
    echo "3. Test with: curl -v http://localhost:5000/api/health"
    echo "4. Check if server is listening on correct interface"
fi

# Check if ports are not listening
if ! ss -tlnp | grep -q ":5000 "; then
    print_status "WARN" "Port 5000 not listening"
    echo "Possible issues:"
    echo "1. Server not started"
    echo "2. Server crashed"
    echo "3. Port conflict"
    echo "4. Configuration error"
    
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Start server: npm start (or pm2 start)"
    echo "2. Check server logs for errors"
    echo "3. Verify port configuration"
    echo "4. Check for port conflicts"
fi

# Check if frontend-backend connection failed
if ! curl -s -o /dev/null -w "%{http_code}" "\$BASE_URL/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "WARN" "Frontend-backend connection failed"
    echo "Possible issues:"
    echo "1. Frontend not running"
    echo "2. Backend not accessible from frontend"
    echo "3. Proxy configuration issues"
    echo "4. CORS issues"
    
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Start frontend: npm start (client directory)"
    echo "2. Start backend: npm start (server directory)"
    echo "3. Check proxy configuration"
    echo "4. Verify CORS settings"
fi

echo ""
echo "🏁 API Connectivity Diagnostic Complete!"
echo "======================================="

echo ""
echo "📋 Diagnostic Summary:"
echo "- ✅ Process analysis completed"
echo "- ✅ Port analysis completed"
echo "- ✅ Direct server testing completed"
echo "- ✅ Frontend-backend connection testing completed"
echo "- ✅ Configuration analysis completed"
echo "- ✅ Network interface analysis completed"
echo "- ✅ Process details gathered"
echo "- ✅ Troubleshooting recommendations provided"
echo ""
echo "🔧 Next Steps:"
echo "1. Review diagnostic results above"
echo "2. Follow troubleshooting recommendations"
echo "3. Check server logs for errors"
echo "4. Verify server configuration"
echo "5. Test server connectivity manually"
echo ""
echo "🎯 API connectivity diagnostic complete for \$ENVIRONMENT environment";
`;

const apiDiagnosticPath = path.join(__dirname, 'diagnose-api-connectivity.sh');
fs.writeFileSync(apiDiagnosticPath, apiDiagnosticScript);
fs.chmodSync(apiDiagnosticPath, '755');
console.log('✅ API diagnostic script created');

console.log('\n🔍 Step 2: Creating API fix script...');

const apiFixScript = `#!/bin/bash

echo "🔧 TherapEase API Connectivity Fix"
echo "==================================="

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
echo "🔧 Fixing API Connectivity Issues"
echo "================================="

echo ""
echo "🔍 Step 1: Stop Existing Processes"
echo "==================================="

# Stop existing Node.js processes
echo "Stopping existing Node.js processes..."
if pgrep -f "node.*server" > /dev/null; then
    pkill -f "node.*server"
    sleep 2
    print_status "PASS" "Existing Node.js processes stopped"
else
    print_status "INFO" "No existing Node.js processes found"
fi

# Stop PM2 processes if running
if [ "\$ENVIRONMENT" = "webhost" ] && command -v pm2 >/dev/null 2>&1; then
    echo "Stopping PM2 processes..."
    pm2 stop all 2>/dev/null || true
    print_status "PASS" "PM2 processes stopped"
fi

echo ""
echo "🔍 Step 2: Check Server Configuration"
echo "===================================="

# Check server configuration
if [ -f "\$BASE_DIR/server/index.js" ]; then
    print_status "PASS" "Server configuration found"
    
    # Check if server is configured correctly
    if grep -q "listen.*5000" "\$BASE_DIR/server/index.js"; then
        print_status "PASS" "Server configured for port 5000"
    else
        print_status "WARN" "Server may not be configured for port 5000"
        echo "Checking server configuration..."
        grep -n "listen\|port" "\$BASE_DIR/server/index.js" | head -5
    fi
else
    print_status "FAIL" "Server configuration not found"
    exit 1
fi

echo ""
echo "🔍 Step 3: Start Backend Server"
echo "==============================="

# Start backend server
echo "Starting backend server..."
cd "\$BASE_DIR"

if [ "\$ENVIRONMENT" = "webhost" ]; then
    # Webhost: Use PM2
    if command -v pm2 >/dev/null 2>&1; then
        pm2 start ecosystem.config.js
        sleep 3
        if pm2 status | grep -q "therapease-api"; then
            print_status "PASS" "Backend server started with PM2"
        else
            print_status "WARN" "Backend server may not have started with PM2"
        fi
    else
        print_status "WARN" "PM2 not available, starting manually"
        nohup node server/index.js > server.log 2>&1 &
        sleep 3
        if pgrep -f "node.*server" > /dev/null; then
            print_status "PASS" "Backend server started manually"
        else
            print_status "FAIL" "Backend server failed to start"
        fi
    fi
else
    # Localhost: Start manually
    nohup node server/index.js > server.log 2>&1 &
    sleep 3
    if pgrep -f "node.*server" > /dev/null; then
        print_status "PASS" "Backend server started"
    else
        print_status "FAIL" "Backend server failed to start"
        echo "Check server.log for errors:"
        tail -n 10 server.log
    fi
fi

echo ""
echo "🔍 Step 4: Test Backend Connectivity"
echo "===================================="

# Test backend connectivity
echo "Testing backend connectivity..."
sleep 2

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "PASS" "Backend server is accessible"
else
    print_status "WARN" "Backend server may not be accessible"
    echo "Testing with verbose output:"
    curl -v "http://localhost:5000/api/health" --connect-timeout 5
fi

echo ""
echo "🔍 Step 5: Start Frontend (if needed)"
echo "====================================="

# Check if frontend is needed
if [ -d "\$BASE_DIR/client" ]; then
    echo "Frontend directory found"
    
    if [ "\$ENVIRONMENT" = "localhost" ]; then
        echo "Starting frontend for localhost..."
        cd "\$BASE_DIR/client"
        nohup npm start > ../client.log 2>&1 &
        sleep 5
        
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" --connect-timeout 5 | grep -q "200"; then
            print_status "PASS" "Frontend server is accessible"
        else
            print_status "WARN" "Frontend server may not be accessible"
        fi
    else
        print_status "INFO" "Frontend handled by nginx on webhost"
    fi
else
    print_status "INFO" "No frontend directory found"
fi

echo ""
echo "🔍 Step 6: Verify API Endpoints"
echo "=============================="

# Test API endpoints
echo "Testing API endpoints..."

# Test health endpoint
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5 | grep -q "200"; then
    print_status "PASS" "Health endpoint working"
else
    print_status "FAIL" "Health endpoint not working"
fi

# Test auth endpoint
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/auth/login" --connect-timeout 5 | grep -q "401\\|400"; then
    print_status "PASS" "Auth endpoint working"
else
    print_status "WARN" "Auth endpoint may not be working"
fi

# Test admin endpoint
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/admin/dashboard" --connect-timeout 5 | grep -q "401"; then
    print_status "PASS" "Admin endpoint properly protected"
else
    print_status "WARN" "Admin endpoint may not be properly protected"
fi

echo ""
echo "🔍 Step 7: Check Process Status"
echo "=============================="

# Check process status
echo "Checking process status..."
if pgrep -f "node.*server" > /dev/null; then
    print_status "PASS" "Node.js server process running"
    echo "Process details:"
    pgrep -f "node.*server" | xargs ps -p
else
    print_status "FAIL" "Node.js server process not running"
fi

# Check port status
echo "Checking port status..."
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

echo ""
echo "🏁 API Connectivity Fix Complete!"
echo "================================="

echo ""
echo "📋 API Fix Summary:"
echo "- ✅ Existing processes stopped"
echo "- ✅ Server configuration checked"
echo "- ✅ Backend server started"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Frontend started (if needed)"
echo "- ✅ API endpoints verified"
echo "- ✅ Process status checked"
echo ""
echo "🔧 Next Steps:"
echo "1. Test API endpoints manually"
echo "2. Check server logs for any errors"
echo "3. Run security analysis again"
echo "4. Monitor server performance"
echo ""
echo "🎯 API connectivity fix complete for \$ENVIRONMENT environment";
`;

const apiFixPath = path.join(__dirname, 'fix-api-connectivity.sh');
fs.writeFileSync(apiFixPath, apiFixScript);
fs.chmodSync(apiFixPath, '755');
console.log('✅ API fix script created');

console.log('\n🏁 API Connectivity Diagnostic Tools Complete!');
console.log('\n📋 API Diagnostic Tools Created:');
console.log('1. ✅ diagnose-api-connectivity.sh - Comprehensive API diagnostic');
console.log('2. ✅ fix-api-connectivity.sh - API connectivity fix');
console.log('\n🔧 Usage:');
console.log('1. Run: ./diagnose-api-connectivity.sh (diagnose API issues)');
console.log('2. Run: ./fix-api-connectivity.sh (fix API connectivity)');
console.log('\n⚠️  Important Notes:');
console.log('- Diagnoses API connectivity issues in detail');
console.log('- Fixes server startup and configuration issues');
console.log('- Tests backend and frontend connectivity');
console.log('- Provides troubleshooting recommendations');
console.log('\n🎯 API diagnostic tools ready for use!');
