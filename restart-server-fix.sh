#!/bin/bash

# Simple server restart script for system-settings route issue
# This script can be run as root to restart the server

echo "🔧 TherapEase Server Restart Fix"
echo "================================"

echo ""
echo "🔍 Step 1: Checking current PM2 status..."
pm2 status

echo ""
echo "🔍 Step 2: Restarting TherapEase server..."
pm2 restart therapease

echo ""
echo "🔍 Step 3: Waiting for server to start..."
sleep 5

echo ""
echo "🔍 Step 4: Checking server status..."
pm2 status

echo ""
echo "🔍 Step 5: Testing system-settings route..."
# Test the route with curl
if command -v curl >/dev/null 2>&1; then
    echo "🧪 Testing /api/admin/system-settings locally..."
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
         -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" \
         http://localhost:5000/api/admin/system-settings
    
    echo "🧪 Testing through nginx..."
    curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
         -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" \
         http://localhost/api/admin/system-settings
else
    echo "⚠️  curl not available for testing"
fi

echo ""
echo "🔍 Step 6: Checking recent logs..."
echo "📋 Recent PM2 logs:"
pm2 logs therapease --lines 10 --nostream

echo ""
echo "🏁 Server restart complete!"
echo ""
echo "📋 If the system-settings route is still 404:"
echo "1. Check if the route is properly registered in adminRoutes.js"
echo "2. Verify systemSettingsController.js exists and is valid"
echo "3. Check for any JavaScript syntax errors in the controller"
echo "4. Run: node fix-system-settings-route.js"
echo ""
echo "🔧 Manual test commands:"
echo "curl -H 'Authorization: Bearer TOKEN' http://localhost:5000/api/admin/system-settings"
echo "curl -H 'Authorization: Bearer TOKEN' http://localhost/api/admin/system-settings"
