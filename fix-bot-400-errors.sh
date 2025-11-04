#!/bin/bash
# Fix Bot 400 Errors - Add Host validation that returns 403 for bots

set -e

echo "=========================================="
echo "  Fix Bot 400 Errors"
echo "=========================================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup config
echo "1. Backing up nginx config..."
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
echo "✅ Backup created: $BACKUP_CONFIG"
echo ""

# Check if Host validation exists
echo "2. Checking Host validation..."
if grep -q "host.*therapease\.site" "$NGINX_CONFIG" | grep -v "^#"; then
    echo "✅ Host validation exists"
else
    echo "⚠️  Host validation not found - will add"
fi

# Add Host validation that returns 403 for bots with invalid Host
echo ""
echo "3. Adding Host validation for bots..."

# Check if bot blocking map exists
if ! grep -q "map.*block_bot" "$NGINX_CONFIG"; then
    echo "❌ Bot blocking map not found!"
    echo "   Please run fix-bot-blocking-simple.sh first"
    exit 1
fi

# Find the server block for frontend (therapease.site)
SERVER_BLOCK_START=$(grep -n "server_name.*therapease\.site.*www\.therapease\.site" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -z "$SERVER_BLOCK_START" ]; then
    echo "❌ Could not find server block for therapease.site"
    exit 1
fi

# Find where to insert Host validation (after SSL config, before location blocks)
# Look for the first location block after the server block
FIRST_LOCATION=$(grep -n "^[[:space:]]*location " "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -z "$FIRST_LOCATION" ]; then
    echo "❌ Could not find location blocks"
    exit 1
fi

# Insert Host validation before location blocks
# This will return 403 for bots with invalid Host headers
cat > /tmp/host_validation.txt << 'EOF'
    # Validate Host header - return 403 for bots with invalid Host
    # This catches bots before they trigger 400 errors
    if ($host !~ ^(therapease\.site|www\.therapease\.site)$) {
        # Check if it's a bot
        if ($block_bot) {
            return 403;
        }
        # For non-bots with invalid Host, return 400 (normal behavior)
        return 400;
    }

EOF

# Insert before first location block
awk -v n="$FIRST_LOCATION" -v file="/tmp/host_validation.txt" '
    NR == n {
        while ((getline line < file) > 0) {
            print line
        }
        close(file)
        print
        next
    }
    { print }
' "$NGINX_CONFIG" > "${NGINX_CONFIG}.tmp"
mv "${NGINX_CONFIG}.tmp" "$NGINX_CONFIG"
rm -f /tmp/host_validation.txt

echo "   ✅ Added Host validation"

# Also add to API server block
echo ""
echo "4. Adding Host validation to API server block..."
API_SERVER_BLOCK=$(grep -n "server_name.*api\.therapease\.site" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -n "$API_SERVER_BLOCK" ]; then
    # Find first location block in API server
    API_LOCATION=$(grep -n "^[[:space:]]*location " "$NGINX_CONFIG" | awk -F: -v start="$API_SERVER_BLOCK" '$1 > start {print $1; exit}')
    
    if [ -n "$API_LOCATION" ]; then
        cat > /tmp/host_validation_api.txt << 'EOF'
    # Validate Host header for API - return 403 for bots with invalid Host
    if ($host !~ ^api\.therapease\.site$) {
        # Check if it's a bot
        if ($block_bot) {
            return 403;
        }
        # For non-bots with invalid Host, return 400 (normal behavior)
        return 400;
    }

EOF
        
        awk -v n="$API_LOCATION" -v file="/tmp/host_validation_api.txt" '
            NR == n {
                while ((getline line < file) > 0) {
                    print line
                }
                close(file)
                print
                next
            }
            { print }
        ' "$NGINX_CONFIG" > "${NGINX_CONFIG}.tmp"
        mv "${NGINX_CONFIG}.tmp" "$NGINX_CONFIG"
        rm -f /tmp/host_validation_api.txt
        echo "   ✅ Added Host validation to API server block"
    fi
fi

# Test nginx config
echo ""
echo "5. Testing nginx configuration..."
NGINX_TEST=$(nginx -t 2>&1)
if echo "$NGINX_TEST" | grep -q "test is successful"; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    echo ""
    echo "Error details:"
    echo "$NGINX_TEST"
    echo ""
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "❌ Changes reverted. Please check the configuration manually."
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

# Verify bot blocking works
echo ""
echo "7. Testing bot blocking..."
sleep 2

# Test with valid Host header
echo "   Testing with valid Host header..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" -H "Host: therapease.site" http://localhost/ 2>/dev/null || echo "000")
if [ "$TEST_RESPONSE" = "403" ]; then
    echo "   ✅ Bot blocking working with valid Host (got 403)"
else
    echo "   ⚠️  Got HTTP $TEST_RESPONSE with valid Host"
fi

# Test with invalid Host header
echo "   Testing with invalid Host header..."
TEST_RESPONSE_INVALID=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" -H "Host: invalid.example.com" http://localhost/ 2>/dev/null || echo "000")
if [ "$TEST_RESPONSE_INVALID" = "403" ]; then
    echo "   ✅ Bot blocking working with invalid Host (got 403)"
else
    echo "   ⚠️  Got HTTP $TEST_RESPONSE_INVALID with invalid Host"
fi

echo ""
echo "=========================================="
echo "  Bot 400 Error Fix Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Wait a few minutes for new bot requests"
echo "2. Check logs: sudo tail -f /var/log/nginx/access.log | grep 'Go-http-client'"
echo "3. Should see 403 errors instead of 400"
echo "4. Monitor: sudo tail -100 /var/log/nginx/access.log | grep ' 403 ' | grep 'Go-http-client' | wc -l"
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

