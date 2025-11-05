#!/bin/bash
# Script to fix Nginx build directory configuration

set -e

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/therapease"
BUILD_DIR="/home/therapease_user/therapease/client/build"
DIST_DIR="/home/therapease_user/therapease/client/dist"

echo "=========================================="
echo "  Fix Nginx Build Directory"
echo "=========================================="
echo ""

# Check which directory exists
if [ -d "$BUILD_DIR" ]; then
    echo "✅ Found build directory: $BUILD_DIR"
    USE_DIR="build"
    TARGET_DIR="$BUILD_DIR"
elif [ -d "$DIST_DIR" ]; then
    echo "✅ Found dist directory: $DIST_DIR"
    USE_DIR="dist"
    TARGET_DIR="$DIST_DIR"
else
    echo "❌ Neither build nor dist directory exists!"
    echo "   Please build the frontend first:"
    echo "   cd /home/therapease_user/therapease/client && npm run build"
    exit 1
fi

echo "📁 Using directory: $USE_DIR"
echo ""

# Check if Nginx config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Check current root directory in config
CURRENT_ROOT=$(grep -E "^\s*root\s+" "$NGINX_CONFIG" | head -n 1 | awk '{print $2}' | sed 's/;$//' || echo "")

if [ -z "$CURRENT_ROOT" ]; then
    echo "⚠️  Could not find root directive in Nginx config"
    exit 1
fi

echo "Current root directory: $CURRENT_ROOT"
echo "Target root directory: $TARGET_DIR"
echo ""

# Check if update is needed
if [ "$CURRENT_ROOT" = "$TARGET_DIR" ]; then
    echo "✅ Nginx is already configured correctly!"
    echo "   Root directory matches: $TARGET_DIR"
else
    echo "🔧 Updating Nginx configuration..."
    
    # Backup current config
    cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backup created"
    
    # Update root directory
    sed -i "s|root $CURRENT_ROOT|root $TARGET_DIR|g" "$NGINX_CONFIG"
    echo "✅ Updated root directory to: $TARGET_DIR"
fi

echo ""
echo "Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration test passed"
    echo ""
    echo "Reloading Nginx..."
    if systemctl reload nginx; then
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Failed to reload Nginx"
        exit 1
    fi
else
    echo "❌ Nginx configuration test failed!"
    echo "   Restoring backup..."
    # Find the most recent backup
    LATEST_BACKUP=$(ls -t "$NGINX_CONFIG.backup."* 2>/dev/null | head -n 1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" "$NGINX_CONFIG"
        echo "✅ Backup restored"
    fi
    exit 1
fi

echo ""
echo "=========================================="
echo "  Fix Complete"
echo "=========================================="
echo ""
echo "✅ Nginx is now serving from: $TARGET_DIR"
echo ""
echo "Verify the fix by checking:"
echo "  curl -I https://therapease.site"
echo ""

