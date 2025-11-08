#!/bin/bash

# Script to fix Nginx config by forcing a fresh pull from repository

set -e

echo "🔧 Fixing Nginx Configuration from Repository"
echo "==============================================="

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Force pull from repository (discard local changes)
echo ""
echo "📥 Force pulling latest code from repository..."
git fetch origin
git reset --hard origin/main
echo "✅ Repository updated"

# Verify the repository file is correct
echo ""
echo "📋 Verifying repository file..."
REPO_COUNT=$(grep -c "location.*uploads" nginx-therapease-clean.conf || echo "0")
echo "   Repository file has $REPO_COUNT location blocks"

if [ "$REPO_COUNT" -ne 4 ]; then
    echo "❌ Error: Repository file has wrong number of location blocks!"
    echo "   Expected 4, found $REPO_COUNT"
    echo ""
    echo "   📋 Location blocks in repository file:"
    grep -n "location.*uploads" nginx-therapease-clean.conf
    exit 1
fi

# Backup current config
echo ""
echo "💾 Creating backup..."
CONFIG_FILE="/etc/nginx/sites-available/therapease"
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Copy the correct file from repository
echo ""
echo "📋 Copying correct config file from repository..."
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

