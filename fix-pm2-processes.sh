#!/bin/bash

echo "🔧 Fixing PM2 Processes"
echo "======================="

echo ""
echo "🔍 Step 1: Stopping emergency server..."
pm2 stop therapease-emergency
pm2 delete therapease-emergency

echo ""
echo "🔍 Step 2: Starting proper API server..."
pm2 start ecosystem.config.js --env production

echo ""
echo "🔍 Step 3: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 4: Testing API endpoints..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Testing profile endpoint (should work now)..."
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     https://www.therapease.site/api/admin/profile \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🏁 PM2 processes fixed!"
echo ""
echo "📋 Expected results:"
echo "- ✅ therapease-api process running"
echo "- ✅ therapease-public process running"
echo "- ✅ Profile endpoints return 200 OK"
echo "- ✅ All admin routes working"
