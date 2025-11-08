#!/bin/bash

# Script to verify the build files on the VPS
# This checks if the latest WebSocket code is actually in the built files

set -e

echo "🔍 Verifying Build Files on VPS"
echo "================================"

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to /home/therapease_user/therapease"
    exit 1
}

echo ""
echo "📁 Checking built files in server/public..."

# Check if the built files exist
if [ ! -d "server/public/assets" ]; then
    echo "❌ Error: server/public/assets directory not found"
    exit 1
fi

echo "✅ server/public/assets exists"

# Find the main JavaScript bundle
echo ""
echo "🔍 Looking for main JavaScript bundle..."
MAIN_JS=$(find server/public/assets -name "index-*.js" -type f | head -1)

if [ -z "$MAIN_JS" ]; then
    echo "❌ Error: Main JavaScript bundle not found"
    exit 1
fi

echo "✅ Found main bundle: $MAIN_JS"

# Check for the "emergency server" message (should NOT exist)
echo ""
echo "🔍 Checking for old 'emergency server' code..."
if grep -q "emergency server" "$MAIN_JS" 2>/dev/null; then
    echo "❌ ERROR: Old 'emergency server' code found in build!"
    echo "   This means the build is using old code"
    echo "   File: $MAIN_JS"
    exit 1
else
    echo "✅ No 'emergency server' code found (good!)"
fi

# Check for the correct WebSocket code (should exist)
echo ""
echo "🔍 Checking for correct WebSocket code..."
if grep -q "Production WebSocket debug info" "$MAIN_JS" 2>/dev/null; then
    echo "✅ Correct WebSocket code found"
else
    echo "⚠️  Warning: Expected WebSocket code not found"
fi

# Check for port 5000 in production (should NOT exist in production code)
echo ""
echo "🔍 Checking for port 5000 in production code..."
if grep -q "therapease.site:5000" "$MAIN_JS" 2>/dev/null; then
    echo "❌ ERROR: Port 5000 found in production code!"
    echo "   This should not exist in production builds"
    echo "   File: $MAIN_JS"
    exit 1
else
    echo "✅ No port 5000 in production code (good!)"
fi

# Check file modification time
echo ""
echo "📅 File modification time:"
ls -lh "$MAIN_JS" | awk '{print "   "$6" "$7" "$8" - "$9}'

echo ""
echo "✅ Build verification completed!"
echo ""
echo "📋 If the browser still shows old code:"
echo "   1. Clear browser cache (Ctrl+Shift+Delete)"
echo "   2. Unregister service worker (DevTools > Application > Service Workers)"
echo "   3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   4. Try incognito/private window"

