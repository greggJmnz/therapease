#!/bin/bash

# Script to fix duplicate location blocks by copying the correct config

set -e

echo "🔧 Fixing Nginx Configuration"
echo "=============================="

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to /home/therapease_user/therapease"
    exit 1
}

# Pull latest code
echo ""
echo "📥 Pulling latest code..."
git pull origin main || {
    echo "⚠️  Warning: git pull failed. Continuing with existing code..."
}

# Backup current config
echo ""
echo "💾 Backing up current config..."
sudo cp /etc/nginx/sites-available/therapease /etc/nginx/sites-available/therapease.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"

# Copy correct config
echo ""
echo "📋 Copying correct config file..."
sudo cp nginx-therapease-clean.conf /etc/nginx/sites-available/therapease
echo "✅ Config file copied"

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
    echo "🔍 Checking for duplicate location blocks..."
    DUPLICATES=$(grep -n "location.*uploads" /etc/nginx/sites-available/therapease | wc -l)
    echo "   Found $DUPLICATES location blocks with 'uploads'"
    if [ "$DUPLICATES" -gt 4 ]; then
        echo "   ⚠️  Warning: More than 4 location blocks found (expected 4 - 2 per server block)"
        echo ""
        echo "   📋 All location blocks with 'uploads':"
        grep -n "location.*uploads" /etc/nginx/sites-available/therapease
    fi
    echo ""
    echo "⚠️  Restoring backup..."
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/therapease.backup.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo cp "$LATEST_BACKUP" /etc/nginx/sites-available/therapease
        echo "✅ Backup restored"
    else
        echo "❌ No backup found to restore"
    fi
    echo ""
    echo "💡 To fix manually:"
    echo "   1. Check the error message above"
    echo "   2. Edit the config: sudo nano /etc/nginx/sites-available/therapease"
    echo "   3. Remove duplicate location blocks"
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

