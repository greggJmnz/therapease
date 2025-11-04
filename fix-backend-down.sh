#!/bin/bash
# Quick Backend Diagnostic and Fix Script

echo "=========================================="
echo "  Backend Connection Diagnostic & Fix"
echo "=========================================="
echo ""

# 1. Check PM2 Status
echo "1. Checking PM2 Status..."
echo "-----------------------------------"
pm2 status
echo ""

# 2. Check if Port 5000 is Listening
echo "2. Checking Port 5000..."
echo "-----------------------------------"
PORT_CHECK=$(sudo ss -tlnp | grep :5000 || echo "NOT_FOUND")
if [ "$PORT_CHECK" = "NOT_FOUND" ]; then
    echo "❌ Port 5000 is NOT listening - Backend is NOT running"
    PORT_LISTENING=false
else
    echo "✅ Port 5000 is listening"
    echo "$PORT_CHECK"
    PORT_LISTENING=true
fi
echo ""

# 3. Test Backend Directly
echo "3. Testing Backend Response..."
echo "-----------------------------------"
BACKEND_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/health 2>&1)
HTTP_CODE=$(echo "$BACKEND_RESPONSE" | tail -1)
BODY=$(echo "$BACKEND_RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is responding correctly"
    echo "Response: $BODY"
    BACKEND_WORKING=true
else
    echo "❌ Backend is NOT responding"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $BODY"
    BACKEND_WORKING=false
fi
echo ""

# 4. Check Recent Backend Logs
echo "4. Checking Recent Backend Logs..."
echo "-----------------------------------"
RECENT_LOG=$(pm2 logs therapease-api --lines 5 --nostream 2>&1 | tail -5)
echo "$RECENT_LOG"
echo ""

# 5. Check PM2 Process Info
echo "5. Checking PM2 Process Info..."
echo "-----------------------------------"
PM2_INFO=$(pm2 describe therapease-api 2>&1)
echo "$PM2_INFO" | grep -E "status|restarts|uptime|mode" | head -5
RESTART_COUNT=$(echo "$PM2_INFO" | grep "restarts:" | awk '{print $2}' || echo "0")
echo "Restart count: $RESTART_COUNT"
if [ "$RESTART_COUNT" -gt 10 ]; then
    echo "⚠️  High restart count - Backend may be crashing repeatedly"
fi
echo ""

# 6. Fix Backend if Not Running
echo "6. Attempting to Fix Backend..."
echo "-----------------------------------"

if [ "$BACKEND_WORKING" = false ] || [ "$PORT_LISTENING" = false ]; then
    echo "Backend is not running. Attempting to restart..."
    
    # Stop backend
    echo "Stopping backend..."
    pm2 stop therapease-api 2>/dev/null
    
    # Wait a moment
    sleep 2
    
    # Start backend
    echo "Starting backend..."
    pm2 start ecosystem.config.js --only therapease-api
    
    # Wait for startup
    echo "Waiting for backend to start..."
    sleep 5
    
    # Check status again
    echo "Checking status after restart..."
    pm2 status | grep therapease-api
    
    # Test again
    echo "Testing backend again..."
    sleep 2
    NEW_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5000/api/health 2>&1)
    NEW_HTTP_CODE=$(echo "$NEW_RESPONSE" | tail -1)
    
    if [ "$NEW_HTTP_CODE" = "200" ]; then
        echo "✅ Backend restarted successfully!"
    else
        echo "❌ Backend still not responding. Check logs:"
        echo "   pm2 logs therapease-api --lines 50"
    fi
else
    echo "✅ Backend is already running correctly"
fi
echo ""

# 7. Check for Database Connection Errors
echo "7. Checking for Database Connection Errors..."
echo "-----------------------------------"
DB_ERRORS=$(pm2 logs therapease-api --lines 100 --nostream 2>&1 | grep -i "database\|mysql\|connection refused" | tail -3)
if [ -n "$DB_ERRORS" ]; then
    echo "⚠️  Recent database connection errors found:"
    echo "$DB_ERRORS"
else
    echo "✅ No recent database connection errors"
fi
echo ""

# 8. Final Status
echo "=========================================="
echo "  Final Status"
echo "=========================================="
echo ""
pm2 status | grep therapease-api
echo ""
echo "Test backend: curl http://localhost:5000/api/health"
echo ""

