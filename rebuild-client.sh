#!/bin/bash

# Script to rebuild the TherapEase client on the VPS
# This ensures the latest WebSocket fixes are deployed

set -e  # Exit on error

echo "🔄 Rebuilding TherapEase Client"
echo "================================"

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to /home/therapease_user/therapease"
    exit 1
}

# Pull latest code from git
echo ""
echo "📥 Pulling latest code from git..."
git pull origin main || {
    echo "⚠️  Warning: git pull failed. Continuing with existing code..."
}

# Navigate to client directory
echo ""
echo "📁 Navigating to client directory..."
cd client || {
    echo "❌ Error: Could not navigate to client directory"
    exit 1
}

# Install dependencies (if needed)
echo ""
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "   Installing/updating dependencies..."
    npm install
else
    echo "   ✅ Dependencies are up to date"
fi

# Build the client
echo ""
echo "🔨 Building client for production..."
npm run build || {
    echo "❌ Error: Build failed"
    exit 1
}

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Error: Build output directory 'dist' not found"
    exit 1
fi

echo ""
echo "✅ Client build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. The build output is in: $(pwd)/dist"
echo "   2. The server should serve files from: server/public"
echo "   3. Copy dist files to server/public if needed"
echo ""
echo "🔍 Checking if server/public exists..."

cd /home/therapease_user/therapease

if [ -d "server/public" ]; then
    echo "   ✅ server/public exists"
    echo ""
    echo "📋 To update server files, run:"
    echo "   cp -r client/dist/* server/public/"
    echo ""
    read -p "   Copy build files to server/public now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   Copying files..."
        cp -r client/dist/* server/public/
        echo "   ✅ Files copied successfully"
        echo ""
        echo "🔄 Restarting PM2 to apply changes..."
        pm2 restart therapease-api || {
            echo "⚠️  Warning: PM2 restart failed. You may need to restart manually."
        }
        echo "   ✅ PM2 restarted"
    fi
else
    echo "   ⚠️  server/public does not exist"
    echo "   The server may be serving from a different location"
fi

echo ""
echo "✅ Rebuild process completed!"
echo ""
echo "🧪 Test the WebSocket connection in your browser:"
echo "   - Open: https://therapease.site"
echo "   - Check browser console for WebSocket logs"
echo "   - Should see: 'wss://therapease.site/ws' (NOT port 5000)"

