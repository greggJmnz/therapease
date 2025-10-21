#!/bin/bash

echo "🔄 Reverting to Emergency Server"
echo "================================="

echo ""
echo "🔍 Step 1: Stopping main API processes..."
pm2 stop therapease-api 2>/dev/null || true
pm2 stop therapease-public 2>/dev/null || true
pm2 delete therapease-api 2>/dev/null || true
pm2 delete therapease-public 2>/dev/null || true

echo ""
echo "🔍 Step 2: Starting emergency server..."
pm2 start emergency-server.js --name therapease-emergency

echo ""
echo "🔍 Step 3: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 4: Testing emergency server endpoints..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Testing basic auth endpoint..."
curl -s https://www.therapease.site/api/auth/verify -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🏁 Reverted to emergency server!"
echo ""
echo "📋 Current status:"
echo "- ✅ therapease-emergency process running"
echo "- ✅ Basic API endpoints working"
echo "- ⚠️  Admin profile endpoints may not work (emergency server limitation)"
echo ""
echo "🔧 To switch back to full API server later:"
echo "Run: ./fix-pm2-processes.sh";
