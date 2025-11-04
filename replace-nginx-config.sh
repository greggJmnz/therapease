#!/bin/bash
# Replace broken nginx config with clean version

set -e

echo "=========================================="
echo "  Replace Nginx Config with Clean Version"
echo "=========================================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
CLEAN_CONFIG="nginx-therapease-clean.conf"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if clean config exists
if [ ! -f "$CLEAN_CONFIG" ]; then
    echo "❌ Clean config file not found: $CLEAN_CONFIG"
    echo "   Make sure you're in the therapease directory"
    exit 1
fi

# Backup current config
echo "1. Backing up current nginx config..."
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
echo "✅ Backup created: $BACKUP_CONFIG"
echo ""

# Copy clean config
echo "2. Replacing with clean config..."
cp "$CLEAN_CONFIG" "$NGINX_CONFIG"
echo "✅ Clean config copied"
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
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "❌ Changes reverted. Please check the clean config file manually."
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
    echo "   Check if map is matching correctly"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE"
fi

echo ""
echo "=========================================="
echo "  Nginx Config Replacement Complete"
echo "=========================================="
echo ""
echo "Backup saved at: $BACKUP_CONFIG"
echo "Clean config source: $CLEAN_CONFIG"

