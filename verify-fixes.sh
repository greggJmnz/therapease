#!/bin/bash

# TherapEase Fixes Verification Script
# This script verifies that all fixes are working correctly

echo "🔍 Verifying TherapEase Fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're on the production server
if [ ! -d "/home/therapease" ]; then
    print_error "This script should be run on the production server"
    exit 1
fi

print_header "Checking Current Configuration"

# Check if latest code is deployed
echo "Checking git status..."
cd /home/therapease/therapease
git log --oneline -1
echo ""

# Check Nginx configuration
echo "Checking Nginx configuration..."
if grep -q "location /ws" /etc/nginx/sites-available/therapease; then
    print_success "WebSocket configuration found in Nginx"
else
    print_error "WebSocket configuration missing in Nginx"
fi

# Check if API subdomain is configured
if grep -q "api.therapease.site" /etc/nginx/sites-available/therapease; then
    print_success "API subdomain configuration found"
else
    print_error "API subdomain configuration missing"
fi

# Check PM2 status
print_header "Checking PM2 Status"
pm2 status

# Check if processes are running
if pm2 list | grep -q "therapease-api.*online"; then
    print_success "API server is running"
else
    print_error "API server is not running"
fi

if pm2 list | grep -q "therapease-public.*online"; then
    print_success "Public server is running"
else
    print_error "Public server is not running"
fi

# Test API endpoints
print_header "Testing API Endpoints"

echo "Testing API health endpoint..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ "$API_RESPONSE" = "200" ]; then
    print_success "API health endpoint responding"
else
    print_error "API health endpoint not responding (HTTP $API_RESPONSE)"
fi

echo "Testing API subdomain..."
API_SUBDOMAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://api.therapease.site/health)
if [ "$API_SUBDOMAIN_RESPONSE" = "200" ]; then
    print_success "API subdomain responding"
else
    print_warning "API subdomain not responding (HTTP $API_SUBDOMAIN_RESPONSE)"
fi

# Check WebSocket endpoint
echo "Testing WebSocket endpoint..."
WS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:5000/ws)
if [ "$WS_RESPONSE" = "101" ] || [ "$WS_RESPONSE" = "400" ]; then
    print_success "WebSocket endpoint responding correctly"
else
    print_warning "WebSocket endpoint response: HTTP $WS_RESPONSE"
fi

# Check client build
print_header "Checking Client Build"
if [ -d "/home/therapease/therapease/client/build" ]; then
    print_success "Client build directory exists"
    
    # Check if build is recent
    BUILD_TIME=$(stat -c %Y /home/therapease/therapease/client/build/index.html 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - BUILD_TIME))
    
    if [ $TIME_DIFF -lt 3600 ]; then
        print_success "Client build is recent (less than 1 hour old)"
    else
        print_warning "Client build is older than 1 hour"
    fi
else
    print_error "Client build directory not found"
fi

# Check for any error logs
print_header "Checking for Errors"
echo "Recent PM2 errors:"
pm2 logs --err --lines 10

echo ""
echo "Recent Nginx errors:"
sudo tail -n 10 /var/log/nginx/error.log 2>/dev/null || echo "No Nginx error log found"

print_header "Verification Complete!"

echo -e "\n${BLUE}Summary:${NC}"
echo "1. Check if all services are running (PM2 status)"
echo "2. Verify API endpoints are responding"
echo "3. Check browser console for any remaining errors"
echo "4. Test the Admin Portal functionality"

echo -e "\n${YELLOW}If issues persist:${NC}"
echo "1. Clear browser cache completely"
echo "2. Check browser developer tools Network tab"
echo "3. Verify requests are going to api.therapease.site"
echo "4. Check WebSocket connection in browser console"
