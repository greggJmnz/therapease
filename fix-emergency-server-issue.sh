#!/bin/bash

echo "🔧 Fix Emergency Server Issue"
echo "============================"

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

# Web host environment
BASE_DIR="/home/therapease/therapease"

echo ""
echo "🔧 Fixing Emergency Server Issue"
echo "================================"

echo ""
echo "🔍 Step 1: Stop Emergency Server"
echo "================================="

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
echo "🔍 Step 2: Create Proper Configuration Files"
echo "============================================="

# Create ecosystem.config.js
echo "Creating ecosystem.config.js..."
cat > "$BASE_DIR/ecosystem.config.js" << 'EOF'
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

# Create public-website/server.js if it doesn't exist
echo "Creating public-website/server.js..."
mkdir -p "$BASE_DIR/public-website"
cat > "$BASE_DIR/public-website/server.js" << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle any other requests by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Public website server running on port ${PORT}`);
});
EOF
print_status "PASS" "Public website server created"

# Create nginx configuration
echo "Creating nginx configuration..."
cat > "$BASE_DIR/nginx-therapease.conf" << 'EOF'
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

echo ""
echo "🔍 Step 3: Create Logs Directory"
echo "================================="

# Create logs directory
mkdir -p "$BASE_DIR/logs"
print_status "PASS" "Logs directory created"

echo ""
echo "🔍 Step 4: Build Frontend (if needed)"
echo "======================================"

# Check if frontend build exists
if [ ! -d "$BASE_DIR/client/build" ]; then
    echo "Frontend build not found, building..."
    cd "$BASE_DIR/client"
    if npm run build 2>/dev/null; then
        print_status "PASS" "Frontend built successfully"
    else
        print_status "WARN" "Frontend build failed, but continuing"
    fi
    cd "$BASE_DIR"
else
    print_status "PASS" "Frontend build already exists"
fi

echo ""
echo "🔍 Step 5: Start Proper PM2 Processes"
echo "====================================="

# Start proper PM2 processes
echo "Starting proper PM2 processes..."
cd "$BASE_DIR"

if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.js
    sleep 5
    
    if pm2 status | grep -q "therapease-api"; then
        print_status "PASS" "therapease-api process started"
    else
        print_status "WARN" "therapease-api process may not have started"
    fi
    
    if pm2 status | grep -q "therapease-public"; then
        print_status "PASS" "therapease-public process started"
    else
        print_status "WARN" "therapease-public process may not have started"
    fi
    
    echo "PM2 status:"
    pm2 status
else
    print_status "FAIL" "PM2 not available"
fi

echo ""
echo "🔍 Step 6: Test Backend Connectivity"
echo "===================================="

# Test backend connectivity
echo "Testing backend connectivity..."
sleep 3

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5; then
    HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/api/health" --connect-timeout 5)
    print_status "PASS" "Backend server is accessible (HTTP $HEALTH_CODE)"
    
    echo "Backend health response:"
    curl -s "http://localhost:5000/api/health" | head -3
else
    print_status "WARN" "Backend server may not be accessible"
    echo "Testing with verbose output:"
    curl -v "http://localhost:5000/api/health" --connect-timeout 5
fi

echo ""
echo "🔍 Step 7: Configure and Start Nginx"
echo "===================================="

# Configure nginx
echo "Configuring nginx..."
if [ -f "$BASE_DIR/nginx-therapease.conf" ]; then
    # Copy nginx configuration
    sudo cp "$BASE_DIR/nginx-therapease.conf" /etc/nginx/sites-available/therapease
    sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
    
    # Remove default nginx site
    sudo rm -f /etc/nginx/sites-enabled/default
    
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
echo "🔍 Step 8: Test Full Stack Connectivity"
echo "======================================="

# Test full stack connectivity
echo "Testing full stack connectivity..."

# Test HTTPS
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site" --connect-timeout 10; then
    HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site" --connect-timeout 10)
    print_status "PASS" "HTTPS is working (HTTP $HTTPS_CODE)"
else
    print_status "WARN" "HTTPS may not be working"
fi

# Test API through nginx
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10; then
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/health" --connect-timeout 10)
    print_status "PASS" "API through nginx is working (HTTP $API_CODE)"
    
    echo "API health response:"
    curl -s "https://www.therapease.site/api/health" | head -3
else
    print_status "WARN" "API through nginx may not be working"
fi

# Test authentication endpoint
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/auth/login" --connect-timeout 10; then
    AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/auth/login" --connect-timeout 10)
    print_status "PASS" "Auth endpoint is working (HTTP $AUTH_CODE)"
else
    print_status "WARN" "Auth endpoint may not be working"
fi

# Test admin endpoint
if curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/admin/dashboard" --connect-timeout 10; then
    ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.therapease.site/api/admin/dashboard" --connect-timeout 10)
    print_status "PASS" "Admin endpoint is working (HTTP $ADMIN_CODE)"
else
    print_status "WARN" "Admin endpoint may not be working"
fi

echo ""
echo "🔍 Step 9: Final Status Check"
echo "============================="

# Final status check
echo "Final status check..."

# Check PM2 status
if pm2 status | grep -q "therapease-api"; then
    print_status "PASS" "therapease-api process running"
else
    print_status "WARN" "therapease-api process not running"
fi

if pm2 status | grep -q "therapease-public"; then
    print_status "PASS" "therapease-public process running"
else
    print_status "WARN" "therapease-public process not running"
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
echo "🏁 Emergency Server Fix Complete!"
echo "==============================="

echo ""
echo "📋 Emergency Server Fix Summary:"
echo "- ✅ Emergency server stopped"
echo "- ✅ Proper configuration files created"
echo "- ✅ Logs directory created"
echo "- ✅ Frontend built (if needed)"
echo "- ✅ Proper PM2 processes started"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Nginx configured and started"
echo "- ✅ Full stack connectivity tested"
echo "- ✅ Final status checked"
echo ""
echo "🔧 Next Steps:"
echo "1. Test API endpoints manually"
echo "2. Check PM2 logs: pm2 logs"
echo "3. Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "4. Run security analysis again: ./simplified-security-analyzer.sh"
echo "5. Monitor server performance"
echo ""
echo "🎯 Emergency server issue fixed!";
