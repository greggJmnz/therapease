#!/bin/bash
# Nginx Log Analysis Script
# Checks for loops, excessive requests, and performance issues

echo "=========================================="
echo "  Nginx Log Analysis - Performance Check"
echo "=========================================="
echo ""

# Check if log files exist
if [ ! -f /var/log/nginx/access.log ]; then
    echo "❌ Error: /var/log/nginx/access.log not found"
    exit 1
fi

if [ ! -f /var/log/nginx/error.log ]; then
    echo "❌ Error: /var/log/nginx/error.log not found"
    exit 1
fi

echo "1. Recent Errors (last 50 lines):"
echo "-----------------------------------"
sudo tail -50 /var/log/nginx/error.log | grep -E "error|warn|crit" | tail -10 || echo "No recent errors found"
echo ""

echo "2. Rate Limiting Hits (429 Too Many Requests):"
echo "-----------------------------------"
RATE_LIMIT_COUNT=$(sudo tail -1000 /var/log/nginx/access.log | grep " 429 " | wc -l)
echo "Found: $RATE_LIMIT_COUNT rate limit hits in last 1000 requests"
if [ "$RATE_LIMIT_COUNT" -gt 0 ]; then
    echo "⚠️  Top IPs hitting rate limits:"
    sudo tail -1000 /var/log/nginx/access.log | grep " 429 " | awk '{print $1}' | sort | uniq -c | sort -rn | head -5
fi
echo ""

echo "3. CORS/OPTIONS Issues:"
echo "-----------------------------------"
OPTIONS_FAILED=$(sudo tail -1000 /var/log/nginx/access.log | grep "OPTIONS" | grep -E " 403| 404| 500" | wc -l)
OPTIONS_TOTAL=$(sudo tail -1000 /var/log/nginx/access.log | grep "OPTIONS" | wc -l)
echo "Total OPTIONS requests: $OPTIONS_TOTAL"
echo "Failed OPTIONS requests (403/404/500): $OPTIONS_FAILED"
if [ "$OPTIONS_FAILED" -gt 0 ]; then
    echo "⚠️  Failed OPTIONS requests:"
    sudo tail -1000 /var/log/nginx/access.log | grep "OPTIONS" | grep -E " 403| 404| 500" | tail -5
fi
echo ""

echo "4. Most Frequent Endpoints (Top 10):"
echo "-----------------------------------"
sudo tail -1000 /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10
echo ""

echo "5. Server Errors (5xx):"
echo "-----------------------------------"
SERVER_ERRORS=$(sudo tail -1000 /var/log/nginx/access.log | grep " 50[0-9] " | wc -l)
echo "Found: $SERVER_ERRORS server errors in last 1000 requests"
if [ "$SERVER_ERRORS" -gt 0 ]; then
    echo "⚠️  Recent server errors:"
    sudo tail -1000 /var/log/nginx/access.log | grep " 50[0-9] " | tail -5
fi
echo ""

echo "6. Redirect Loops (301/302):"
echo "-----------------------------------"
REDIRECT_COUNT=$(sudo tail -1000 /var/log/nginx/access.log | grep -E " 301| 302" | wc -l)
echo "Found: $REDIRECT_COUNT redirects in last 1000 requests"
if [ "$REDIRECT_COUNT" -gt 10 ]; then
    echo "⚠️  Top redirect patterns (possible loops):"
    sudo tail -1000 /var/log/nginx/access.log | awk '{print $1, $7, $9}' | grep -E " 301| 302" | sort | uniq -c | sort -rn | head -5
fi
echo ""

echo "7. Maintenance Status Polling:"
echo "-----------------------------------"
MAINTENANCE_COUNT=$(sudo tail -1000 /var/log/nginx/access.log | grep "maintenance-status" | wc -l)
echo "Found: $MAINTENANCE_COUNT maintenance-status requests in last 1000 requests"
if [ "$MAINTENANCE_COUNT" -gt 50 ]; then
    echo "⚠️  Polling too frequently! Check polling interval in frontend."
    echo "Recent maintenance-status requests:"
    sudo tail -100 /var/log/nginx/access.log | grep "maintenance-status" | awk '{print $4}' | cut -d: -f1-2 | sort | uniq -c | tail -5
fi
echo ""

echo "8. Forbidden Requests (403):"
echo "-----------------------------------"
FORBIDDEN_COUNT=$(sudo tail -1000 /var/log/nginx/access.log | grep " 403 " | wc -l)
echo "Found: $FORBIDDEN_COUNT forbidden requests in last 1000 requests"
if [ "$FORBIDDEN_COUNT" -gt 0 ]; then
    echo "Top 403 patterns:"
    sudo tail -1000 /var/log/nginx/access.log | grep " 403 " | awk '{print $7}' | sort | uniq -c | sort -rn | head -5
fi
echo ""

echo "9. Upstream Connection Issues:"
echo "-----------------------------------"
UPSTREAM_ERRORS=$(sudo tail -500 /var/log/nginx/error.log | grep -E "upstream|connect|timeout|refused" | wc -l)
echo "Found: $UPSTREAM_ERRORS upstream errors in last 500 error log entries"
if [ "$UPSTREAM_ERRORS" -gt 0 ]; then
    echo "⚠️  Recent upstream errors:"
    sudo tail -500 /var/log/nginx/error.log | grep -E "upstream|connect|timeout|refused" | tail -5
fi
echo ""

echo "10. Request Patterns (Last 5 minutes):"
echo "-----------------------------------"
CURRENT_MIN=$(date +%d/%b/%Y:%H:%M)
echo "Requests in current minute:"
sudo grep "$CURRENT_MIN" /var/log/nginx/access.log | wc -l
echo ""

echo "=========================================="
echo "  Analysis Complete"
echo "=========================================="
echo ""
echo "💡 Recommendations:"
echo "  - If rate limiting (429) is high, consider increasing limits"
echo "  - If OPTIONS requests are failing, check CORS configuration"
echo "  - If maintenance-status polling > 50/1000, reduce polling interval"
echo "  - If server errors (5xx) > 0, check backend logs"
echo "  - If upstream errors, check backend connectivity"
echo ""

