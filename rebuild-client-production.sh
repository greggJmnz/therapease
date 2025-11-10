#!/bin/bash

# Comprehensive script to rebuild and deploy the TherapEase client

set -e

echo "🔄 Rebuilding TherapEase Client for Production"
echo "=============================================="

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Pull latest code
echo ""
echo "📥 Step 1: Pulling latest code from git..."
git pull origin main || {
    echo -e "${YELLOW}⚠️  Warning: git pull failed. Continuing with existing code...${NC}"
}

# Step 2: Navigate to client directory
echo ""
echo "📁 Step 2: Navigating to client directory..."
cd client || {
    echo "❌ Error: Could not navigate to client directory"
    exit 1
}

# Step 3: Install dependencies
echo ""
echo "📦 Step 3: Installing/updating dependencies..."
npm install || {
    echo -e "${RED}❌ Error: npm install failed${NC}"
    exit 1
}

# Step 4: Build the client
echo ""
echo "🔨 Step 4: Building client for production..."
npm run build || {
    echo -e "${RED}❌ Error: Build failed${NC}"
    exit 1
}

# Step 5: Verify build output
echo ""
echo "🔍 Step 5: Verifying build output..."
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: Build output directory 'dist' not found${NC}"
    exit 1
fi

BUILD_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo "   Build size: $BUILD_SIZE"

# Step 6: Copy to server/public
echo ""
echo "📋 Step 6: Copying build files to server/public..."
cd /home/therapease_user/therapease

if [ ! -d "server/public" ]; then
    echo "   Creating server/public directory..."
    mkdir -p server/public
fi

echo "   Copying files..."
rm -rf server/public/*
cp -r client/dist/* server/public/
echo -e "${GREEN}✅ Files copied successfully!${NC}"

# Step 7: Update service worker cache version
echo ""
echo "📋 Step 7: Updating service worker cache version..."
if [ -f "server/public/sw.js" ]; then
    # Update cache version in service worker
    sed -i "s/CACHE_NAME = 'therapease-v[0-9]*'/CACHE_NAME = 'therapease-v3'/" server/public/sw.js
    echo -e "${GREEN}✅ Service worker cache version updated${NC}"
fi

# Step 8: Restart PM2
echo ""
echo "🔄 Step 8: Restarting PM2..."
pm2 restart therapease-api --update-env || {
    echo -e "${YELLOW}⚠️  Warning: PM2 restart failed. You may need to restart manually.${NC}"
}

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo -e "${GREEN}✅ Client rebuild and deployment completed!${NC}"
echo ""
echo "📋 What was done:"
echo "   1. ✅ Pulled latest code from git"
echo "   2. ✅ Installed/updated dependencies"
echo "   3. ✅ Built client for production"
echo "   4. ✅ Copied build files to server/public"
echo "   5. ✅ Updated service worker cache version"
echo "   6. ✅ Restarted PM2"
echo ""
echo "🧪 Next steps:"
echo "   1. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)"
echo "   2. Unregister service worker (DevTools > Application > Service Workers)"
echo "   3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   4. Or use incognito/private window"
echo ""
echo "📋 Check the application:"
echo "   - Open: https://therapease.site"
echo "   - Verify: Combined User Management dropdown"
echo "   - Verify: Updated header style"
echo "   - Verify: No test login credentials"

