#!/bin/bash

# Script to directly remove duplicate location blocks from Nginx config

set -e

echo "🔧 Removing Duplicate Location Blocks"
echo "======================================="

CONFIG_FILE="/etc/nginx/sites-available/therapease"

# Backup
echo ""
echo "💾 Creating backup..."
sudo cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Show current state
echo ""
echo "📋 Current location blocks:"
grep -n "location.*uploads" "$CONFIG_FILE"

# Count them
COUNT=$(grep -c "location.*uploads" "$CONFIG_FILE" || echo "0")
echo ""
echo "   Found $COUNT location blocks (expected 4)"

if [ "$COUNT" -le 4 ]; then
    echo "✅ No duplicates found!"
    exit 0
fi

# Remove duplicate blocks
# Based on the error, duplicates are at lines 262-263 and 304
echo ""
echo "🔍 Removing duplicate blocks..."

# Show what we're removing
echo ""
echo "📋 Content at line 262-263 (will be removed):"
sed -n '260,270p' "$CONFIG_FILE"

echo ""
echo "📋 Content at line 304 (will be removed):"
sed -n '300,310p' "$CONFIG_FILE"

# Remove the duplicate blocks
# First, remove the block at lines 262-263
# This is a location /uploads/ block that's a duplicate
echo ""
echo "🗑️  Removing duplicate at lines 262-263..."

# Find the exact range of the duplicate block
# Look for the location block and its closing brace
DUPLICATE_START=262
DUPLICATE_END=$(sed -n "${DUPLICATE_START},300p" "$CONFIG_FILE" | grep -n "^    }" | head -1 | cut -d: -f1)
if [ -z "$DUPLICATE_END" ]; then
    DUPLICATE_END=270
else
    DUPLICATE_END=$((DUPLICATE_START + DUPLICATE_END - 1))
fi

echo "   Removing lines ${DUPLICATE_START}-${DUPLICATE_END}"

# Create a temporary file without the duplicate
sudo sed "${DUPLICATE_START},${DUPLICATE_END}d" "$CONFIG_FILE" > /tmp/therapease-nginx-temp.conf

# Now remove the second duplicate (line 304, but line numbers have shifted)
# Recalculate line numbers after first deletion
NEW_LINE_304=$((304 - (DUPLICATE_END - DUPLICATE_START + 1)))
echo "   Removing duplicate at line ${NEW_LINE_304} (was 304)"

# Find the exact range of the second duplicate block
DUPLICATE2_START=$NEW_LINE_304
DUPLICATE2_END=$(sed -n "${DUPLICATE2_START},350p" /tmp/therapease-nginx-temp.conf | grep -n "^    }" | head -1 | cut -d: -f1)
if [ -z "$DUPLICATE2_END" ]; then
    DUPLICATE2_END=$((DUPLICATE2_START + 5))
else
    DUPLICATE2_END=$((DUPLICATE2_START + DUPLICATE2_END - 1))
fi

echo "   Removing lines ${DUPLICATE2_START}-${DUPLICATE2_END}"

# Remove the second duplicate
sudo sed "${DUPLICATE2_START},${DUPLICATE2_END}d" /tmp/therapease-nginx-temp.conf > /tmp/therapease-nginx-fixed.conf

# Verify the count
NEW_COUNT=$(grep -c "location.*uploads" /tmp/therapease-nginx-fixed.conf || echo "0")
echo ""
echo "📋 New location blocks count: $NEW_COUNT (expected 4)"

if [ "$NEW_COUNT" -ne 4 ]; then
    echo "❌ Still has wrong count. Trying different approach..."
    # Just copy the correct file
    cd /home/therapease_user/therapease
    sudo cp -f nginx-therapease-clean.conf "$CONFIG_FILE"
    NEW_COUNT=$(grep -c "location.*uploads" "$CONFIG_FILE" || echo "0")
    echo "   After direct copy: $NEW_COUNT location blocks"
fi

# Replace the config file
if [ "$NEW_COUNT" -eq 4 ]; then
    sudo cp /tmp/therapease-nginx-fixed.conf "$CONFIG_FILE"
    echo "✅ Duplicates removed"
else
    echo "❌ Could not fix duplicates. Manual intervention required."
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

