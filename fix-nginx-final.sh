#!/bin/bash

# Script to fix Nginx config by copying the correct file and verifying

set -e

echo "🔧 Final Fix for Nginx Configuration"
echo "===================================="

CONFIG_FILE="/etc/nginx/sites-available/therapease"

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Pull latest code
echo ""
echo "📥 Pulling latest code..."
git pull origin main || {
    echo "⚠️  Warning: git pull failed. Continuing with existing code..."
}

# Backup
echo ""
echo "💾 Creating backup..."
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Verify source file is correct
echo ""
echo "📋 Verifying source file..."
SOURCE_COUNT=$(grep -c "location.*uploads" nginx-therapease-clean.conf || echo "0")
echo "   Source file has $SOURCE_COUNT location blocks"

if [ "$SOURCE_COUNT" -ne 4 ]; then
    echo "❌ Error: Source file has wrong number of location blocks!"
    echo "   Expected 4, found $SOURCE_COUNT"
    echo ""
    echo "   📋 Location blocks in source file:"
    grep -n "location.*uploads" nginx-therapease-clean.conf
    exit 1
fi

# Copy the correct file
echo ""
echo "📋 Copying correct config file..."
sudo cp -f nginx-therapease-clean.conf "$CONFIG_FILE"
echo "✅ Config file copied"

# Verify the copy
echo ""
echo "📋 Verifying copied file..."
DEST_COUNT=$(grep -c "location.*uploads" "$CONFIG_FILE" || echo "0")
echo "   Destination file has $DEST_COUNT location blocks (expected 4)"

if [ "$DEST_COUNT" -ne 4 ]; then
    echo "❌ Error: Destination file still has wrong count!"
    echo "   This might be a file system or permissions issue"
    exit 1
fi

# Show the location blocks to confirm
echo ""
echo "📋 Location blocks in config file:"
grep -n "location.*uploads" "$CONFIG_FILE"

# Test configuration
echo ""
echo "🧪 Testing Nginx configuration..."
NGINX_TEST=$(sudo nginx -t 2>&1)
if echo "$NGINX_TEST" | grep -q "successful"; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration still has errors:"
    echo "$NGINX_TEST"
    echo ""
    echo "💡 The error might be from a previous edit. Try:"
    echo "   1. Check the error line mentioned above"
    echo "   2. Edit: sudo nano $CONFIG_FILE"
    echo "   3. Fix the syntax error"
    echo "   4. Test: sudo nginx -t"
    exit 1
fi

# Reload Nginx
echo ""
echo "🔄 Reloading Nginx..."
if sudo systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx reload failed"
    exit 1
fi

echo ""
echo "✅ Nginx configuration fixed successfully!"
echo ""
echo "📋 Verification:"
echo "   Run: ./check-nginx-ws.sh"
echo "   This will verify the WebSocket configuration is correct"

