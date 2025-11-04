#!/bin/bash
# Fix nginx map directive error

set -e

echo "=========================================="
echo "  Fix Nginx Map Directive Error"
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

# Check what's at line 27
echo "2. Checking line 27 (where the error is):"
sed -n '20,35p' "$NGINX_CONFIG" | cat -n
echo ""

# Check if map directive exists
echo "3. Checking map directive..."
if grep -q "map.*block_bot" "$NGINX_CONFIG"; then
    echo "✅ Map directive found"
    echo ""
    echo "Current map directive:"
    grep -A 15 "map.*block_bot" "$NGINX_CONFIG" | head -20
else
    echo "❌ Map directive not found!"
    echo "Need to add it first."
    exit 1
fi
echo ""

# Find where the map directive should be (in http block, before server blocks)
echo "4. Finding where to place/fix map directive..."
HTTP_BLOCK_START=$(grep -n "^http {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
FIRST_SERVER_BLOCK=$(grep -n "^[[:space:]]*server {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -z "$HTTP_BLOCK_START" ]; then
    echo "❌ Could not find http block"
    exit 1
fi

if [ -z "$FIRST_SERVER_BLOCK" ]; then
    echo "❌ Could not find server blocks"
    exit 1
fi

echo "✅ HTTP block starts at line $HTTP_BLOCK_START"
echo "✅ First server block at line $FIRST_SERVER_BLOCK"
echo ""

# Check if map is in the right place (between http and first server)
MAP_LINE=$(grep -n "map.*block_bot" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -n "$MAP_LINE" ]; then
    if [ "$MAP_LINE" -gt "$HTTP_BLOCK_START" ] && [ "$MAP_LINE" -lt "$FIRST_SERVER_BLOCK" ]; then
        echo "✅ Map directive is in correct location (line $MAP_LINE)"
    else
        echo "⚠️  Map directive is in wrong location (line $MAP_LINE)"
        echo "   Should be between http block and server blocks"
    fi
fi
echo ""

# Remove broken map directive if it exists
echo "5. Fixing map directive..."
# Find the map block and remove it
sed -i '/^map.*block_bot/,/^}/d' "$NGINX_CONFIG"

# Add correct map directive before first server block
MAP_BLOCK="
# Block known bot user agents
map \$http_user_agent \$block_bot {
    default 0;
    ~*Go-http-client 1;  # Block Go HTTP client bots
    ~*bot 1;            # Block common bots
    ~*crawler 1;        # Block crawlers
    ~*spider 1;         # Block spiders
    ~*scraper 1;        # Block scrapers
    ~*curl 1;           # Block curl
    ~*wget 1;            # Block wget
    ~*python-requests 1; # Block Python requests
    ~*java 1;            # Block Java HTTP clients
    ~*httpclient 1;     # Block HTTP clients
    \"\" 1;                # Block empty user agents
}
"

# Insert map before first server block
awk -v n="$FIRST_SERVER_BLOCK" -v map="$MAP_BLOCK" '
    NR == n {
        print map
        print
        next
    }
    { print }
' "$NGINX_CONFIG" > "${NGINX_CONFIG}.tmp"
mv "${NGINX_CONFIG}.tmp" "$NGINX_CONFIG"

echo "✅ Fixed map directive"
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
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "❌ Changes reverted. Please check the configuration manually."
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

