#!/bin/bash
# Check backend application status and diagnose connection refused errors

echo "=========================================="
echo "  Backend Status Check"
echo "=========================================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed!"
    echo "   Install with: npm install -g pm2"
    exit 1
fi

echo "1. Checking PM2 status..."
echo "-----------------------------------"
pm2 status
echo ""

# Check if therapease-api is running
if pm2 list | grep -q "therapease-api.*online"; then
    echo "✅ Backend (therapease-api) is running"
    
    # Get process info
    API_PID=$(pm2 jlist | jq -r '.[] | select(.name=="therapease-api") | .pid')
    API_PORT=$(pm2 jlist | jq -r '.[] | select(.name=="therapease-api") | .pm2_env.env.PORT // 5000')
    
    echo "   PID: $API_PID"
    echo "   Port: $API_PORT"
else
    echo "❌ Backend (therapease-api) is NOT running!"
    echo ""
    echo "   Attempting to start..."
    cd /home/therapease_user/therapease
    pm2 start ecosystem.config.js --only therapease-api
    sleep 2
    
    if pm2 list | grep -q "therapease-api.*online"; then
        echo "✅ Backend started successfully"
    else
        echo "❌ Failed to start backend. Check logs below."
    fi
fi
echo ""

# Check if port 5000 is listening
echo "2. Checking if port 5000 is listening..."
echo "-----------------------------------"
if command -v ss &> /dev/null; then
    PORT_CHECK=$(ss -tlnp | grep :5000 || echo "")
else
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep :5000 || echo "")
fi

if [ -n "$PORT_CHECK" ]; then
    echo "✅ Port 5000 is listening:"
    echo "$PORT_CHECK"
else
    echo "❌ Port 5000 is NOT listening!"
    echo "   This means the backend is not accepting connections"
fi
echo ""

# Test backend connection
echo "3. Testing backend connection..."
echo "-----------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health --max-time 5 2>/dev/null || echo "000")

if [ "$RESPONSE" = "200" ]; then
    echo "✅ Backend is responding (HTTP 200)"
elif [ "$RESPONSE" = "000" ]; then
    echo "❌ Backend is not responding (connection refused)"
    echo "   This is the cause of Nginx 'connect() failed' errors"
else
    echo "⚠️  Backend responded with HTTP $RESPONSE"
    echo "   Backend is running but may have issues"
fi
echo ""

# Check PM2 logs
echo "4. Checking recent PM2 logs (last 20 lines)..."
echo "-----------------------------------"
if pm2 logs therapease-api --lines 20 --nostream 2>/dev/null | tail -20; then
    echo ""
    echo "💡 To see more logs: pm2 logs therapease-api --lines 50"
else
    echo "⚠️  Could not retrieve PM2 logs"
fi
echo ""

# Check firewall
echo "5. Checking firewall status..."
echo "-----------------------------------"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1 || echo "not_active")
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo "⚠️  UFW is active. Checking rules for port 5000..."
        sudo ufw status | grep 5000 || echo "   No explicit rules for port 5000 (should be fine for localhost)"
    else
        echo "✅ UFW is not active (or inactive)"
    fi
else
    echo "ℹ️  UFW is not installed"
fi
echo ""

# Check system resources
echo "6. Checking system resources..."
echo "-----------------------------------"
echo "Memory usage:"
free -h | grep -E "Mem|Swap"
echo ""
echo "Disk usage:"
df -h / | tail -1
echo ""

# Summary and recommendations
echo "=========================================="
echo "  Summary & Recommendations"
echo "=========================================="
echo ""

if pm2 list | grep -q "therapease-api.*online"; then
    if [ "$RESPONSE" = "200" ]; then
        echo "✅ Backend is running and responding correctly"
        echo ""
        echo "If you're still seeing 'connect() failed' errors in Nginx:"
        echo "1. Check Nginx error logs: sudo tail -f /var/log/nginx/error.log"
        echo "2. Restart Nginx: sudo systemctl reload nginx"
        echo "3. Verify Nginx proxy_pass is correct (should be http://127.0.0.1:5000)"
    else
        echo "⚠️  Backend is running but not responding"
        echo ""
        echo "Recommendations:"
        echo "1. Check PM2 logs: pm2 logs therapease-api --lines 100"
        echo "2. Restart backend: pm2 restart therapease-api"
        echo "3. Check database connection in backend logs"
    fi
else
    echo "❌ Backend is NOT running"
    echo ""
    echo "Recommendations:"
    echo "1. Check PM2 logs: pm2 logs therapease-api --lines 100"
    echo "2. Start backend: cd /home/therapease_user/therapease && pm2 start ecosystem.config.js --only therapease-api"
    echo "3. Check ecosystem.config.js for correct configuration"
    echo "4. Verify .env.production file exists and has correct settings"
    echo "5. Check database connection"
fi
echo ""

