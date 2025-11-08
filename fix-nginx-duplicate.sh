#!/bin/bash

# Script to find and fix duplicate location blocks in Nginx config

echo "🔍 Finding Duplicate Location Blocks in Nginx Config"
echo "===================================================="

CONFIG_FILE="/etc/nginx/sites-enabled/therapease"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Config file not found at $CONFIG_FILE"
    exit 1
fi

echo ""
echo "📋 Checking for duplicate location blocks..."

# Check for duplicate location = /uploads
echo ""
echo "🔍 Checking for duplicate 'location = /uploads' blocks..."
UPLOADS_EXACT_COUNT=$(grep -c "location = /uploads" "$CONFIG_FILE" 2>/dev/null || echo "0")
echo "   Found $UPLOADS_EXACT_COUNT 'location = /uploads' block(s)"

if [ "$UPLOADS_EXACT_COUNT" -gt 2 ]; then
    echo "   ⚠️  Warning: More than 2 'location = /uploads' blocks found (expected 2 - one per server block)"
    echo ""
    echo "   📋 Locations:"
    grep -n "location = /uploads" "$CONFIG_FILE"
fi

# Check for duplicate location /uploads/
echo ""
echo "🔍 Checking for duplicate 'location /uploads/' blocks..."
UPLOADS_PREFIX_COUNT=$(grep -c "location /uploads/" "$CONFIG_FILE" 2>/dev/null || echo "0")
echo "   Found $UPLOADS_PREFIX_COUNT 'location /uploads/' block(s)"

if [ "$UPLOADS_PREFIX_COUNT" -gt 2 ]; then
    echo "   ⚠️  Warning: More than 2 'location /uploads/' blocks found (expected 2 - one per server block)"
    echo ""
    echo "   📋 Locations:"
    grep -n "location /uploads/" "$CONFIG_FILE"
fi

# Check around line 304 (where the error was reported)
echo ""
echo "🔍 Checking around line 304 (error location)..."
if [ -f "$CONFIG_FILE" ]; then
    sed -n '295,315p' "$CONFIG_FILE" | cat -n
fi

# Test Nginx config
echo ""
echo "📋 Testing Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration has syntax errors:"
    sudo nginx -t 2>&1 | grep -A 5 "error"
    echo ""
    echo "💡 To fix:"
    echo "   1. Check the actual config file: sudo nano $CONFIG_FILE"
    echo "   2. Look for duplicate 'location = /uploads' or 'location /uploads' blocks"
    echo "   3. Remove duplicates, keeping one per server block"
    echo "   4. Test again: sudo nginx -t"
    echo "   5. Reload: sudo systemctl reload nginx"
fi

