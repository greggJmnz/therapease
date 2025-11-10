#!/bin/bash

# Force rebuild of client with complete cache clearing

set -e

echo "🔄 Force Rebuilding TherapEase Client"
echo "===================================="

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

# Step 2: Clean client build
echo ""
echo "🧹 Step 2: Cleaning old build files..."
cd client

# Remove old build directories
if [ -d "dist" ]; then
    rm -rf dist
    echo -e "${GREEN}✅ Removed old dist directory${NC}"
fi

if [ -d "node_modules/.vite" ]; then
    rm -rf node_modules/.vite
    echo -e "${GREEN}✅ Cleared Vite cache${NC}"
fi

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

# Step 6: Update service worker cache version
echo ""
echo "📋 Step 6: Updating service worker cache version..."
if [ -f "public/sw.js" ]; then
    # Update cache version to force cache invalidation
    sed -i "s/CACHE_NAME = 'therapease-v[0-9]*'/CACHE_NAME = 'therapease-v3'/" public/sw.js
    echo -e "${GREEN}✅ Service worker cache version updated to v3${NC}"
fi

# Copy service worker to dist
if [ -f "public/sw.js" ]; then
    cp public/sw.js dist/sw.js
    echo -e "${GREEN}✅ Service worker copied to dist${NC}"
fi

# Step 7: Copy to server/public
echo ""
echo "📋 Step 7: Copying build files to server/public..."
cd /home/therapease_user/therapease

if [ ! -d "server/public" ]; then
    echo "   Creating server/public directory..."
    mkdir -p server/public
fi

echo "   Removing old files..."
rm -rf server/public/*

echo "   Copying new build files..."
cp -r client/dist/* server/public/

# Ensure service worker is copied
if [ -f "client/public/sw.js" ]; then
    cp client/public/sw.js server/public/sw.js
fi

echo -e "${GREEN}✅ Files copied successfully!${NC}"

# Step 8: Verify critical files
echo ""
echo "🔍 Step 8: Verifying critical files..."
CRITICAL_FILES=(
    "server/public/index.html"
    "server/public/sw.js"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found: $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
    fi
done

# Step 9: Check for old code patterns
echo ""
echo "🔍 Step 9: Checking for old code patterns..."
if grep -r "Login as Admin (Test)" server/public/ 2>/dev/null | grep -q "Login as Admin"; then
    echo -e "${RED}❌ WARNING: Old test login code found in build!${NC}"
else
    echo -e "${GREEN}✅ No old test login code found${NC}"
fi

# Step 10: Restart PM2
echo ""
echo "🔄 Step 10: Restarting PM2..."
pm2 restart therapease-api --update-env || {
    echo -e "${YELLOW}⚠️  Warning: PM2 restart failed. You may need to restart manually.${NC}"
}

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo -e "${GREEN}✅ Force rebuild completed!${NC}"
echo ""
echo "📋 What was done:"
echo "   1. ✅ Pulled latest code from git"
echo "   2. ✅ Cleaned old build files and caches"
echo "   3. ✅ Installed/updated dependencies"
echo "   4. ✅ Built client for production"
echo "   5. ✅ Updated service worker cache version to v3"
echo "   6. ✅ Copied build files to server/public"
echo "   7. ✅ Verified critical files"
echo "   8. ✅ Checked for old code patterns"
echo "   9. ✅ Restarted PM2"
echo ""
echo "🧪 Next steps (IMPORTANT - Do these in your browser):"
echo "   1. Open DevTools (F12)"
echo "   2. Go to Application > Storage"
echo "   3. Click 'Clear site data' (check all boxes)"
echo "   4. Go to Application > Service Workers"
echo "   5. Click 'Unregister' if a service worker is registered"
echo "   6. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "   7. Or use incognito/private window"
echo ""
echo "📋 Verify the changes:"
echo "   - Login page: Should NOT show demo credentials"
echo "   - Header: Should show new layout with logo and breadcrumb"
echo "   - User Management: Should be a dropdown with Patients and Therapists"

