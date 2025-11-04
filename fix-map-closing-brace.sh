#!/bin/bash
# Fix map directive - add missing closing brace

set -e

echo "=========================================="
echo "  Fix Map Directive - Add Closing Brace"
echo "=========================================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Backup config
echo "1. Backing up nginx config..."
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
echo "✅ Backup created: $BACKUP_CONFIG"
echo ""

# Find where the map directive ends (where "" 1; is)
echo "2. Finding map directive end..."
MAP_END_LINE=$(grep -n '"" 1;' "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -z "$MAP_END_LINE" ]; then
    echo "❌ Could not find map directive end"
    exit 1
fi

echo "✅ Found map end at line $MAP_END_LINE"
echo ""

# Check if closing brace already exists
echo "3. Checking if closing brace exists..."
NEXT_LINE=$(sed -n "$((MAP_END_LINE + 1))p" "$NGINX_CONFIG" | sed 's/^[[:space:]]*//')

if [ "$NEXT_LINE" = "}" ]; then
    echo "✅ Closing brace already exists"
    echo "Checking for other issues..."
else
    echo "⚠️  Closing brace missing - will add it"
    
    # Check what comes after
    echo "Line after map end:"
    sed -n "$((MAP_END_LINE + 1))p" "$NGINX_CONFIG"
    echo ""
    
    # Add closing brace after "" 1;
    sed -i "${MAP_END_LINE}a}" "$NGINX_CONFIG"
    echo "✅ Added closing brace"
fi
echo ""

# Verify map directive structure
echo "4. Verifying map directive structure..."
MAP_START=$(grep -n "map.*block_bot" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
MAP_END=$(grep -n "^}" "$NGINX_CONFIG" | awk -F: -v start="$MAP_START" '$1 > start {print $1; exit}')

if [ -n "$MAP_START" ] && [ -n "$MAP_END" ]; then
    echo "✅ Map directive structure looks correct"
    echo "   Start: line $MAP_START"
    echo "   End: line $MAP_END"
    echo ""
    echo "Map directive content:"
    sed -n "${MAP_START},${MAP_END}p" "$NGINX_CONFIG" | head -20
else
    echo "⚠️  Could not verify map directive structure"
fi
echo ""

# Test nginx config
echo "5. Testing nginx configuration..."
NGINX_TEST=$(nginx -t 2>&1)
NGINX_TEST_EXIT=$?

if [ $NGINX_TEST_EXIT -eq 0 ] && echo "$NGINX_TEST" | grep -q "test is successful"; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    echo ""
    echo "Full error output:"
    echo "$NGINX_TEST"
    echo ""
    
    # Extract error line number
    ERROR_LINE=$(echo "$NGINX_TEST" | grep -o "line [0-9]*" | grep -o "[0-9]*" | head -1)
    if [ -n "$ERROR_LINE" ]; then
        echo "Error at line $ERROR_LINE:"
        sed -n "${ERROR_LINE}p" "$NGINX_CONFIG"
        echo ""
        echo "Context (lines $((ERROR_LINE-3))-$((ERROR_LINE+3))):"
        sed -n "$((ERROR_LINE-3)),$((ERROR_LINE+3))p" "$NGINX_CONFIG" | cat -n
        echo ""
    fi
    
    echo "⚠️  Script stopped. Please check the nginx config manually."
    echo "Backup saved at: $BACKUP_CONFIG"
    echo ""
    echo "To manually check:"
    echo "  sudo nginx -t"
    echo "  sudo cat /etc/nginx/sites-enabled/therapease | head -50"
    exit 1
fi

# Reload nginx
echo ""
echo "6. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

# Test bot blocking
echo ""
echo "7. Testing bot blocking..."
sleep 2
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client"
elif [ "$TEST_RESPONSE" = "200" ]; then
    echo "⚠️  Still getting 200 - bot blocking may need location block fix"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE"
fi

echo ""
echo "=========================================="
echo "  Map Directive Fix Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

