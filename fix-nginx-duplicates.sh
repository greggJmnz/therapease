#!/bin/bash

# Script to remove duplicate location blocks from Nginx config

set -e

echo "🔧 Removing Duplicate Location Blocks from Nginx Config"
echo "========================================================="

CONFIG_FILE="/etc/nginx/sites-available/therapease"
ENABLED_FILE="/etc/nginx/sites-enabled/therapease"

# Check if sites-enabled is a symlink
if [ -L "$ENABLED_FILE" ]; then
    echo "✅ sites-enabled is a symlink (correct)"
    REAL_FILE=$(readlink -f "$ENABLED_FILE")
    echo "   Symlink points to: $REAL_FILE"
else
    echo "⚠️  sites-enabled is not a symlink, it's a real file"
    echo "   This might cause issues"
fi

# Backup
echo ""
echo "💾 Creating backup..."
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Show current duplicates
echo ""
echo "📋 Current location blocks with 'uploads':"
grep -n "location.*uploads" "$CONFIG_FILE"

# Count them
COUNT=$(grep -c "location.*uploads" "$CONFIG_FILE" || echo "0")
echo ""
echo "   Found $COUNT location blocks (expected 4)"

if [ "$COUNT" -le 4 ]; then
    echo "✅ No duplicates found!"
    exit 0
fi

echo ""
echo "🔍 Finding duplicates..."

# Get line numbers of all location blocks
LINES=$(grep -n "location.*uploads" "$CONFIG_FILE" | cut -d: -f1)

# Find which server block each is in
echo ""
echo "📋 Analyzing location blocks..."
for LINE in $LINES; do
    # Find which server block this line is in
    SERVER_BLOCK=$(sed -n "1,${LINE}p" "$CONFIG_FILE" | grep -c "server {" || echo "0")
    CONTEXT=$(sed -n "$((LINE-5)),${LINE}p" "$CONFIG_FILE" | grep -E "server_name|location" | tail -2)
    echo "   Line $LINE: $CONTEXT"
done

# The correct config should have:
# - Line ~110: location /uploads/ in API server
# - Line ~151: location = /uploads in API server  
# - Line ~398: location /uploads/ in frontend server
# - Line ~438: location = /uploads in frontend server

# Remove duplicates by copying the correct config
echo ""
echo "📋 Copying correct config from repository..."
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

if [ -f "nginx-therapease-clean.conf" ]; then
    sudo cp nginx-therapease-clean.conf "$CONFIG_FILE"
    echo "✅ Correct config copied"
else
    echo "❌ Error: nginx-therapease-clean.conf not found"
    exit 1
fi

# Verify the count
NEW_COUNT=$(grep -c "location.*uploads" "$CONFIG_FILE" || echo "0")
echo ""
echo "📋 New location blocks count: $NEW_COUNT (expected 4)"

if [ "$NEW_COUNT" -eq 4 ]; then
    echo "✅ Duplicates removed!"
else
    echo "❌ Still has duplicates. Manual fix required."
    exit 1
fi

# Test configuration
echo ""
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration still has errors:"
    sudo nginx -t
    echo ""
    echo "⚠️  Restoring backup..."
    LATEST_BACKUP=$(ls -t "$CONFIG_FILE.backup."* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo cp "$LATEST_BACKUP" "$CONFIG_FILE"
        echo "✅ Backup restored"
    fi
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
echo "✅ Duplicates removed and Nginx reloaded successfully!"

