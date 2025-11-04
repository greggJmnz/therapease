#!/bin/bash
# Fix all limit_req directives outside location blocks

set -e

echo "=========================================="
echo "  Fix All limit_req Directives"
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

# Fix line 101 - comment out limit_req outside location block
echo "2. Fixing line 101..."
LINE_101=$(sed -n '101p' "$NGINX_CONFIG")
echo "Line 101: $LINE_101"

if echo "$LINE_101" | grep -q "limit_req" && ! echo "$LINE_101" | grep -q "^[[:space:]]*#"; then
    # Check context around line 101
    echo ""
    echo "Context (lines 95-110):"
    sed -n '95,110p' "$NGINX_CONFIG" | cat -n
    echo ""
    
    # Check if it's inside a location block
    # Find the last location block before line 101
    LAST_LOC=$(sed -n '1,101p' "$NGINX_CONFIG" | grep -n "^[[:space:]]*location" | tail -1 | cut -d: -f1 || echo "0")
    
    if [ "$LAST_LOC" != "0" ]; then
        # Check if that location block is still open
        LOC_TO_101=$(sed -n "${LAST_LOC},101p" "$NGINX_CONFIG")
        CLOSING_BRACE=$(echo "$LOC_TO_101" | grep -n "^[[:space:]]*}" | tail -1 | cut -d: -f1 || echo "0")
        
        if [ "$CLOSING_BRACE" != "0" ]; then
            echo "⚠️  limit_req at line 101 is outside location block - commenting it out"
            sed -i '101s/^[[:space:]]*/# &/' "$NGINX_CONFIG"
            echo "✅ Commented out limit_req at line 101"
        else
            echo "✅ limit_req at line 101 is inside location block"
        fi
    else
        echo "⚠️  No location block found before line 101 - commenting it out"
        sed -i '101s/^[[:space:]]*/# &/' "$NGINX_CONFIG"
        echo "✅ Commented out limit_req at line 101"
    fi
else
    echo "✅ Line 101 already commented or doesn't have limit_req"
fi
echo ""

# Test nginx config
echo "3. Testing nginx configuration..."
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
        echo "⚠️  Please fix line $ERROR_LINE manually"
    fi
    
    echo ""
    echo "⚠️  Script stopped. Please check the nginx config manually."
    echo "Backup saved at: $BACKUP_CONFIG"
    exit 1
fi

# Reload nginx
echo ""
echo "4. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

# Test bot blocking
echo ""
echo "5. Testing bot blocking..."
sleep 2
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client"
elif [ "$TEST_RESPONSE" = "200" ]; then
    echo "⚠️  Still getting 200 - bot blocking may not be working"
    echo "   Check if bot blocking is in location blocks"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE"
fi

echo ""
echo "=========================================="
echo "  limit_req Fix Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

