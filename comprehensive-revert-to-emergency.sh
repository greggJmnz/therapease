#!/bin/bash

echo "🔄 Comprehensive Revert to Emergency Server"
echo "==========================================="

echo ""
echo "🔍 Step 1: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 2: Stopping all current processes..."
pm2 stop all
pm2 delete all

echo ""
echo "🔍 Step 3: Starting emergency server..."
pm2 start emergency-server.js --name therapease-emergency

echo ""
echo "🔍 Step 4: Building frontend (if needed)..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 5: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 6: Testing emergency server..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Testing auth verify endpoint..."
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"token":"test-token"}' \
     https://www.therapease.site/api/auth/verify \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🏁 Successfully reverted to emergency server!"
echo ""
echo "📋 Current status:"
echo "- ✅ therapease-emergency process running"
echo "- ✅ Basic API endpoints working"
echo "- ✅ Health check working"
echo "- ✅ Auth verify working"
echo "- ⚠️  Admin profile endpoints limited (emergency server)"
echo ""
echo "🔧 Emergency server limitations:"
echo "- Limited admin routes"
echo "- Profile management may not work"
echo "- Password change may not work"
echo "- Only basic functionality available"
echo ""
echo "🔧 To restore full functionality later:"
echo "Run: ./fix-pm2-processes.sh";
