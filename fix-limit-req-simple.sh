#!/bin/bash
# Fix limit_req directive at line 84 - simple approach

set -e

echo "=========================================="
echo "  Fix limit_req Directive at Line 84"
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

# Check line 84 and context
echo "2. Checking line 84 (where the error is):"
sed -n '80,90p' "$NGINX_CONFIG" | cat -n
echo ""

# Check what's at line 84
LINE_84=$(sed -n '84p' "$NGINX_CONFIG")
echo "Line 84 content: $LINE_84"
echo ""

# Check if it's inside a location block
echo "3. Checking if line 84 is inside a location block..."
# Find the last location block before line 84
LAST_LOC=$(sed -n '1,84p' "$NGINX_CONFIG" | grep -n "location" | tail -1 | cut -d: -f1 || echo "0")

if [ "$LAST_LOC" != "0" ]; then
    echo "✅ Found location block at line $LAST_LOC"
    # Check if that location block is still open at line 84
    LOC_TO_84=$(sed -n "${LAST_LOC},84p" "$NGINX_CONFIG")
    CLOSING_BRACE=$(echo "$LOC_TO_84" | grep -n "^[[:space:]]*}" | tail -1 | cut -d: -f1 || echo "0")
    
    if [ "$CLOSING_BRACE" != "0" ]; then
        echo "⚠️  Location block closes before line 84 - limit_req is outside location block"
        echo "   Will comment out line 84"
        sed -i '84s/^/# /' "$NGINX_CONFIG"
        echo "✅ Commented out limit_req at line 84"
    else
        echo "✅ Location block is still open - limit_req is inside location block"
        echo "   This should be fine, but checking further..."
    fi
else
    echo "⚠️  No location block found before line 84"
    echo "   Will comment out line 84"
    sed -i '84s/^/# /' "$NGINX_CONFIG"
    echo "✅ Commented out limit_req at line 84"
fi
echo ""

# Test nginx config
echo "4. Testing nginx configuration..."
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
    fi
    
    echo ""
    echo "⚠️  Script stopped. Please check the nginx config manually."
    echo "Backup saved at: $BACKUP_CONFIG"
    exit 1
fi

# Reload nginx
echo ""
echo "5. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

echo ""
echo "=========================================="
echo "  limit_req Directive Fix Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

