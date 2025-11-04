#!/bin/bash
# Fix location /api/ block - ensure if blocks are properly closed

set -e

echo "=========================================="
echo "  Fix location /api/ Block Structure"
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

# Find location /api/ block
echo "2. Finding location /api/ block..."
API_LOC_LINE=$(grep -n "^[[:space:]]*location /api/ {" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "0")

if [ "$API_LOC_LINE" = "0" ]; then
    echo "❌ Could not find location /api/ block"
    exit 1
fi

echo "✅ Found location /api/ block at line $API_LOC_LINE"
echo ""

# Check the structure of location /api/ block
echo "3. Checking location /api/ block structure..."
echo "Lines $API_LOC_LINE to $((API_LOC_LINE+30)):"
sed -n "${API_LOC_LINE},$((API_LOC_LINE+30))p" "$NGINX_CONFIG" | cat -n
echo ""

# Find if ($block_bot) block in location /api/
BOT_IF_LINE=$(sed -n "${API_LOC_LINE},$((API_LOC_LINE+30))p" "$NGINX_CONFIG" | grep -n "if.*block_bot" | head -1 | cut -d: -f1 || echo "0")

if [ "$BOT_IF_LINE" != "0" ]; then
    ACTUAL_BOT_IF=$((API_LOC_LINE + BOT_IF_LINE - 1))
    echo "4. Found bot blocking if at line $ACTUAL_BOT_IF"
    
    # Check if it has a closing brace
    BOT_IF_CONTENT=$(sed -n "${ACTUAL_BOT_IF},$((ACTUAL_BOT_IF+10))p" "$NGINX_CONFIG")
    BOT_IF_CLOSE=$(echo "$BOT_IF_CONTENT" | grep -n "^[[:space:]]*}" | head -1 | cut -d: -f1 || echo "0")
    
    if [ "$BOT_IF_CLOSE" = "0" ]; then
        echo "⚠️  Bot blocking if block is missing closing brace"
        echo "   Will add closing brace after return 403;"
        
        # Find the return 403 line
        RETURN_LINE=$(sed -n "${ACTUAL_BOT_IF},$((ACTUAL_BOT_IF+10))p" "$NGINX_CONFIG" | grep -n "return 403" | head -1 | cut -d: -f1 || echo "0")
        
        if [ "$RETURN_LINE" != "0" ]; then
            ACTUAL_RETURN=$((ACTUAL_BOT_IF + RETURN_LINE - 1))
            # Add closing brace after return 403;
            sed -i "${ACTUAL_RETURN}a\    }" "$NGINX_CONFIG"
            echo "✅ Added closing brace after return 403 at line $ACTUAL_RETURN"
        fi
    else
        echo "✅ Bot blocking if block has closing brace"
    fi
else
    echo "⚠️  Bot blocking if block not found in location /api/"
fi
echo ""

# Check for OPTIONS if block
OPTIONS_IF_LINE=$(sed -n "${API_LOC_LINE},$((API_LOC_LINE+30))p" "$NGINX_CONFIG" | grep -n "if.*OPTIONS" | head -1 | cut -d: -f1 || echo "0")

if [ "$OPTIONS_IF_LINE" != "0" ]; then
    ACTUAL_OPTIONS_IF=$((API_LOC_LINE + OPTIONS_IF_LINE - 1))
    echo "5. Found OPTIONS if block at line $ACTUAL_OPTIONS_IF"
    
    # Check if it has a closing brace
    OPTIONS_IF_CONTENT=$(sed -n "${ACTUAL_OPTIONS_IF},$((ACTUAL_OPTIONS_IF+20))p" "$NGINX_CONFIG")
    OPTIONS_IF_CLOSE=$(echo "$OPTIONS_IF_CONTENT" | grep -n "^[[:space:]]*}" | head -1 | cut -d: -f1 || echo "0")
    
    if [ "$OPTIONS_IF_CLOSE" = "0" ]; then
        echo "⚠️  OPTIONS if block is missing closing brace"
        echo "   Will add closing brace after return 204;"
        
        # Find the return 204 line
        RETURN_204_LINE=$(sed -n "${ACTUAL_OPTIONS_IF},$((ACTUAL_OPTIONS_IF+20))p" "$NGINX_CONFIG" | grep -n "return 204" | head -1 | cut -d: -f1 || echo "0")
        
        if [ "$RETURN_204_LINE" != "0" ]; then
            ACTUAL_RETURN_204=$((ACTUAL_OPTIONS_IF + RETURN_204_LINE - 1))
            # Add closing brace after return 204;
            sed -i "${ACTUAL_RETURN_204}a\    }" "$NGINX_CONFIG"
            echo "✅ Added closing brace after return 204 at line $ACTUAL_RETURN_204"
        fi
    else
        echo "✅ OPTIONS if block has closing brace"
    fi
else
    echo "⚠️  OPTIONS if block not found in location /api/"
fi
echo ""

# Test nginx config
echo "6. Testing nginx configuration..."
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
        echo "Context (lines $((ERROR_LINE-5))-$((ERROR_LINE+5))):"
        sed -n "$((ERROR_LINE-5)),$((ERROR_LINE+5))p" "$NGINX_CONFIG" | cat -n
    fi
    
    echo ""
    echo "⚠️  Script stopped. Please check the nginx config manually."
    echo "Backup saved at: $BACKUP_CONFIG"
    exit 1
fi

# Reload nginx
echo ""
echo "7. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

# Test bot blocking
echo ""
echo "8. Testing bot blocking..."
sleep 2
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client"
elif [ "$TEST_RESPONSE" = "200" ]; then
    echo "⚠️  Still getting 200 - bot blocking may not be working"
    echo "   Check if map is matching correctly"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE"
fi

echo ""
echo "=========================================="
echo "  location /api/ Block Fix Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

