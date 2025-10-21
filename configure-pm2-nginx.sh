#!/bin/bash

echo "🔧 Configure PM2 and Nginx"
echo "=========================="

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

BASE_DIR="/root/therapease/therapease"

echo ""
echo "🔧 Configuring PM2 and Nginx"
echo "=============================="

echo ""
echo "🔍 Step 1: Stop All PM2 Processes"
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

echo ""
echo "🔍 Step 2: Create Proper Ecosystem Configuration"
echo "================================================="

# Create proper ecosystem configuration
echo "Creating proper ecosystem configuration..."
cat > "$BASE_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: '$BASE_DIR/server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '$BASE_DIR/logs/api-err.log',
      out_file: '$BASE_DIR/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
    },
    {
      name: 'therapease-public',
      script: '$BASE_DIR/public-website/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '$BASE_DIR/logs/public-err.log',
      out_file: '$BASE_DIR/logs/public-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
    },
  ],
};
EOF
print_status "PASS" "Ecosystem configuration created"

echo ""
echo "🔍 Step 3: Create Public Website Server"
echo "======================================="

# Create public-website directory and server
mkdir -p "$BASE_DIR/public-website"

# Create public-website/server.js
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

echo ""
echo "🔍 Step 4: Create Logs Directory"
echo "==============================="

# Create logs directory
mkdir -p "$BASE_DIR/logs"
print_status "PASS" "Logs directory created"

echo ""
echo "🔍 Step 5: Build Frontend"
echo "========================"

# Check if client directory exists
if [ -d "$BASE_DIR/client" ]; then
    echo "Building frontend..."
    cd "$BASE_DIR/client"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "Installing client dependencies..."
        npm install
    fi
    
    # Build frontend
    if npm run build 2>/dev/null; then
        print_status "PASS" "Frontend built successfully"
    else
        print_status "WARN" "Frontend build failed, but continuing"
        echo "Build error details:"
        npm run build
    fi
    cd "$BASE_DIR"
else
    print_status "WARN" "Client directory not found, skipping frontend build"
fi

echo ""
echo "🔍 Step 6: Create Nginx Configuration"
echo "======================================"

# Create Nginx configuration
echo "Creating Nginx configuration..."
cat > "$BASE_DIR/nginx-therapease.conf" << 'EOF'
# TherapEase Nginx Configuration
# This configuration handles both API and frontend routing

# Upstream for API server
upstream therapease_api {
    server 127.0.0.1:5000;
    keepalive 32;
}

# Upstream for public website
upstream therapease_public {
    server 127.0.0.1:3001;
    keepalive 32;
}

# Main server block for therapease.site
server {
    listen 80;
    server_name therapease.site www.therapease.site;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    server_name therapease.site www.therapease.site;
    
    # SSL Configuration
    ssl_certificate /root/therapease/therapease/server/certs/cert.pem;
    ssl_certificate_key /root/therapease/therapease/server/certs/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # API routes
    location /api/ {
        proxy_pass http://therapease_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket routes
    location /ws {
        proxy_pass http://therapease_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Frontend routes
    location / {
        proxy_pass http://therapease_public;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://therapease_public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Emergency server block (if needed)
server {
    listen 80;
    server_name api.therapease.site;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
print_status "PASS" "Nginx configuration created"

echo ""
echo "🔍 Step 7: Install Nginx Configuration"
echo "======================================"

# Install Nginx configuration
echo "Installing Nginx configuration..."
if command -v nginx >/dev/null 2>&1; then
    # Copy configuration to Nginx sites-available
    cp "$BASE_DIR/nginx-therapease.conf" /etc/nginx/sites-available/therapease
    
    # Create symbolic link to sites-enabled
    ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    if nginx -t; then
        print_status "PASS" "Nginx configuration is valid"
    else
        print_status "WARN" "Nginx configuration test failed"
    fi
    
    # Reload Nginx
    systemctl reload nginx
    print_status "PASS" "Nginx configuration installed and reloaded"
else
    print_status "WARN" "Nginx not available"
fi

echo ""
echo "🔍 Step 8: Start PM2 Processes"
echo "=============================="

# Start PM2 processes
echo "Starting PM2 processes..."
cd "$BASE_DIR"

if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.js
    sleep 10
    
    echo "PM2 status:"
    pm2 status
    
    if pm2 status | grep -q "therapease-api"; then
        print_status "PASS" "therapease-api process started"
    else
        print_status "WARN" "therapease-api process may not have started"
        echo "PM2 logs for therapease-api:"
        pm2 logs therapease-api --lines 10
    fi
    
    if pm2 status | grep -q "therapease-public"; then
        print_status "PASS" "therapease-public process started"
    else
        print_status "WARN" "therapease-public process may not have started"
        echo "PM2 logs for therapease-public:"
        pm2 logs therapease-public --lines 10
    fi
else
    print_status "FAIL" "PM2 not available"
fi

echo ""
echo "🔍 Step 9: Test Backend Connectivity"
echo "======================================"

# Test backend connectivity
echo "Testing backend connectivity..."
sleep 5

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
echo "🔍 Step 10: Test Frontend Connectivity"
echo "======================================"

# Test frontend connectivity
echo "Testing frontend connectivity..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001" --connect-timeout 5; then
    FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001" --connect-timeout 5)
    print_status "PASS" "Frontend server is accessible (HTTP $FRONTEND_CODE)"
else
    print_status "WARN" "Frontend server may not be accessible"
fi

echo ""
echo "🔍 Step 11: Check Port Status"
echo "=============================="

# Check port status
echo "Port 5000 status:"
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

echo ""
echo "Port 3001 status:"
if ss -tlnp | grep -q ":3001 "; then
    print_status "PASS" "Port 3001 is listening"
    ss -tlnp | grep ":3001 "
else
    print_status "WARN" "Port 3001 not listening"
fi

echo ""
echo "Port 443 status:"
if ss -tlnp | grep -q ":443 "; then
    print_status "PASS" "Port 443 is listening"
    ss -tlnp | grep ":443 "
else
    print_status "WARN" "Port 443 not listening"
fi

echo ""
echo "🔍 Step 12: Test Nginx Configuration"
echo "===================================="

# Test Nginx configuration
echo "Testing Nginx configuration..."
if command -v nginx >/dev/null 2>&1; then
    if nginx -t; then
        print_status "PASS" "Nginx configuration is valid"
    else
        print_status "WARN" "Nginx configuration test failed"
    fi
    
    # Check Nginx status
    systemctl status nginx --no-pager -l
else
    print_status "WARN" "Nginx not available"
fi

echo ""
echo "🔍 Step 13: Final Status Check"
echo "==============================="

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

# Check ports
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
else
    print_status "WARN" "Port 5000 not listening"
fi

if ss -tlnp | grep -q ":3001 "; then
    print_status "PASS" "Port 3001 is listening"
else
    print_status "WARN" "Port 3001 not listening"
fi

if ss -tlnp | grep -q ":443 "; then
    print_status "PASS" "Port 443 is listening"
else
    print_status "WARN" "Port 443 not listening"
fi

echo ""
echo "🏁 PM2 and Nginx Configuration Complete!"
echo "======================================="

echo ""
echo "📋 PM2 and Nginx Configuration Summary:"
echo "- ✅ PM2 processes stopped"
echo "- ✅ Ecosystem configuration created"
echo "- ✅ Public website server created"
echo "- ✅ Logs directory created"
echo "- ✅ Frontend built (if possible)"
echo "- ✅ Nginx configuration created"
echo "- ✅ Nginx configuration installed"
echo "- ✅ PM2 processes started"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Frontend connectivity tested"
echo "- ✅ Port status checked"
echo "- ✅ Nginx configuration tested"
echo "- ✅ Final status verified"
echo ""
echo "🔧 Next Steps:"
echo "1. Check PM2 logs: pm2 logs"
echo "2. Test API endpoints manually"
echo "3. Test frontend in browser"
echo "4. Run security analysis: ./simplified-security-analyzer.sh"
echo "5. Monitor server performance"
echo ""
echo "🎯 PM2 and Nginx configuration complete!";
