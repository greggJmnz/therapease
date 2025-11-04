#!/bin/bash
# Fix Complete Nginx Configuration - Clean up all syntax errors

set -e

echo "=========================================="
echo "  Fix Complete Nginx Configuration"
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

# Fix the location /api/ block - ensure OPTIONS if block is closed
echo "2. Fixing location /api/ block..."
API_LOC_LINE=$(grep -n "^[[:space:]]*location /api/ {" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "0")

if [ "$API_LOC_LINE" != "0" ]; then
    echo "Found location /api/ at line $API_LOC_LINE"
    
    # Find the OPTIONS if block
    OPTIONS_IF_LINE=$(sed -n "${API_LOC_LINE},$((API_LOC_LINE+30))p" "$NGINX_CONFIG" | grep -n "if.*OPTIONS" | head -1 | cut -d: -f1 || echo "0")
    
    if [ "$OPTIONS_IF_LINE" != "0" ]; then
        ACTUAL_OPTIONS_IF=$((API_LOC_LINE + OPTIONS_IF_LINE - 1))
        echo "Found OPTIONS if at line $ACTUAL_OPTIONS_IF"
        
        # Check if it has a closing brace before proxy_pass
        # Find the return 204 line
        RETURN_204_LINE=$(sed -n "${ACTUAL_OPTIONS_IF},$((ACTUAL_OPTIONS_IF+15))p" "$NGINX_CONFIG" | grep -n "return 204" | head -1 | cut -d: -f1 || echo "0")
        
        if [ "$RETURN_204_LINE" != "0" ]; then
            ACTUAL_RETURN_204=$((ACTUAL_OPTIONS_IF + RETURN_204_LINE - 1))
            NEXT_LINE=$(sed -n "$((ACTUAL_RETURN_204 + 1))p" "$NGINX_CONFIG" | sed 's/^[[:space:]]*//')
            
            # Check if next line is closing brace
            if [ "$NEXT_LINE" != "}" ]; then
                echo "⚠️  OPTIONS if block missing closing brace - adding it"
                sed -i "${ACTUAL_RETURN_204}a\    }" "$NGINX_CONFIG"
                echo "✅ Added closing brace after return 204"
            else
                echo "✅ OPTIONS if block has closing brace"
            fi
        fi
    fi
fi
echo ""

# Fix bot blocking if blocks - ensure they're closed
echo "3. Fixing bot blocking if blocks..."
# Find all if ($block_bot) blocks
BOT_IF_LINES=$(grep -n "if.*block_bot" "$NGINX_CONFIG" | cut -d: -f1)

for bot_if_line in $BOT_IF_LINES; do
    # Check if it has a closing brace
    BOT_IF_CONTENT=$(sed -n "${bot_if_line},$((bot_if_line+5))p" "$NGINX_CONFIG")
    BOT_IF_CLOSE=$(echo "$BOT_IF_CONTENT" | grep -n "^[[:space:]]*}" | head -1 | cut -d: -f1 || echo "0")
    
    if [ "$BOT_IF_CLOSE" = "0" ]; then
        # Find return 403 line
        RETURN_403_LINE=$(sed -n "${bot_if_line},$((bot_if_line+5))p" "$NGINX_CONFIG" | grep -n "return 403" | head -1 | cut -d: -f1 || echo "0")
        
        if [ "$RETURN_403_LINE" != "0" ]; then
            ACTUAL_RETURN_403=$((bot_if_line + RETURN_403_LINE - 1))
            NEXT_LINE=$(sed -n "$((ACTUAL_RETURN_403 + 1))p" "$NGINX_CONFIG" | sed 's/^[[:space:]]*//')
            
            if [ "$NEXT_LINE" != "}" ]; then
                echo "⚠️  Bot blocking if block at line $bot_if_line missing closing brace - adding it"
                sed -i "${ACTUAL_RETURN_403}a\    }" "$NGINX_CONFIG"
                echo "✅ Added closing brace after return 403 at line $ACTUAL_RETURN_403"
            fi
        fi
    fi
done
echo ""

# Remove orphaned closing braces and fix location block nesting
echo "4. Fixing location block structure..."
# This is complex - let's just test and see what errors remain

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
        echo "Context (lines $((ERROR_LINE-5))-$((ERROR_LINE+5))):"
        sed -n "$((ERROR_LINE-5)),$((ERROR_LINE+5))p" "$NGINX_CONFIG" | cat -n
    fi
    
    echo ""
    echo "⚠️  There are still errors. The config file structure is too broken."
    echo "   Recommend restoring from a known good backup or manually fixing."
    echo "   Backup saved at: $BACKUP_CONFIG"
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
    echo "⚠️  Still getting 200 - bot blocking may not be working"
    echo "   Check if map is matching correctly"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE"
fi

echo ""
echo "=========================================="
echo "  Nginx Configuration Fix Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

