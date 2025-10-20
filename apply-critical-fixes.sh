#!/bin/bash

echo "🚀 TherapEase Critical Fixes Application"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "server/index.js" ]; then
    print_error "Not in the correct directory. Please run this from /home/therapease/therapease"
    exit 1
fi

print_status "1. 🔄 Pulling latest changes from GitHub..."
git pull origin main
if [ $? -eq 0 ]; then
    print_success "Git pull successful"
else
    print_error "Git pull failed"
    exit 1
fi

print_status "2. 🔄 Restarting PM2 processes to apply fixes..."
pm2 restart therapease-api
if [ $? -eq 0 ]; then
    print_success "PM2 restart successful"
else
    print_error "PM2 restart failed"
    exit 1
fi

print_status "3. ⏳ Waiting for server to start..."
sleep 5

print_status "4. 🧪 Testing server binding..."
# Test localhost
curl -s -o /dev/null -w "Localhost:5000 - %{http_code}\n" http://localhost:5000/health
curl -s -o /dev/null -w "127.0.0.1:5000 - %{http_code}\n" http://127.0.0.1:5000/health

print_status "5. 🔌 Testing WebSocket endpoint..."
WS_RESPONSE=$(curl -s -w "%{http_code}" https://therapease.site/ws)
WS_STATUS=${WS_RESPONSE: -3}
WS_BODY=${WS_RESPONSE%???}

if [ "$WS_STATUS" = "426" ]; then
    print_success "WebSocket endpoint: CORRECT (426 Upgrade Required)"
elif [ "$WS_STATUS" = "400" ]; then
    print_success "WebSocket endpoint: CORRECT (400 Bad Request - expects token)"
elif echo "$WS_BODY" | grep -q "<!doctype html>"; then
    print_error "WebSocket endpoint: WRONG (still returns HTML)"
else
    print_warning "WebSocket endpoint: UNEXPECTED (Status: $WS_STATUS)"
fi

print_status "6. 🔑 Testing API endpoints..."
# Test auth endpoint
AUTH_RESPONSE=$(curl -s -w "%{http_code}" https://therapease.site/api/auth/test)
AUTH_STATUS=${AUTH_RESPONSE: -3}
if [ "$AUTH_STATUS" = "200" ]; then
    print_success "Auth endpoint: OK"
else
    print_error "Auth endpoint: FAILED ($AUTH_STATUS)"
fi

# Test login endpoint
LOGIN_RESPONSE=$(curl -s -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' \
  -w "%{http_code}")
LOGIN_STATUS=${LOGIN_RESPONSE: -3}
if [ "$LOGIN_STATUS" = "200" ]; then
    print_success "Login endpoint: OK"
else
    print_error "Login endpoint: FAILED ($LOGIN_STATUS)"
fi

print_status "7. 📊 Checking PM2 status..."
pm2 status

print_status "8. 📋 Recent logs (last 10 lines)..."
pm2 logs therapease-api --lines 10 --nostream

echo ""
print_status "🎯 CRITICAL FIXES SUMMARY"
echo "=============================="

# Check if fixes worked
LOCAL_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
EXTERNAL_AUTH=$(curl -s -o /dev/null -w "%{http_code}" https://therapease.site/api/auth/test)

if [ "$LOCAL_HEALTH" = "200" ] && [ "$EXTERNAL_AUTH" = "200" ]; then
    print_success "🎉 ALL CRITICAL FIXES SUCCESSFUL!"
    echo ""
    print_success "✅ Server binding fixed (accessible to Nginx)"
    print_success "✅ API endpoints working"
    print_success "✅ 502 errors resolved"
    if [ "$WS_STATUS" = "426" ] || [ "$WS_STATUS" = "400" ]; then
        print_success "✅ WebSocket endpoint fixed"
    else
        print_warning "⚠️  WebSocket endpoint may need additional attention"
    fi
    echo ""
    print_status "🚀 Your TherapEase application should now be fully functional!"
    print_status "🌐 Visit: https://therapease.site"
    print_status "👤 Login: admin@therapease.com / SecureAdmin2024!@#$"
else
    print_error "⚠️  Some issues remain:"
    if [ "$LOCAL_HEALTH" != "200" ]; then
        print_error "- Server binding issue (localhost not accessible)"
    fi
    if [ "$EXTERNAL_AUTH" != "200" ]; then
        print_error "- External API access issue (502 error)"
    fi
    echo ""
    print_warning "Check the logs above for specific error messages"
fi

echo ""
print_status "💡 Next steps:"
print_status "1. Test the admin portal at https://therapease.site"
print_status "2. Try logging in with admin credentials"
print_status "3. Check if all admin sections work properly"
print_status "4. Test WebSocket connections for real-time features"
