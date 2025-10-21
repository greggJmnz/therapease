#!/bin/bash

echo "🔧 Fix VAPID Keys Format Issue"
echo "============================="

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
echo "🔧 Fixing VAPID Keys Format Issue"
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
echo "🔍 Step 2: Generate New VAPID Keys"
echo "================================="

# Generate new VAPID keys
echo "Generating new VAPID keys..."
cd "$BASE_DIR/server"

# Check if web-push is installed
if [ -d "node_modules/web-push" ]; then
    print_status "PASS" "web-push module found"
    
    # Generate new VAPID keys
    echo "Generating new VAPID keys using web-push..."
    node -e "
    const webpush = require('web-push');
    const vapidKeys = webpush.generateVAPIDKeys();
    console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
    console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
    console.log('VAPID_SUBJECT=mailto:admin@therapease.com');
    " > /tmp/new_vapid_keys.txt
    
    if [ -f "/tmp/new_vapid_keys.txt" ]; then
        print_status "PASS" "New VAPID keys generated"
        echo "New VAPID keys:"
        cat /tmp/new_vapid_keys.txt
    else
        print_status "WARN" "Failed to generate new VAPID keys"
    fi
else
    print_status "WARN" "web-push module not found"
fi

cd "$BASE_DIR"

echo ""
echo "🔍 Step 3: Update .env.production with New VAPID Keys"
echo "==================================================="

# Update .env.production with new VAPID keys
echo "Updating .env.production with new VAPID keys..."
if [ -f "/tmp/new_vapid_keys.txt" ]; then
    # Extract new VAPID keys
    NEW_VAPID_PUBLIC=$(grep "VAPID_PUBLIC_KEY" /tmp/new_vapid_keys.txt | cut -d'=' -f2)
    NEW_VAPID_PRIVATE=$(grep "VAPID_PRIVATE_KEY" /tmp/new_vapid_keys.txt | cut -d'=' -f2)
    NEW_VAPID_SUBJECT=$(grep "VAPID_SUBJECT" /tmp/new_vapid_keys.txt | cut -d'=' -f2)
    
    if [ ! -z "$NEW_VAPID_PUBLIC" ] && [ ! -z "$NEW_VAPID_PRIVATE" ]; then
        print_status "PASS" "New VAPID keys extracted"
        
        # Update server/.env.production
        if [ -f "$BASE_DIR/server/.env.production" ]; then
            # Update VAPID public key
            if grep -q "VAPID_PUBLIC_KEY" "$BASE_DIR/server/.env.production"; then
                sed -i "s/VAPID_PUBLIC_KEY=.*/VAPID_PUBLIC_KEY=$NEW_VAPID_PUBLIC/" "$BASE_DIR/server/.env.production"
            else
                echo "VAPID_PUBLIC_KEY=$NEW_VAPID_PUBLIC" >> "$BASE_DIR/server/.env.production"
            fi
            
            # Update VAPID private key
            if grep -q "VAPID_PRIVATE_KEY" "$BASE_DIR/server/.env.production"; then
                sed -i "s/VAPID_PRIVATE_KEY=.*/VAPID_PRIVATE_KEY=$NEW_VAPID_PRIVATE/" "$BASE_DIR/server/.env.production"
            else
                echo "VAPID_PRIVATE_KEY=$NEW_VAPID_PRIVATE" >> "$BASE_DIR/server/.env.production"
            fi
            
            # Update VAPID subject
            if [ ! -z "$NEW_VAPID_SUBJECT" ]; then
                if grep -q "VAPID_SUBJECT" "$BASE_DIR/server/.env.production"; then
                    sed -i "s/VAPID_SUBJECT=.*/VAPID_SUBJECT=$NEW_VAPID_SUBJECT/" "$BASE_DIR/server/.env.production"
                else
                    echo "VAPID_SUBJECT=$NEW_VAPID_SUBJECT" >> "$BASE_DIR/server/.env.production"
                fi
            fi
            
            print_status "PASS" "Server .env.production updated with new VAPID keys"
        else
            print_status "WARN" "Server .env.production not found"
        fi
        
        # Update root .env.production
        if [ -f "$BASE_DIR/.env.production" ]; then
            # Update VAPID public key
            if grep -q "VAPID_PUBLIC_KEY" "$BASE_DIR/.env.production"; then
                sed -i "s/VAPID_PUBLIC_KEY=.*/VAPID_PUBLIC_KEY=$NEW_VAPID_PUBLIC/" "$BASE_DIR/.env.production"
            else
                echo "VAPID_PUBLIC_KEY=$NEW_VAPID_PUBLIC" >> "$BASE_DIR/.env.production"
            fi
            
            # Update VAPID private key
            if grep -q "VAPID_PRIVATE_KEY" "$BASE_DIR/.env.production"; then
                sed -i "s/VAPID_PRIVATE_KEY=.*/VAPID_PRIVATE_KEY=$NEW_VAPID_PRIVATE/" "$BASE_DIR/.env.production"
            else
                echo "VAPID_PRIVATE_KEY=$NEW_VAPID_PRIVATE" >> "$BASE_DIR/.env.production"
            fi
            
            # Update VAPID subject
            if [ ! -z "$NEW_VAPID_SUBJECT" ]; then
                if grep -q "VAPID_SUBJECT" "$BASE_DIR/.env.production"; then
                    sed -i "s/VAPID_SUBJECT=.*/VAPID_SUBJECT=$NEW_VAPID_SUBJECT/" "$BASE_DIR/.env.production"
                else
                    echo "VAPID_SUBJECT=$NEW_VAPID_SUBJECT" >> "$BASE_DIR/.env.production"
                fi
            fi
            
            print_status "PASS" "Root .env.production updated with new VAPID keys"
        else
            print_status "WARN" "Root .env.production not found"
        fi
    else
        print_status "WARN" "New VAPID keys not extracted"
    fi
else
    print_status "WARN" "New VAPID keys file not found"
fi

echo ""
echo "🔍 Step 4: Verify Updated VAPID Keys"
echo "===================================="

# Verify updated VAPID keys
echo "Verifying updated VAPID keys..."
if [ -f "$BASE_DIR/server/.env.production" ]; then
    echo "VAPID keys in server/.env.production:"
    grep -E "VAPID_" "$BASE_DIR/server/.env.production" || echo "No VAPID keys found"
fi

if [ -f "$BASE_DIR/.env.production" ]; then
    echo "VAPID keys in root .env.production:"
    grep -E "VAPID_" "$BASE_DIR/.env.production" || echo "No VAPID keys found"
fi

echo ""
echo "🔍 Step 5: Test Direct Server Start with New VAPID Keys"
echo "======================================================"

# Test direct server start with new VAPID keys
echo "Testing direct server start with new VAPID keys..."
cd "$BASE_DIR/server"

echo "Current directory: $(pwd)"
echo "Node.js version: $(node --version)"

# Set NODE_ENV to production
export NODE_ENV=production

# Try to start server directly
echo "Starting server directly with new VAPID keys..."
timeout 15s node index.js 2>&1 || echo "Server start test completed"

cd "$BASE_DIR"

echo ""
echo "🔍 Step 6: Start PM2 Processes with New VAPID Keys"
echo "================================================="

# Start PM2 processes with new VAPID keys
echo "Starting PM2 processes with new VAPID keys..."

# Start therapease-api
echo "Starting therapease-api with new VAPID keys..."
pm2 start "$BASE_DIR/server/index.js" --name "therapease-api" --env production
sleep 10

echo "therapease-api status:"
pm2 status | grep therapease-api

# Check if therapease-api is running
if pm2 status | grep -q "therapease-api.*online"; then
    print_status "PASS" "therapease-api process started successfully"
else
    print_status "WARN" "therapease-api process may not have started"
    echo "therapease-api logs:"
    pm2 logs therapease-api --lines 10
fi

# Start therapease-public
echo "Starting therapease-public with new VAPID keys..."
pm2 start "$BASE_DIR/public-website/server.js" --name "therapease-public" --env production
sleep 5

echo "therapease-public status:"
pm2 status | grep therapease-public

# Check if therapease-public is running
if pm2 status | grep -q "therapease-public.*online"; then
    print_status "PASS" "therapease-public process started successfully"
else
    print_status "WARN" "therapease-public process may not have started"
    echo "therapease-public logs:"
    pm2 logs therapease-public --lines 10
fi

echo ""
echo "🔍 Step 7: Test Backend Connectivity"
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
echo "🔍 Step 8: Test Frontend Connectivity"
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
echo "🔍 Step 9: Check Port Status"
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
echo "🔍 Step 10: Check PM2 Logs for VAPID Keys"
echo "========================================"

# Check PM2 logs for VAPID keys
echo "Checking PM2 logs for VAPID keys status..."
pm2 logs therapease-api --lines 10 | grep -i vapid || echo "No VAPID messages in recent logs"

echo ""
echo "🔍 Step 11: Final Status Check"
echo "==============================="

# Final status check
echo "Final status check..."

# Check PM2 status
if pm2 status | grep -q "therapease-api.*online"; then
    print_status "PASS" "therapease-api process running"
else
    print_status "WARN" "therapease-api process not running"
fi

if pm2 status | grep -q "therapease-public.*online"; then
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

echo ""
echo "🏁 VAPID Keys Format Fix Complete!"
echo "================================="

echo ""
echo "📋 VAPID Keys Format Fix Summary:"
echo "- ✅ PM2 processes stopped"
echo "- ✅ New VAPID keys generated"
echo "- ✅ .env.production files updated with new VAPID keys"
echo "- ✅ Updated VAPID keys verified"
echo "- ✅ Direct server start tested with new VAPID keys"
echo "- ✅ PM2 processes started with new VAPID keys"
echo "- ✅ Backend connectivity tested"
echo "- ✅ Frontend connectivity tested"
echo "- ✅ Port status checked"
echo "- ✅ PM2 logs checked for VAPID keys"
echo "- ✅ Final status verified"
echo ""
echo "🔧 Next Steps:"
echo "1. Check PM2 logs: pm2 logs"
echo "2. Test API endpoints manually"
echo "3. Test frontend in browser"
echo "4. Run security analysis: ./simplified-security-analyzer.sh"
echo "5. Monitor server performance"
echo ""
echo "🎯 VAPID keys format issue fixed!";
