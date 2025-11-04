#!/bin/bash
# Fix proxy_pass error inside if statement

set -e

echo "=========================================="
echo "  Fix proxy_pass Error"
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

# Check line 87 and context
echo "2. Checking line 87 (where the error is):"
sed -n '80,95p' "$NGINX_CONFIG" | cat -n
echo ""

# Find the issue - proxy_pass inside if statement
echo "3. Finding proxy_pass inside if statements..."
# Check for proxy_pass that might be inside if blocks
grep -n "proxy_pass" "$NGINX_CONFIG" | head -10
echo ""

# Check line 87 specifically
LINE_87=$(sed -n '87p' "$NGINX_CONFIG")
echo "Line 87: $LINE_87"
echo ""

# Check if proxy_pass is inside an if block
# Find the last if statement before line 87
LAST_IF=$(sed -n '1,87p' "$NGINX_CONFIG" | grep -n "^[[:space:]]*if" | tail -1 | cut -d: -f1 || echo "0")

if [ "$LAST_IF" != "0" ]; then
    echo "4. Found if statement at line $LAST_IF"
    # Check if we're still inside that if block
    IF_TO_87=$(sed -n "${LAST_IF},87p" "$NGINX_CONFIG")
    CLOSING_BRACE=$(echo "$IF_TO_87" | grep -n "^[[:space:]]*}" | tail -1 | cut -d: -f1 || echo "0")
    
    if [ "$CLOSING_BRACE" = "0" ]; then
        echo "⚠️  proxy_pass at line 87 is INSIDE if statement - this is not allowed"
        echo "   Need to move proxy_pass outside the if block"
        
        # Check the structure
        echo ""
        echo "Context around if statement:"
        sed -n "${LAST_IF},95p" "$NGINX_CONFIG" | cat -n
        echo ""
        
        # The fix: we need to ensure proxy_pass is outside the if block
        # If the if block doesn't have a closing brace before line 87, we need to add one
        # Or we need to move proxy_pass after the if block
        
        echo "⚠️  Manual fix required:"
        echo "   1. Check if the if block at line $LAST_IF has a closing brace"
        echo "   2. If not, add a closing brace before the proxy_pass"
        echo "   3. Or move proxy_pass outside the if block"
        
        # Try to find where the if block should end
        # Look for the closing brace after the if statement
        IF_BLOCK_END=$(sed -n "${LAST_IF},100p" "$NGINX_CONFIG" | grep -n "^[[:space:]]*}" | head -1 | cut -d: -f1 || echo "0")
        
        if [ "$IF_BLOCK_END" != "0" ]; then
            ACTUAL_END_LINE=$((LAST_IF + IF_BLOCK_END - 1))
            echo "   Found closing brace at line $ACTUAL_END_LINE"
            
            # Check if proxy_pass is after the closing brace
            if [ "$ACTUAL_END_LINE" -lt 87 ]; then
                echo "✅ proxy_pass is after if block closing brace - should be fine"
            else
                echo "⚠️  proxy_pass is before if block closing brace - need to fix"
            fi
        else
            echo "⚠️  Could not find closing brace for if block"
            echo "   Need to add closing brace before proxy_pass"
        fi
    else
        echo "✅ proxy_pass is outside if statement"
    fi
fi
echo ""

# Try to fix: ensure location / block has proper structure
echo "5. Checking location / block structure..."
LOCATION_LINE=$(grep -n "^[[:space:]]*location / {" "$NGINX_CONFIG" | head -1 | cut -d: -f1 || echo "0")

if [ "$LOCATION_LINE" != "0" ]; then
    echo "Found location / block at line $LOCATION_LINE"
    echo ""
    echo "Location / block content:"
    sed -n "${LOCATION_LINE},$((LOCATION_LINE+30))p" "$NGINX_CONFIG" | head -30 | cat -n
    echo ""
    
    # Check if bot blocking if is properly closed
    BOT_IF_LINE=$(sed -n "${LOCATION_LINE},$((LOCATION_LINE+30))p" "$NGINX_CONFIG" | grep -n "if.*block_bot" | head -1 | cut -d: -f1 || echo "0")
    
    if [ "$BOT_IF_LINE" != "0" ]; then
        ACTUAL_BOT_IF=$((LOCATION_LINE + BOT_IF_LINE - 1))
        echo "Found bot blocking if at line $ACTUAL_BOT_IF"
        
        # Check if it has a closing brace
        BOT_IF_CONTENT=$(sed -n "${ACTUAL_BOT_IF},$((ACTUAL_BOT_IF+10))p" "$NGINX_CONFIG")
        BOT_IF_CLOSE=$(echo "$BOT_IF_CONTENT" | grep -n "^[[:space:]]*}" | head -1 | cut -d: -f1 || echo "0")
        
        if [ "$BOT_IF_CLOSE" = "0" ]; then
            echo "⚠️  Bot blocking if block is missing closing brace"
            echo "   Will add closing brace"
            
            # Find where to add it (after return 403;)
            RETURN_LINE=$(sed -n "${ACTUAL_BOT_IF},$((ACTUAL_BOT_IF+10))p" "$NGINX_CONFIG" | grep -n "return 403" | head -1 | cut -d: -f1 || echo "0")
            
            if [ "$RETURN_LINE" != "0" ]; then
                ACTUAL_RETURN=$((ACTUAL_BOT_IF + RETURN_LINE - 1))
                # Add closing brace after return 403;
                sed -i "${ACTUAL_RETURN}a\    }" "$NGINX_CONFIG"
                echo "✅ Added closing brace after return 403"
            fi
        else
            echo "✅ Bot blocking if block has closing brace"
        fi
    fi
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
echo "  proxy_pass Fix Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

