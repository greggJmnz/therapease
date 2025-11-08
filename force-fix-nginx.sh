#!/bin/bash

# Script to force fix Nginx config by directly editing the file

set -e

echo "🔧 Force Fixing Nginx Configuration"
echo "===================================="

CONFIG_FILE="/etc/nginx/sites-available/therapease"

# Backup
echo ""
echo "💾 Creating backup..."
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Show the problematic lines
echo ""
echo "📋 Checking for duplicate location blocks..."
DUPLICATE_LINES=$(grep -n "location.*uploads" "$CONFIG_FILE" | cut -d: -f1)
echo "   Found location blocks at lines: $DUPLICATE_LINES"

# Check which lines are duplicates
echo ""
echo "🔍 Identifying duplicates..."

# The correct config should have location blocks at approximately:
# - ~110: location /uploads/ (API server)
# - ~151: location = /uploads (API server)
# - ~398: location /uploads/ (frontend server)
# - ~438: location = /uploads (frontend server)

# Lines 263 and 304 are the duplicates based on the error
echo ""
echo "📋 Removing duplicate blocks at lines 262-263 and 304..."

# Use sed to remove the duplicate blocks
# Remove lines 262-263 (the duplicate location /uploads/ block)
# First, let's see what's around those lines
echo ""
echo "📋 Content around line 262-263:"
sed -n '260,270p' "$CONFIG_FILE"

echo ""
echo "📋 Content around line 304:"
sed -n '300,310p' "$CONFIG_FILE"

# Actually, let's just copy the correct file and verify it
echo ""
echo "📋 Copying correct config file..."
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Verify the source file is correct
SOURCE_COUNT=$(grep -c "location.*uploads" nginx-therapease-clean.conf || echo "0")
echo "   Source file has $SOURCE_COUNT location blocks (expected 4)"

if [ "$SOURCE_COUNT" -ne 4 ]; then
    echo "❌ Error: Source file has wrong number of location blocks!"
    exit 1
fi

# Force copy
echo ""
echo "📋 Force copying correct config..."
sudo cp -f nginx-therapease-clean.conf "$CONFIG_FILE"
echo "✅ Config file copied"

# Verify immediately
echo ""
echo "📋 Verifying copied file..."
DEST_COUNT=$(grep -c "location.*uploads" "$CONFIG_FILE" || echo "0")
echo "   Destination file has $DEST_COUNT location blocks (expected 4)"

if [ "$DEST_COUNT" -ne 4 ]; then
    echo "❌ Error: Destination file still has wrong count!"
    echo "   This might be a permissions or file system issue"
    echo ""
    echo "   📋 Checking file permissions..."
    ls -la "$CONFIG_FILE"
    echo ""
    echo "   📋 Checking if file was actually written..."
    head -20 "$CONFIG_FILE" | grep -E "TherapEase|server_name"
    exit 1
fi

# Test configuration
echo ""
echo "🧪 Testing Nginx configuration..."
NGINX_TEST=$(sudo nginx -t 2>&1)
if echo "$NGINX_TEST" | grep -q "successful"; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration still has errors:"
    echo "$NGINX_TEST"
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

