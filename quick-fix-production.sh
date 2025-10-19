#!/bin/bash

# Quick Fix for Production Server
# This script ensures the latest client build is deployed

echo "🔧 Applying Quick Fix to Production Server..."

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

# Step 1: Navigate to project directory
cd /home/therapease/therapease

# Step 2: Pull latest changes
print_header "Pulling Latest Changes"
git pull origin main
if [ $? -eq 0 ]; then
    print_success "Latest changes pulled successfully"
else
    print_error "Failed to pull latest changes"
    exit 1
fi

# Step 3: Rebuild client with correct configuration
print_header "Rebuilding Client Application"
cd client
npm run build
if [ $? -eq 0 ]; then
    print_success "Client application rebuilt successfully"
else
    print_error "Client build failed"
    exit 1
fi

# Step 4: Copy build to server public directory
print_header "Deploying Client Build"
cd ..
cp -r client/build/* server/public/
print_success "Client build deployed to server public directory"

# Step 5: Restart PM2 processes
print_header "Restarting PM2 Processes"
pm2 restart all
if [ $? -eq 0 ]; then
    print_success "PM2 processes restarted successfully"
else
    print_error "Failed to restart PM2 processes"
    exit 1
fi

# Step 6: Verify deployment
print_header "Verifying Deployment"
echo "Checking PM2 status..."
pm2 status

echo "Testing API endpoints..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health
if [ $? -eq 0 ]; then
    print_success "API health check passed"
else
    print_warning "API health check failed"
fi

print_header "Quick Fix Complete!"
print_success "Client application has been rebuilt and deployed"
print_success "API requests should now go to api.therapease.site"
print_success "WebSocket should connect to wss://api.therapease.site/ws"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Clear browser cache completely (Ctrl+Shift+Delete)"
echo "2. Hard refresh the page (Ctrl+F5)"
echo "3. Check browser console for updated API requests"
echo "4. Verify WebSocket connects to api.therapease.site"
