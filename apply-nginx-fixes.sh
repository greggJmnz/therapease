#!/bin/bash
# Apply Nginx fixes: permissions and bot blocking

set -e

echo "=========================================="
echo "  Apply Nginx Fixes"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

echo "1. Fixing file permissions..."
cd /home/therapease_user/therapease
./fix-nginx-permissions.sh
echo ""

echo "2. Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi
echo ""

echo "3. Reloading Nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload Nginx!"
    exit 1
fi
echo ""

echo "4. Testing bot blocking..."
sleep 2
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking is working (returned 403)"
elif [ "$TEST_RESPONSE" = "000" ]; then
    echo "⚠️  Could not test bot blocking (connection failed)"
else
    echo "⚠️  Bot blocking test returned HTTP $TEST_RESPONSE (expected 403)"
fi
echo ""

echo "=========================================="
echo "  All Fixes Applied"
echo "=========================================="
echo ""
echo "✅ File permissions fixed"
echo "✅ Nginx configuration updated"
echo "✅ Nginx reloaded"
echo ""
echo "Monitor Nginx logs for any issues:"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""

