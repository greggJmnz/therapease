#!/bin/bash
# Fix Bot Blocking - Simple sed-based approach

set -e

echo "=========================================="
echo "  Fix Bot Blocking Configuration"
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

# Check if bot blocking map exists
echo "2. Checking bot blocking map..."
if grep -q "map.*block_bot" "$NGINX_CONFIG"; then
    echo "✅ Bot blocking map exists"
else
    echo "❌ Bot blocking map not found!"
    echo "   Please add the map block first (see nginx-rate-limit.conf)"
    exit 1
fi

# Check if bot blocking is in location / block
echo ""
echo "3. Adding bot blocking to location / block..."
if grep -A 10 "location / {" "$NGINX_CONFIG" | grep -q "if.*block_bot"; then
    echo "   ✅ Bot blocking already in location / block"
else
    echo "   Adding bot blocking to location / block..."
    
    # Find line number of "location / {" block
    LOC_LINE=$(grep -n "^[[:space:]]*location / {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    if [ -z "$LOC_LINE" ]; then
        echo "   ⚠️  Could not find 'location / {' block"
    else
        # Insert bot blocking after the opening brace
        sed -i "${LOC_LINE}a\    # Block bots FIRST (before rate limiting)\n    if (\$block_bot) {\n        return 403;\n    }\n" "$NGINX_CONFIG"
        echo "   ✅ Added bot blocking to location / block"
    fi
fi

# Check if bot blocking is in location /api/ block
echo ""
echo "4. Adding bot blocking to location /api/ block..."
if grep -A 15 "location /api/ {" "$NGINX_CONFIG" | grep -q "if.*block_bot"; then
    echo "   ✅ Bot blocking already in location /api/ block"
else
    echo "   Adding bot blocking to location /api/ block..."
    
    # Find line number of "location /api/ {" block
    API_LINE=$(grep -n "^[[:space:]]*location /api/ {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    if [ -z "$API_LINE" ]; then
        echo "   ⚠️  Could not find 'location /api/ {' block"
    else
        # Insert bot blocking after the opening brace (before OPTIONS handling)
        sed -i "${API_LINE}a\    # Block bots FIRST (before OPTIONS handling)\n    if (\$block_bot) {\n        return 403;\n    }\n" "$NGINX_CONFIG"
        echo "   ✅ Added bot blocking to location /api/ block"
    fi
fi

# Test nginx config
echo ""
echo "5. Testing nginx configuration..."
if nginx -t 2>&1 | grep -q "test is successful"; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "❌ Changes reverted. Please check the configuration manually."
    nginx -t
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
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client"
elif [ "$TEST_RESPONSE" = "400" ]; then
    echo "⚠️  Still getting 400 - may need to check for invalid Host headers"
    echo "   Check logs: sudo tail -f /var/log/nginx/access.log | grep 'Go-http-client'"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE - verify manually"
    echo "   Test command: curl -H 'User-Agent: Go-http-client/1.1' http://localhost/"
fi

echo ""
echo "=========================================="
echo "  Bot Blocking Fix Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check logs: sudo tail -f /var/log/nginx/access.log | grep 'Go-http-client'"
echo "2. Should see 403 errors instead of 400"
echo "3. Monitor: sudo tail -f /var/log/nginx/access.log | grep -E '403|400' | grep 'Go-http-client'"
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

