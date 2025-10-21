#!/bin/bash

# Quick fix script for all 404 route errors
# This script addresses multiple missing routes in the admin dashboard

echo "🔧 TherapEase Quick Fix for All Route 404 Errors"
echo "================================================"

echo ""
echo "🔍 Step 1: Pulling latest changes..."
cd /home/therapease/therapease
git pull origin main

echo ""
echo "🔍 Step 2: Running comprehensive fix script..."
node fix-system-settings-route-issue.js

echo ""
echo "🔍 Step 3: Restarting all PM2 processes..."
pm2 restart all

echo ""
echo "🔍 Step 4: Waiting for services to start..."
sleep 10

echo ""
echo "🔍 Step 5: Testing key routes..."

# Test system-settings route
echo "🧪 Testing /api/admin/system-settings..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" \
     http://localhost:5000/api/admin/system-settings

# Test patients route
echo "🧪 Testing /api/admin/patients/with-assignments..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" \
     http://localhost:5000/api/admin/patients/with-assignments

# Test 2FA status route
echo "🧪 Testing /api/auth/2fa/status..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" \
     http://localhost:5000/api/auth/2fa/status

echo ""
echo "🔍 Step 6: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 7: Checking recent logs..."
pm2 logs therapease-api --lines 5 --nostream

echo ""
echo "🏁 Quick fix complete!"
echo ""
echo "📋 If routes are still 404, try these manual steps:"
echo "1. Check if all required controllers exist:"
echo "   ls -la server/controllers/"
echo ""
echo "2. Check if routes are properly registered:"
echo "   grep -n 'system-settings' server/routes/adminRoutes.js"
echo "   grep -n '2fa/status' server/routes/authRoutes.js"
echo ""
echo "3. Check for JavaScript syntax errors:"
echo "   node -c server/controllers/systemSettingsController.js"
echo "   node -c server/routes/adminRoutes.js"
echo ""
echo "4. Restart PM2 with force:"
echo "   pm2 delete all && pm2 start ecosystem.config.js"
