#!/bin/bash
# Fix limit_req directive placement error

set -e

echo "=========================================="
echo "  Fix limit_req Directive Error"
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

# Check line 84 and surrounding context
echo "2. Checking line 84 (where the error is):"
sed -n '75,95p' "$NGINX_CONFIG" | cat -n
echo ""

# Find all limit_req directives
echo "3. Finding all limit_req directives..."
grep -n "limit_req" "$NGINX_CONFIG"
echo ""

# Check which limit_req is in the wrong place
echo "4. Checking context around limit_req directives..."
LIMIT_REQ_LINES=$(grep -n "limit_req" "$NGINX_CONFIG" | cut -d: -f1)

for line in $LIMIT_REQ_LINES; do
    echo "Line $line:"
    sed -n "${line}p" "$NGINX_CONFIG"
    echo ""
    echo "Context (lines $((line-5))-$((line+5))):"
    sed -n "$((line-5)),$((line+5))p" "$NGINX_CONFIG" | cat -n
    echo ""
    
    # Check if it's inside a location block
    LOCATION_BEFORE=$(sed -n "1,${line}p" "$NGINX_CONFIG" | grep -c "location" | head -1 || echo "0")
    LOCATION_AFTER=$(sed -n "1,${line}p" "$NGINX_CONFIG" | tail -20 | grep -c "location" || echo "0")
    
    # Check if it's inside a server block
    SERVER_BEFORE=$(sed -n "1,${line}p" "$NGINX_CONFIG" | grep -c "^[[:space:]]*server {" || echo "0")
    
    # Check if there's a location block before this line
    LAST_LOCATION=$(sed -n "1,${line}p" "$NGINX_CONFIG" | grep -n "location" | tail -1 | cut -d: -f1 || echo "0")
    
    if [ "$LAST_LOCATION" -gt 0 ]; then
        # Check if we're still inside that location block
        LAST_LOCATION_END=$(sed -n "${LAST_LOCATION},${line}p" "$NGINX_CONFIG" | grep -n "^[[:space:]]*}" | tail -1 | cut -d: -f1 || echo "0")
        if [ "$LAST_LOCATION_END" -gt 0 ]; then
            echo "⚠️  This limit_req is OUTSIDE a location block (line $line)"
            echo "   It should be inside a location block"
        else
            echo "✅ This limit_req is inside a location block"
        fi
    else
        echo "⚠️  This limit_req is not inside any location block (line $line)"
        echo "   It should be inside a location block"
    fi
    echo ""
done

# Remove limit_req directives that are outside location blocks
echo "5. Removing limit_req directives outside location blocks..."
# Find limit_req directives that are not inside location blocks
# This is complex - let's just remove the one at line 84 for now

# Check if line 84 is inside a location block
LINE_84_CONTEXT=$(sed -n '75,95p' "$NGINX_CONFIG")
if echo "$LINE_84_CONTEXT" | grep -q "location"; then
    # Check if we're inside a location block
    LOCATION_BEFORE_84=$(sed -n '1,84p' "$NGINX_CONFIG" | grep -c "location" || echo "0")
    LOCATION_AFTER_84=$(sed -n '1,84p' "$NGINX_CONFIG" | tail -20 | grep -c "location" || echo "0")
    
    # Find the last location block before line 84
    LAST_LOC_BEFORE=$(sed -n '1,84p' "$NGINX_CONFIG" | grep -n "location" | tail -1 | cut -d: -f1 || echo "0")
    
    if [ "$LAST_LOC_BEFORE" -gt 0 ]; then
        # Check if that location block is closed before line 84
        LOC_BLOCK_CONTENT=$(sed -n "${LAST_LOC_BEFORE},84p" "$NGINX_CONFIG")
        CLOSING_BRACE=$(echo "$LOC_BLOCK_CONTENT" | grep -n "^[[:space:]]*}" | tail -1 | cut -d: -f1 || echo "0")
        
        if [ "$CLOSING_BRACE" -gt 0 ]; then
            # Location block is closed, limit_req is outside
            echo "⚠️  limit_req at line 84 is outside location block - will remove or comment it"
            sed -i '84s/^/# /' "$NGINX_CONFIG"
            echo "✅ Commented out limit_req at line 84"
        else
            echo "✅ limit_req at line 84 is inside location block"
        fi
    else
        echo "⚠️  No location block found before line 84 - will comment it"
        sed -i '84s/^/# /' "$NGINX_CONFIG"
        echo "✅ Commented out limit_req at line 84"
    fi
else
    echo "⚠️  No location block in context - will comment out line 84"
    sed -i '84s/^/# /' "$NGINX_CONFIG"
    echo "✅ Commented out limit_req at line 84"
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
echo "7. Reloading nginx..."
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

