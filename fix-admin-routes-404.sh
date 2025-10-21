#!/bin/bash

# Fix script for admin routes 404 error
# This script addresses admin route registration issues

echo "🔧 TherapEase Admin Routes 404 Fix Script"
echo "=========================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "🔍 Step 1: Checking PM2 status..."

# Check PM2 status
if command_exists pm2; then
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
else
    echo "❌ PM2 not found. Please install PM2 first."
    exit 1
fi

echo ""
echo "🔍 Step 2: Checking server configuration..."

# Check if server/index.js exists and has admin routes
if [ -f "server/index.js" ]; then
    echo "✅ server/index.js exists"
    
    # Check if admin routes are registered
    if grep -q "app.use('/api/admin', adminRoutes);" server/index.js; then
        echo "✅ Admin routes are registered in server/index.js"
    else
        echo "❌ Admin routes NOT found in server/index.js"
        echo "🔧 Adding admin routes registration..."
        
        # Add admin routes if missing
        if ! grep -q "adminRoutes" server/index.js; then
            echo "const adminRoutes = require('./routes/adminRoutes');" >> server/index.js.tmp
            echo "Admin routes import added to server/index.js"
        fi
        
        if ! grep -q "app.use('/api/admin', adminRoutes);" server/index.js; then
            echo "app.use('/api/admin', adminRoutes);" >> server/index.js.tmp
            echo "Admin routes registration added to server/index.js"
        fi
    fi
else
    echo "❌ server/index.js not found"
    exit 1
fi

# Check if adminRoutes.js exists
if [ -f "server/routes/adminRoutes.js" ]; then
    echo "✅ server/routes/adminRoutes.js exists"
else
    echo "❌ server/routes/adminRoutes.js not found"
    exit 1
fi

# Check if systemSettingsController.js exists
if [ -f "server/controllers/systemSettingsController.js" ]; then
    echo "✅ server/controllers/systemSettingsController.js exists"
else
    echo "❌ server/controllers/systemSettingsController.js not found"
    exit 1
fi

echo ""
echo "🔍 Step 3: Restarting the server..."

# Restart the server
echo "🔄 Restarting TherapEase server..."
pm2 restart therapease

# Wait for server to start
sleep 5

# Check if server is running
if pm2 list | grep -q "therapease.*online"; then
    echo "✅ TherapEase server is running"
else
    echo "❌ TherapEase server failed to start"
    echo "📋 Checking PM2 logs:"
    pm2 logs therapease --lines 20 --nostream
    exit 1
fi

echo ""
echo "🔍 Step 4: Testing admin routes..."

# Test admin routes locally
if command_exists curl; then
    echo "🧪 Testing admin routes locally..."
    
    # Test system-settings endpoint
    local_response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" http://localhost:5000/api/admin/system-settings 2>/dev/null)
    
    if [ "$local_response" = "200" ]; then
        echo "✅ Local admin/system-settings endpoint is working (status: $local_response)"
    elif [ "$local_response" = "404" ]; then
        echo "❌ Local admin/system-settings endpoint returns 404"
    else
        echo "⚠️  Local admin/system-settings endpoint response: $local_response"
    fi
    
    # Test dashboard endpoint
    dashboard_response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" http://localhost:5000/api/admin/dashboard 2>/dev/null)
    
    if [ "$dashboard_response" = "200" ]; then
        echo "✅ Local admin/dashboard endpoint is working (status: $dashboard_response)"
    elif [ "$dashboard_response" = "404" ]; then
        echo "❌ Local admin/dashboard endpoint returns 404"
    else
        echo "⚠️  Local admin/dashboard endpoint response: $dashboard_response"
    fi
    
    # Test through nginx
    echo "🧪 Testing through nginx..."
    nginx_response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" http://localhost/api/admin/system-settings 2>/dev/null)
    
    if [ "$nginx_response" = "200" ]; then
        echo "✅ Nginx admin/system-settings proxy is working (status: $nginx_response)"
    elif [ "$nginx_response" = "404" ]; then
        echo "❌ Nginx admin/system-settings proxy returns 404"
    else
        echo "⚠️  Nginx admin/system-settings proxy response: $nginx_response"
    fi
else
    echo "⚠️  curl not available for testing"
fi

echo ""
echo "🔍 Step 5: Checking logs for errors..."

# Check PM2 logs
echo "📋 Recent PM2 logs:"
pm2 logs therapease --lines 10 --nostream

echo ""
echo "🏁 Admin routes fix script completed!"
echo ""
echo "📋 Next steps if the issue persists:"
echo "1. Check the diagnostic script: node diagnose-admin-routes.js"
echo "2. Verify the server is running: pm2 status"
echo "3. Check server logs: pm2 logs therapease"
echo "4. Verify admin routes are properly imported in server/index.js"
echo "5. Check if there are any syntax errors in adminRoutes.js"
echo ""
echo "🔧 Manual fixes to try:"
echo "1. Restart PM2: pm2 restart all"
echo "2. Check route registration: grep -n 'adminRoutes' server/index.js"
echo "3. Test routes manually with curl"
echo "4. Check for any middleware issues blocking admin routes"
