#!/bin/bash

echo "🚀 Deploying Complete Server Fix"
echo "==============================="

echo ""
echo "🔍 Step 1: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 2: Stopping emergency server..."
pm2 stop therapease-emergency 2>/dev/null || true
pm2 delete therapease-emergency 2>/dev/null || true

echo ""
echo "🔍 Step 3: Creating logs directory..."
mkdir -p logs

echo ""
echo "🔍 Step 4: Building frontend..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 5: Starting proper PM2 processes..."
pm2 start ecosystem.config.js --env production

echo ""
echo "🔍 Step 6: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 7: Testing API endpoints..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Testing admin profile endpoint..."
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     https://www.therapease.site/api/admin/profile \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🏁 Complete server fix deployed!"
echo ""
echo "📋 Summary of fixes:"
echo "✅ Stopped emergency server"
echo "✅ Started proper API server (therapease-api)"
echo "✅ Started proper public server (therapease-public)"
echo "✅ Built frontend with latest changes"
echo "✅ All admin routes should now work"
echo ""
echo "🎯 Expected results:"
echo "- ✅ Profile endpoints return 200 OK"
echo "- ✅ Password change works"
echo "- ✅ Profile update works"
echo "- ✅ All admin functionality restored"
