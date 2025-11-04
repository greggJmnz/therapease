#!/bin/bash
# Diagnose why bots are getting 400 errors instead of 403

echo "=========================================="
echo "  Diagnose Bot 400 Errors"
echo "=========================================="
echo ""

echo "1. Sample of 400 errors from bots:"
echo "-----------------------------------"
sudo tail -100 /var/log/nginx/access.log | grep " 400 " | grep "Go-http-client" | head -5
echo ""

echo "2. Check Host headers in 400 errors:"
echo "-----------------------------------"
sudo tail -100 /var/log/nginx/access.log | grep " 400 " | grep "Go-http-client" | awk '{print $NF}' | sort | uniq -c | head -10
echo ""

echo "3. Check nginx error log for 400 errors:"
echo "-----------------------------------"
sudo tail -50 /var/log/nginx/error.log | grep -i "400\|bad request\|client sent invalid" | head -10
echo ""

echo "4. Check if bot blocking is actually in config:"
echo "-----------------------------------"
if sudo grep -A 5 "location / {" /etc/nginx/sites-enabled/therapease | grep -q "block_bot"; then
    echo "✅ Bot blocking found in location / block"
else
    echo "❌ Bot blocking NOT in location / block"
fi

if sudo grep -A 10 "location /api/ {" /etc/nginx/sites-enabled/therapease | grep -q "block_bot"; then
    echo "✅ Bot blocking found in location /api/ block"
else
    echo "❌ Bot blocking NOT in location /api/ block"
fi
echo ""

echo "5. Test bot blocking manually:"
echo "-----------------------------------"
echo "Testing with Go-http-client user agent..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")
echo "Response code: $RESPONSE"
if [ "$RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working (got 403)"
elif [ "$RESPONSE" = "400" ]; then
    echo "❌ Still getting 400 - likely invalid Host header"
else
    echo "⚠️  Got HTTP $RESPONSE"
fi
echo ""

echo "6. Check if bots are using IP address instead of domain:"
echo "-----------------------------------"
sudo tail -100 /var/log/nginx/access.log | grep " 400 " | grep "Go-http-client" | awk '{print $1}' | sort | uniq -c | head -5
echo ""

echo "=========================================="
echo "  Diagnosis Complete"
echo "=========================================="

