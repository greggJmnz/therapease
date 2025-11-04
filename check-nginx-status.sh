#!/bin/bash
# Check Nginx Status - Verify it's running correctly with no errors or loops

set -e

echo "=========================================="
echo "  Nginx Status Check"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Some checks require root access. Run with sudo for full results."
    echo ""
fi

# 1. Check nginx service status
echo "1. Checking Nginx Service Status..."
echo "-----------------------------------"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
    systemctl status nginx --no-pager -l | head -5
else
    echo "❌ Nginx is NOT running!"
    systemctl status nginx --no-pager -l | head -10
fi
echo ""

# 2. Check nginx configuration syntax
echo "2. Checking Nginx Configuration Syntax..."
echo "-----------------------------------"
NGINX_TEST=$(nginx -t 2>&1)
NGINX_TEST_EXIT=$?

if [ $NGINX_TEST_EXIT -eq 0 ] && echo "$NGINX_TEST" | grep -q "test is successful"; then
    echo "✅ Nginx configuration is valid"
    echo "$NGINX_TEST" | grep "test is successful"
else
    echo "❌ Nginx configuration has errors!"
    echo "$NGINX_TEST"
fi
echo ""

# 3. Check nginx listening ports
echo "3. Checking Nginx Listening Ports..."
echo "-----------------------------------"
if command -v ss >/dev/null 2>&1; then
    LISTENING_PORTS=$(ss -tlnp 2>/dev/null | grep nginx | grep -E ":80|:443" || echo "")
    if [ -n "$LISTENING_PORTS" ]; then
        echo "✅ Nginx is listening on ports:"
        echo "$LISTENING_PORTS" | awk '{print "   Port:", $4}'
    else
        echo "❌ Nginx is not listening on ports 80/443"
    fi
else
    echo "⚠️  'ss' command not available, skipping port check"
fi
echo ""

# 4. Check nginx error logs (last 20 lines)
echo "4. Checking Nginx Error Logs (Last 20 Lines)..."
echo "-----------------------------------"
if [ -f /var/log/nginx/error.log ]; then
    ERROR_COUNT=$(tail -20 /var/log/nginx/error.log | grep -i "error\|emerg\|crit" | wc -l)
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo "✅ No recent errors in error log"
    else
        echo "⚠️  Found $ERROR_COUNT recent errors:"
        tail -20 /var/log/nginx/error.log | grep -i "error\|emerg\|crit" | tail -5
    fi
    echo ""
    echo "Recent error log entries:"
    tail -5 /var/log/nginx/error.log
else
    echo "⚠️  Error log file not found: /var/log/nginx/error.log"
fi
echo ""

# 5. Check for infinite loops in access logs
echo "5. Checking for Infinite Loops in Access Logs..."
echo "-----------------------------------"
if [ -f /var/log/nginx/access.log ]; then
    # Check for repeated requests from same IP in short time
    RECENT_LOOPS=$(tail -1000 /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -5)
    
    if [ -n "$RECENT_LOOPS" ]; then
        echo "Top 5 IPs with most requests (last 1000 requests):"
        echo "$RECENT_LOOPS" | awk '{printf "   %s requests from %s\n", $1, $2}'
        echo ""
        
        # Check for bot attacks
        BOT_REQUESTS=$(tail -1000 /var/log/nginx/access.log | grep -i "Go-http-client\|bot\|crawler" | wc -l)
        if [ "$BOT_REQUESTS" -gt 0 ]; then
            echo "⚠️  Found $BOT_REQUESTS bot requests in last 1000 requests"
            echo "   Checking if bot blocking is working..."
            
            # Check if bots are getting 403 or 400
            BOT_403=$(tail -1000 /var/log/nginx/access.log | grep -i "Go-http-client\|bot\|crawler" | grep " 403 " | wc -l)
            BOT_400=$(tail -1000 /var/log/nginx/access.log | grep -i "Go-http-client\|bot\|crawler" | grep " 400 " | wc -l)
            BOT_200=$(tail -1000 /var/log/nginx/access.log | grep -i "Go-http-client\|bot\|crawler" | grep " 200 " | wc -l)
            
            if [ "$BOT_403" -gt 0 ]; then
                echo "   ✅ Bot blocking working: $BOT_403 bots got 403 (blocked)"
            fi
            if [ "$BOT_400" -gt 0 ]; then
                echo "   ⚠️  $BOT_400 bots got 400 (should be 403)"
            fi
            if [ "$BOT_200" -gt 0 ]; then
                echo "   ❌ $BOT_200 bots got 200 (bot blocking NOT working!)"
            fi
        else
            echo "✅ No bot requests detected"
        fi
    fi
else
    echo "⚠️  Access log file not found: /var/log/nginx/access.log"
fi
echo ""

# 6. Check for redirect loops
echo "6. Checking for Redirect Loops..."
echo "-----------------------------------"
if [ -f /var/log/nginx/access.log ]; then
    REDIRECT_LOOPS=$(tail -1000 /var/log/nginx/access.log | grep -E " 301 | 302 " | awk '{print $1, $7}' | sort | uniq -c | sort -rn | head -5)
    if [ -n "$REDIRECT_LOOPS" ]; then
        echo "Recent redirects (check for loops):"
        echo "$REDIRECT_LOOPS" | awk '{printf "   %s redirects: %s -> %s\n", $1, $2, $3}' | head -5
    else
        echo "✅ No excessive redirects detected"
    fi
else
    echo "⚠️  Cannot check redirects - access log not found"
fi
echo ""

# 7. Check rate limiting effectiveness
echo "7. Checking Rate Limiting..."
echo "-----------------------------------"
if [ -f /var/log/nginx/access.log ]; then
    RATE_LIMIT_HITS=$(tail -1000 /var/log/nginx/access.log | grep -E " 429 " | wc -l)
    if [ "$RATE_LIMIT_HITS" -gt 0 ]; then
        echo "✅ Rate limiting working: $RATE_LIMIT_HITS rate limit hits (429 errors)"
    else
        echo "ℹ️  No rate limit hits in recent logs (this is normal if traffic is low)"
    fi
else
    echo "⚠️  Cannot check rate limiting - access log not found"
fi
echo ""

# 8. Test bot blocking manually
echo "8. Testing Bot Blocking Manually..."
echo "-----------------------------------"
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client user agent"
elif [ "$TEST_RESPONSE" = "200" ]; then
    echo "❌ Bot blocking NOT working! Got 200 (should be 403)"
elif [ "$TEST_RESPONSE" = "000" ]; then
    echo "⚠️  Could not test bot blocking (nginx may not be running or curl failed)"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE (unexpected response)"
fi
echo ""

# 9. Check nginx processes
echo "9. Checking Nginx Processes..."
echo "-----------------------------------"
NGINX_PROCESSES=$(ps aux | grep nginx | grep -v grep | wc -l)
if [ "$NGINX_PROCESSES" -gt 0 ]; then
    echo "✅ Found $NGINX_PROCESSES nginx process(es)"
    ps aux | grep nginx | grep -v grep | head -3 | awk '{print "   PID:", $2, "CPU:", $3"%", "MEM:", $4"%"}'
else
    echo "❌ No nginx processes found!"
fi
echo ""

# 10. Summary
echo "=========================================="
echo "  Summary"
echo "=========================================="
echo ""
echo "Quick Health Check:"
if systemctl is-active --quiet nginx && [ "$NGINX_TEST_EXIT" -eq 0 ] && [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Nginx is healthy and running correctly"
    echo "   - Service is running"
    echo "   - Configuration is valid"
    echo "   - Bot blocking is working"
elif systemctl is-active --quiet nginx && [ "$NGINX_TEST_EXIT" -eq 0 ]; then
    echo "⚠️  Nginx is running but bot blocking may need attention"
elif systemctl is-active --quiet nginx; then
    echo "❌ Nginx is running but configuration has errors"
else
    echo "❌ Nginx is not running or has issues"
fi
echo ""
echo "To view live logs:"
echo "  sudo tail -f /var/log/nginx/access.log"
echo "  sudo tail -f /var/log/nginx/error.log"
echo ""
echo "To reload nginx after config changes:"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""

