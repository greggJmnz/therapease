#!/bin/bash

# TherapEase Production Deployment Script
# This script deploys the latest fixes to the production server

echo "🚀 Starting TherapEase Production Deployment..."

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

# Step 1: Pull latest changes
print_header "Step 1: Pulling Latest Changes"
cd /home/therapease/therapease
git pull origin main
if [ $? -eq 0 ]; then
    print_success "Latest changes pulled successfully"
else
    print_error "Failed to pull latest changes"
    exit 1
fi

# Step 2: Update Nginx configuration
print_header "Step 2: Updating Nginx Configuration"
sudo cp /home/therapease/therapease/nginx-therapease.conf /etc/nginx/sites-available/therapease
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    print_success "Nginx configuration updated and reloaded"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 3: Rebuild client application
print_header "Step 3: Rebuilding Client Application"
cd /home/therapease/therapease/client
npm run build
if [ $? -eq 0 ]; then
    print_success "Client application rebuilt successfully"
else
    print_error "Client build failed"
    exit 1
fi

# Step 4: Restart PM2 processes
print_header "Step 4: Restarting PM2 Processes"
cd /home/therapease/therapease
pm2 restart all
if [ $? -eq 0 ]; then
    print_success "PM2 processes restarted successfully"
else
    print_error "Failed to restart PM2 processes"
    exit 1
fi

# Step 5: Verify deployment
print_header "Step 5: Verifying Deployment"
echo "Checking PM2 status..."
pm2 status

echo "Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

echo "Checking if API is responding..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health
if [ $? -eq 0 ]; then
    print_success "API health check passed"
else
    print_warning "API health check failed"
fi

print_header "Deployment Complete!"
print_success "All fixes have been deployed to production"
print_success "Admin Portal should now work correctly"
print_success "WebSocket connections should be established properly"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "1. Clear browser cache and refresh the page"
echo "2. Check browser console for any remaining errors"
echo "3. Verify that API requests go to api.therapease.site"
echo "4. Verify that WebSocket connects to wss://api.therapease.site/ws"

echo -e "\n${YELLOW}If issues persist, check:${NC}"
echo "- PM2 logs: pm2 logs"
echo "- Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Server logs: pm2 logs therapease-api"
