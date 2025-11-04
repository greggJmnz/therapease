#!/bin/bash
# Check nginx IPv6 vs IPv4 issue and verify config

echo "=========================================="
echo "  Nginx IPv6/IPv4 Configuration Check"
echo "=========================================="
echo ""

# 1. Check for NEW errors (last 5 minutes)
echo "1. Checking for NEW errors (last 5 minutes)..."
echo "-----------------------------------"
CURRENT_TIME=$(date +%d/%b/%Y:%H:%M)
NEW_ERRORS=$(sudo grep "$CURRENT_TIME" /var/log/nginx/error.log 2>/dev/null | grep -i "connection refused" | wc -l)
if [ "$NEW_ERRORS" -gt 0 ]; then
    echo "⚠️  Found $NEW_ERRORS NEW connection refused errors in last minute"
    sudo grep "$CURRENT_TIME" /var/log/nginx/error.log | grep -i "connection refused" | tail -5
else
    echo "✅ No new errors in last minute - Backend is working now"
fi
echo ""

# 2. Check nginx config for proxy_pass
echo "2. Checking nginx proxy_pass configuration..."
echo "-----------------------------------"
NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Error: $NGINX_CONFIG not found"
    exit 1
fi

PROXY_PASS_LINES=$(sudo grep -n "proxy_pass" "$NGINX_CONFIG" | grep -v "#")
echo "Found proxy_pass directives:"
echo "$PROXY_PASS_LINES"
echo ""

# Check for IPv6 vs IPv4
IPV6_COUNT=$(echo "$PROXY_PASS_LINES" | grep -E "localhost|::1|\[::1\]" | wc -l)
IPV4_COUNT=$(echo "$PROXY_PASS_LINES" | grep "127.0.0.1" | wc -l)

if [ "$IPV6_COUNT" -gt 0 ]; then
    echo "⚠️  Found $IPV6_COUNT proxy_pass using localhost (may resolve to IPv6)"
    echo "$PROXY_PASS_LINES" | grep -E "localhost|::1|\[::1\]"
    echo ""
    echo "❌ ISSUE: Using 'localhost' can resolve to IPv6 [::1]"
    echo "   Backend may only be listening on IPv4 (127.0.0.1)"
    echo "   FIX: Change 'localhost' to '127.0.0.1' in nginx config"
fi

if [ "$IPV4_COUNT" -gt 0 ]; then
    echo "✅ Found $IPV4_COUNT proxy_pass using explicit IPv4 (127.0.0.1)"
fi
echo ""

# 3. Check what backend is listening on
echo "3. Checking backend listening interfaces..."
echo "-----------------------------------"
LISTENING=$(sudo ss -tlnp | grep :5000 || echo "NOT_FOUND")
if [ "$LISTENING" = "NOT_FOUND" ]; then
    echo "❌ Backend is NOT listening on port 5000"
else
    echo "Backend listening on:"
    echo "$LISTENING"
    echo ""
    
    # Check for IPv6
    IPV6_LISTEN=$(echo "$LISTENING" | grep -E "\[::\]|::1" || echo "")
    IPV4_LISTEN=$(echo "$LISTENING" | grep "0.0.0.0\|127.0.0.1" || echo "")
    
    if [ -z "$IPV6_LISTEN" ] && [ -n "$IPV4_LISTEN" ]; then
        echo "⚠️  Backend is ONLY listening on IPv4 (0.0.0.0:5000)"
        echo "   Nginx MUST use 127.0.0.1 (IPv4) not localhost (may be IPv6)"
    elif [ -n "$IPV6_LISTEN" ]; then
        echo "✅ Backend is listening on IPv6 - can use localhost"
    fi
fi
echo ""

# 4. Check recent errors for IPv6 vs IPv4
echo "4. Checking recent errors for IPv6 vs IPv4 usage..."
echo "-----------------------------------"
RECENT_IPV6_ERRORS=$(sudo tail -100 /var/log/nginx/error.log | grep -E "\[::1\]|::1" | grep "connection refused" | wc -l)
RECENT_IPV4_ERRORS=$(sudo tail -100 /var/log/nginx/error.log | grep "127.0.0.1" | grep "connection refused" | wc -l)

if [ "$RECENT_IPV6_ERRORS" -gt 0 ]; then
    echo "⚠️  Found $RECENT_IPV6_ERRORS recent errors trying IPv6 [::1]"
    echo "   This confirms nginx is trying IPv6 when backend is IPv4 only"
fi

if [ "$RECENT_IPV4_ERRORS" -gt 0 ]; then
    echo "⚠️  Found $RECENT_IPV4_ERRORS recent errors trying IPv4 127.0.0.1"
    echo "   These may be from when backend was down"
fi
echo ""

# 5. Recommendations
echo "=========================================="
echo "  Recommendations"
echo "=========================================="
echo ""

if [ "$IPV6_COUNT" -gt 0 ]; then
    echo "🔧 FIX REQUIRED: Update nginx config to use IPv4"
    echo ""
    echo "1. Edit nginx config:"
    echo "   sudo nano /etc/nginx/sites-enabled/therapease"
    echo ""
    echo "2. Find all 'proxy_pass' lines using 'localhost'"
    echo "   Change from: proxy_pass http://localhost:5000/api/;"
    echo "   Change to:   proxy_pass http://127.0.0.1:5000/api/;"
    echo ""
    echo "3. Test and reload:"
    echo "   sudo nginx -t"
    echo "   sudo systemctl reload nginx"
    echo ""
else
    echo "✅ Nginx config looks correct (using 127.0.0.1)"
    echo ""
    echo "If you still see errors, check:"
    echo "  - Backend is running: pm2 status"
    echo "  - Backend is listening: sudo ss -tlnp | grep :5000"
    echo "  - Test backend directly: curl http://127.0.0.1:5000/api/health"
fi
echo ""

