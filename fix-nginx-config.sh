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
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration still has errors:"
    sudo nginx -t 2>&1 | grep -A 5 "error"
    echo ""
    echo "⚠️  Restoring backup..."
    sudo cp /etc/nginx/sites-available/therapease.backup.* /etc/nginx/sites-available/therapease
    echo "❌ Config restore failed. Please check manually."
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

