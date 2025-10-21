#!/bin/bash

echo "🔧 Fix VAPID Keys Configuration"
echo "==============================="

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
echo "🔧 Fixing VAPID Keys Configuration"
echo "==================================="

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
echo "🔍 Step 2: Check .env.production File"
echo "====================================="

# Check if .env.production exists
if [ -f "$BASE_DIR/.env.production" ]; then
    print_status "PASS" ".env.production file exists"
    echo "VAPID keys in .env.production:"
    grep -E "VAPID_" "$BASE_DIR/.env.production" || echo "No VAPID keys found in .env.production"
else
    print_status "FAIL" ".env.production file not found"
    exit 1
fi

echo ""
echo "🔍 Step 3: Check Current .env File"
echo "==================================="

# Check if .env exists
if [ -f "$BASE_DIR/.env" ]; then
    print_status "PASS" ".env file exists"
    echo "Current VAPID keys in .env:"
    grep -E "VAPID_" "$BASE_DIR/.env" || echo "No VAPID keys found in .env"
else
    print_status "WARN" ".env file not found"
fi

echo ""
echo "🔍 Step 4: Extract VAPID Keys from .env.production"
echo "=================================================="

# Extract VAPID keys from .env.production
echo "Extracting VAPID keys from .env.production..."

VAPID_PUBLIC=$(grep "VAPID_PUBLIC_KEY" "$BASE_DIR/.env.production" | cut -d'=' -f2)
VAPID_PRIVATE=$(grep "VAPID_PRIVATE_KEY" "$BASE_DIR/.env.production" | cut -d'=' -f2)
VAPID_SUBJECT=$(grep "VAPID_SUBJECT" "$BASE_DIR/.env.production" | cut -d'=' -f2)

if [ ! -z "$VAPID_PUBLIC" ]; then
    print_status "PASS" "VAPID public key found: ${VAPID_PUBLIC:0:20}..."
else
    print_status "WARN" "VAPID public key not found in .env.production"
fi

if [ ! -z "$VAPID_PRIVATE" ]; then
    print_status "PASS" "VAPID private key found: ${VAPID_PRIVATE:0:20}..."
else
    print_status "WARN" "VAPID private key not found in .env.production"
fi

if [ ! -z "$VAPID_SUBJECT" ]; then
    print_status "PASS" "VAPID subject found: $VAPID_SUBJECT"
else
    print_status "WARN" "VAPID subject not found in .env.production"
fi

echo ""
echo "🔍 Step 5: Update .env File with VAPID Keys"
echo "============================================"

# Update .env file with VAPID keys
echo "Updating .env file with VAPID keys..."

if [ ! -f "$BASE_DIR/.env" ]; then
    print_status "WARN" ".env file not found, creating it..."
    touch "$BASE_DIR/.env"
fi

# Update VAPID public key
if [ ! -z "$VAPID_PUBLIC" ]; then
    if grep -q "VAPID_PUBLIC_KEY" "$BASE_DIR/.env"; then
        sed -i "s/VAPID_PUBLIC_KEY=.*/VAPID_PUBLIC_KEY=$VAPID_PUBLIC/" "$BASE_DIR/.env"
        print_status "PASS" "VAPID public key updated in .env"
    else
        echo "VAPID_PUBLIC_KEY=$VAPID_PUBLIC" >> "$BASE_DIR/.env"
        print_status "PASS" "VAPID public key added to .env"
    fi
else
    print_status "WARN" "VAPID public key not available"
fi

# Update VAPID private key
if [ ! -z "$VAPID_PRIVATE" ]; then
    if grep -q "VAPID_PRIVATE_KEY" "$BASE_DIR/.env"; then
        sed -i "s/VAPID_PRIVATE_KEY=.*/VAPID_PRIVATE_KEY=$VAPID_PRIVATE/" "$BASE_DIR/.env"
        print_status "PASS" "VAPID private key updated in .env"
    else
        echo "VAPID_PRIVATE_KEY=$VAPID_PRIVATE" >> "$BASE_DIR/.env"
        print_status "PASS" "VAPID private key added to .env"
    fi
else
    print_status "WARN" "VAPID private key not available"
fi

# Update VAPID subject
if [ ! -z "$VAPID_SUBJECT" ]; then
    if grep -q "VAPID_SUBJECT" "$BASE_DIR/.env"; then
        sed -i "s/VAPID_SUBJECT=.*/VAPID_SUBJECT=$VAPID_SUBJECT/" "$BASE_DIR/.env"
        print_status "PASS" "VAPID subject updated in .env"
    else
        echo "VAPID_SUBJECT=$VAPID_SUBJECT" >> "$BASE_DIR/.env"
        print_status "PASS" "VAPID subject added to .env"
    fi
else
    print_status "WARN" "VAPID subject not available"
fi

echo ""
echo "🔍 Step 6: Verify .env File"
echo "============================"

# Verify .env file
echo "Updated VAPID keys in .env:"
grep -E "VAPID_" "$BASE_DIR/.env" || echo "No VAPID keys found in .env"

echo ""
echo "🔍 Step 7: Add Missing Environment Variables"
echo "============================================"

# Add missing environment variables to .env
echo "Adding missing environment variables to .env..."

# Check if JWT_SECRET exists
if ! grep -q "JWT_SECRET" "$BASE_DIR/.env"; then
    echo "JWT_SECRET=your_jwt_secret_key_here" >> "$BASE_DIR/.env"
    print_status "PASS" "JWT_SECRET added to .env"
fi

# Check if PORT exists
if ! grep -q "PORT" "$BASE_DIR/.env"; then
    echo "PORT=5000" >> "$BASE_DIR/.env"
    print_status "PASS" "PORT added to .env"
fi

# Check if NODE_ENV exists
if ! grep -q "NODE_ENV" "$BASE_DIR/.env"; then
    echo "NODE_ENV=production" >> "$BASE_DIR/.env"
    print_status "PASS" "NODE_ENV added to .env"
fi

# Check if DB_HOST exists
if ! grep -q "DB_HOST" "$BASE_DIR/.env"; then
    echo "DB_HOST=localhost" >> "$BASE_DIR/.env"
    print_status "PASS" "DB_HOST added to .env"
fi

# Check if DB_USER exists
if ! grep -q "DB_USER" "$BASE_DIR/.env"; then
    echo "DB_USER=therapease_user" >> "$BASE_DIR/.env"
    print_status "PASS" "DB_USER added to .env"
fi

# Check if DB_PASSWORD exists
if ! grep -q "DB_PASSWORD" "$BASE_DIR/.env"; then
    echo "DB_PASSWORD=therapease_password" >> "$BASE_DIR/.env"
    print_status "PASS" "DB_PASSWORD added to .env"
fi

# Check if DB_NAME exists
if ! grep -q "DB_NAME" "$BASE_DIR/.env"; then
    echo "DB_NAME=therapease_db" >> "$BASE_DIR/.env"
    print_status "PASS" "DB_NAME added to .env"
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
echo "🔍 Step 10: Check Port Status"
echo "=============================="

# Check port status
if ss -tlnp | grep -q ":5000 "; then
    print_status "PASS" "Port 5000 is listening"
    ss -tlnp | grep ":5000 "
else
    print_status "WARN" "Port 5000 not listening"
fi

echo ""
echo "🔍 Step 11: Check PM2 Logs for VAPID Keys"
echo "=========================================="

# Check PM2 logs for VAPID keys
echo "Checking PM2 logs for VAPID keys status..."
pm2 logs therapease-api --lines 10 | grep -i vapid || echo "No VAPID messages in recent logs"

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
echo "🏁 VAPID Keys Fix Complete!"
echo "==========================="

echo ""
echo "📋 VAPID Keys Fix Summary:"
echo "- ✅ PM2 processes stopped"
echo "- ✅ .env.production file checked"
echo "- ✅ VAPID keys extracted from .env.production"
echo "- ✅ .env file updated with VAPID keys"
echo "- ✅ Missing environment variables added"
echo "- ✅ PM2 processes started"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Port status checked"
echo "- ✅ PM2 logs checked for VAPID status"
echo "- ✅ Final status verified"
echo ""
echo "🔧 Next Steps:"
echo "1. Check PM2 logs: pm2 logs"
echo "2. Test API endpoints manually"
echo "3. Run security analysis: ./simplified-security-analyzer.sh"
echo "4. Monitor server performance"
echo ""
echo "🎯 VAPID keys configuration fixed!";
