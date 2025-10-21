#!/bin/bash

echo "🚀 Deploying Admin Profile Settings Fix"
echo "======================================="

echo ""
echo "🔍 Step 1: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 2: Building frontend with fixes..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 3: Restarting PM2 processes..."
pm2 restart all

echo ""
echo "🔍 Step 4: Testing profile endpoints..."
echo "Testing profile GET endpoint..."
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     https://www.therapease.site/api/admin/profile \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🔍 Step 5: Checking PM2 status..."
pm2 status

echo ""
echo "🏁 Admin profile settings fix deployed!"
echo ""
echo "📋 Summary of fixes:"
echo "✅ Fixed password validation mismatch (6→8 characters)"
echo "✅ Added debug logging to profile controller"
echo "✅ Added debug logging to password change function"
echo "✅ Verified admin routes exist"
echo "✅ Verified API endpoints exist"
echo "✅ Created test script for verification"
echo ""
echo "🎯 Expected results:"
echo "- ✅ Password change works (8+ characters required)"
echo "- ✅ Profile update works"
echo "- ✅ Better error messages in console"
echo "- ✅ Debug logging for troubleshooting"
