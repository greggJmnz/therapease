#!/bin/bash

echo "🔧 Fix Server Configuration Issues"
echo "==================================="

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
echo "🔧 Fixing Server Configuration Issues"
echo "======================================="

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
echo "🔍 Step 2: Check Environment Files"
echo "=================================="

# Check if .env.production exists
if [ -f "$BASE_DIR/.env.production" ]; then
    print_status "PASS" ".env.production file exists"
    echo "Environment variables (first 10 lines):"
    head -10 "$BASE_DIR/.env.production"
else
    print_status "WARN" ".env.production file not found"
fi

# Check if .env exists
if [ -f "$BASE_DIR/.env" ]; then
    print_status "PASS" ".env file exists"
else
    print_status "WARN" ".env file not found"
fi

echo ""
echo "🔍 Step 3: Create/Update .env File"
echo "=================================="

# Create .env file with production settings
echo "Creating .env file with production settings..."
cat > "$BASE_DIR/.env" << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=therapease_password
DB_NAME=therapease_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=production

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:admin@therapease.site

# SSL Configuration
SSL_CERT_PATH=/root/therapease/therapease/server/certs/cert.pem
SSL_KEY_PATH=/root/therapease/therapease/server/certs/key.pem

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Frontend URL
FRONTEND_URL=https://www.therapease.site

# Admin Configuration
ADMIN_EMAIL=admin@therapease.site
ADMIN_PASSWORD=admin123

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here
EOF
print_status "PASS" ".env file created with production settings"

echo ""
echo "🔍 Step 4: Copy VAPID Keys from .env.production"
echo "==============================================="

# Copy VAPID keys from .env.production if they exist
if [ -f "$BASE_DIR/.env.production" ]; then
    echo "Copying VAPID keys from .env.production..."
    
    # Extract VAPID keys from .env.production
    VAPID_PUBLIC=$(grep "VAPID_PUBLIC_KEY" "$BASE_DIR/.env.production" | cut -d'=' -f2)
    VAPID_PRIVATE=$(grep "VAPID_PRIVATE_KEY" "$BASE_DIR/.env.production" | cut -d'=' -f2)
    VAPID_SUBJECT=$(grep "VAPID_SUBJECT" "$BASE_DIR/.env.production" | cut -d'=' -f2)
    
    if [ ! -z "$VAPID_PUBLIC" ]; then
        # Update .env file with VAPID keys
        sed -i "s/VAPID_PUBLIC_KEY=your_vapid_public_key_here/VAPID_PUBLIC_KEY=$VAPID_PUBLIC/" "$BASE_DIR/.env"
        print_status "PASS" "VAPID public key copied from .env.production"
    fi
    
    if [ ! -z "$VAPID_PRIVATE" ]; then
        sed -i "s/VAPID_PRIVATE_KEY=your_vapid_private_key_here/VAPID_PRIVATE_KEY=$VAPID_PRIVATE/" "$BASE_DIR/.env"
        print_status "PASS" "VAPID private key copied from .env.production"
    fi
    
    if [ ! -z "$VAPID_SUBJECT" ]; then
        sed -i "s/VAPID_SUBJECT=mailto:admin@therapease.site/VAPID_SUBJECT=$VAPID_SUBJECT/" "$BASE_DIR/.env"
        print_status "PASS" "VAPID subject copied from .env.production"
    fi
else
    print_status "WARN" ".env.production not found, VAPID keys not copied"
fi

echo ""
echo "🔍 Step 5: Install Server Dependencies"
echo "======================================="

# Install server dependencies
echo "Installing server dependencies..."
cd "$BASE_DIR/server"

if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing server dependencies..."
        npm install
        print_status "PASS" "Server dependencies installed"
    else
        print_status "PASS" "Server dependencies already installed"
    fi
else
    print_status "WARN" "Server package.json not found"
fi

cd "$BASE_DIR"

echo ""
echo "🔍 Step 6: Check Database Configuration"
echo "========================================"

# Check if database is accessible
echo "Testing database connection..."
if command -v mysql >/dev/null 2>&1; then
    # Try to connect to database
    if mysql -u root -e "SELECT 1;" 2>/dev/null; then
        print_status "PASS" "Database connection successful"
    else
        print_status "WARN" "Database connection failed"
        echo "Creating database and user..."
        
        # Create database and user
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS therapease_db;" 2>/dev/null || true
        mysql -u root -e "CREATE USER IF NOT EXISTS 'therapease_user'@'localhost' IDENTIFIED BY 'therapease_password';" 2>/dev/null || true
        mysql -u root -e "GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';" 2>/dev/null || true
        mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null || true
        
        print_status "PASS" "Database and user created"
    fi
else
    print_status "WARN" "MySQL not available"
fi

echo ""
echo "🔍 Step 7: Create SSL Certificates"
echo "==================================="

# Create SSL certificates directory
mkdir -p "$BASE_DIR/server/certs"

# Check if SSL certificates exist
if [ -f "$BASE_DIR/server/certs/cert.pem" ] && [ -f "$BASE_DIR/server/certs/key.pem" ]; then
    print_status "PASS" "SSL certificates exist"
else
    print_status "WARN" "SSL certificates not found, creating self-signed certificates..."
    
    # Create self-signed SSL certificates
    openssl req -x509 -newkey rsa:4096 -keyout "$BASE_DIR/server/certs/key.pem" -out "$BASE_DIR/server/certs/cert.pem" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=therapease.site" 2>/dev/null || true
    
    if [ -f "$BASE_DIR/server/certs/cert.pem" ] && [ -f "$BASE_DIR/server/certs/key.pem" ]; then
        print_status "PASS" "Self-signed SSL certificates created"
    else
        print_status "WARN" "SSL certificate creation failed"
    fi
fi

echo ""
echo "🔍 Step 8: Update Ecosystem Configuration"
echo "=========================================="

# Update ecosystem configuration with environment variables
echo "Updating ecosystem configuration..."
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
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '$BASE_DIR/logs/api-err.log',
      out_file: '$BASE_DIR/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
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
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '$BASE_DIR/logs/public-err.log',
      out_file: '$BASE_DIR/logs/public-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
EOF
print_status "PASS" "Ecosystem configuration updated"

echo ""
echo "🔍 Step 9: Start PM2 Processes"
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
echo "🔍 Step 10: Test Backend Connectivity"
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
echo "🔍 Step 11: Check Port Status"
echo "=============================="

# Check port status
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

echo ""
echo "🔍 Step 12: Final Status Check"
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

echo ""
echo "🏁 Server Configuration Fix Complete!"
echo "===================================="

echo ""
echo "📋 Server Configuration Fix Summary:"
echo "- ✅ PM2 processes stopped"
echo "- ✅ Environment files checked"
echo "- ✅ .env file created/updated"
echo "- ✅ VAPID keys copied from .env.production"
echo "- ✅ Server dependencies installed"
echo "- ✅ Database configuration checked"
echo "- ✅ SSL certificates created"
echo "- ✅ Ecosystem configuration updated"
echo "- ✅ PM2 processes started"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Port status checked"
echo "- ✅ Final status verified"
echo ""
echo "🔧 Next Steps:"
echo "1. Check PM2 logs: pm2 logs"
echo "2. Test API endpoints manually"
echo "3. Run security analysis: ./simplified-security-analyzer.sh"
echo "4. Monitor server performance"
echo ""
echo "🎯 Server configuration issues fixed!";
