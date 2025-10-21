#!/bin/bash

# Fix script for /api/auth/verify 404 error
# This script addresses the most common causes of the 404 error

echo "🔧 TherapEase Auth Verify 404 Fix Script"
echo "========================================"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check service status
check_service() {
    local service=$1
    if command_exists systemctl; then
        if systemctl is-active --quiet $service; then
            echo "✅ $service is running"
            return 0
        else
            echo "❌ $service is not running"
            return 1
        fi
    else
        echo "⚠️  Cannot check $service status (systemctl not available)"
        return 1
    fi
}

# Function to restart service
restart_service() {
    local service=$1
    if command_exists systemctl; then
        echo "🔄 Restarting $service..."
        sudo systemctl restart $service
        sleep 2
        if systemctl is-active --quiet $service; then
            echo "✅ $service restarted successfully"
        else
            echo "❌ Failed to restart $service"
        fi
    fi
}

echo ""
echo "🔍 Step 1: Checking system status..."

# Check if PM2 is running
if command_exists pm2; then
    echo "📊 PM2 Status:"
    pm2 status
    echo ""
else
    echo "❌ PM2 not found. Please install PM2 first."
    exit 1
fi

# Check nginx status
check_service nginx
nginx_status=$?

echo ""
echo "🔍 Step 2: Checking TherapEase application..."

# Check if therapease app is running in PM2
if pm2 list | grep -q "therapease"; then
    echo "✅ TherapEase app found in PM2"
    
    # Get app status
    app_status=$(pm2 jlist | jq -r '.[] | select(.name=="therapease") | .pm2_env.status' 2>/dev/null)
    if [ "$app_status" = "online" ]; then
        echo "✅ TherapEase app is online"
    else
        echo "❌ TherapEase app is not online (status: $app_status)"
        echo "🔄 Restarting TherapEase app..."
        pm2 restart therapease
        sleep 3
    fi
else
    echo "❌ TherapEase app not found in PM2"
    echo "🔄 Starting TherapEase app..."
    cd /home/therapease/therapease
    pm2 start ecosystem.config.js
    sleep 3
fi

echo ""
echo "🔍 Step 3: Checking nginx configuration..."

# Test nginx configuration
if command_exists nginx; then
    echo "🧪 Testing nginx configuration..."
    if sudo nginx -t; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors"
        echo "🔧 Please fix nginx configuration first"
        exit 1
    fi
fi

# Restart nginx if needed
if [ $nginx_status -ne 0 ]; then
    restart_service nginx
fi

echo ""
echo "🔍 Step 4: Checking port availability..."

# Check if port 5000 is in use
if command_exists netstat; then
    if netstat -tlnp | grep -q ":5000 "; then
        echo "✅ Port 5000 is in use (server should be running)"
    else
        echo "❌ Port 5000 is not in use"
        echo "🔄 Attempting to start the server..."
        cd /home/therapease/therapease
        pm2 restart therapease
        sleep 5
    fi
elif command_exists ss; then
    if ss -tlnp | grep -q ":5000 "; then
        echo "✅ Port 5000 is in use (server should be running)"
    else
        echo "❌ Port 5000 is not in use"
        echo "🔄 Attempting to start the server..."
        cd /home/therapease/therapease
        pm2 restart therapease
        sleep 5
    fi
fi

echo ""
echo "🔍 Step 5: Testing the endpoint..."

# Test the endpoint locally
echo "🧪 Testing /api/auth/verify endpoint locally..."
if command_exists curl; then
    # Test local endpoint
    local_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/verify 2>/dev/null)
    if [ "$local_response" = "400" ] || [ "$local_response" = "401" ]; then
        echo "✅ Local endpoint is responding (status: $local_response)"
    elif [ "$local_response" = "404" ]; then
        echo "❌ Local endpoint returns 404 - route not found"
    else
        echo "⚠️  Local endpoint response: $local_response"
    fi
    
    # Test through nginx
    echo "🧪 Testing through nginx..."
    nginx_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/verify 2>/dev/null)
    if [ "$nginx_response" = "400" ] || [ "$nginx_response" = "401" ]; then
        echo "✅ Nginx proxy is working (status: $nginx_response)"
    elif [ "$nginx_response" = "404" ]; then
        echo "❌ Nginx proxy returns 404"
    else
        echo "⚠️  Nginx proxy response: $nginx_response"
    fi
else
    echo "⚠️  curl not available for testing"
fi

echo ""
echo "🔍 Step 6: Checking logs for errors..."

# Check PM2 logs
echo "📋 Recent PM2 logs:"
pm2 logs therapease --lines 10 --nostream

echo ""
echo "📋 Recent nginx error logs:"
if [ -f "/var/log/nginx/error.log" ]; then
    sudo tail -10 /var/log/nginx/error.log
else
    echo "⚠️  Nginx error log not found"
fi

echo ""
echo "🏁 Fix script completed!"
echo ""
echo "📋 Next steps if the issue persists:"
echo "1. Check the diagnostic script: node diagnose-auth-verify.js"
echo "2. Verify the server is running: pm2 status"
echo "3. Check nginx configuration: sudo nginx -t"
echo "4. Review server logs: pm2 logs therapease"
echo "5. Check if the route is properly registered in the server"
echo ""
echo "🔧 Manual fixes to try:"
echo "1. Restart PM2: pm2 restart all"
echo "2. Reload nginx: sudo systemctl reload nginx"
echo "3. Check firewall: sudo ufw status"
echo "4. Verify domain DNS settings"
