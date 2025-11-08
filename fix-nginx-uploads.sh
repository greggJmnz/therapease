#!/bin/bash
# Script to fix Nginx uploads configuration

echo "🔍 Checking Nginx configuration for uploads..."
echo ""

# Check if the site config is enabled
if [ ! -L /etc/nginx/sites-enabled/therapease ]; then
    echo "⚠️  Site config is not enabled!"
    echo "   Creating symlink..."
    sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/therapease
fi

# Check for default root in main nginx.conf
echo "📋 Checking for default root in main nginx.conf..."
if grep -q "^[^#]*root" /etc/nginx/nginx.conf 2>/dev/null; then
    echo "   Found root directive in main nginx.conf:"
    grep "^[^#]*root" /etc/nginx/nginx.conf | sed 's/^/   /'
    echo ""
    echo "   ⚠️  This might be causing issues. Consider commenting it out if it's in the http block."
else
    echo "   ✅ No root directive found in main nginx.conf"
fi
echo ""

# Check if location /uploads/ is in the running config
echo "📋 Checking if /uploads/ location block is in running config..."
if sudo nginx -T 2>/dev/null | grep -A 10 "location.*uploads" | grep -q "proxy_pass"; then
    echo "   ✅ /uploads/ location block found with proxy_pass"
    echo ""
    echo "   Location block details:"
    sudo nginx -T 2>/dev/null | grep -A 10 "location.*uploads" | head -15 | sed 's/^/   /'
else
    echo "   ❌ /uploads/ location block NOT found or not proxying!"
    echo ""
    echo "   Checking all location blocks for api.therapease.site:"
    sudo nginx -T 2>/dev/null | grep -B 5 -A 15 "server_name api.therapease.site" | grep -A 15 "location" | head -30 | sed 's/^/   /'
fi
echo ""

# Check client_max_body_size
echo "📋 Checking client_max_body_size for api.therapease.site..."
if sudo nginx -T 2>/dev/null | grep -B 5 -A 5 "server_name api.therapease.site" | grep "client_max_body_size" | head -1; then
    echo "   ✅ Found client_max_body_size"
    echo ""
    echo "   Value:"
    sudo nginx -T 2>/dev/null | grep -B 5 -A 5 "server_name api.therapease.site" | grep "client_max_body_size" | head -1 | sed 's/^/   /'
else
    echo "   ❌ client_max_body_size NOT found for api.therapease.site!"
fi
echo ""

echo "💡 If the location block is missing, try:"
echo "   1. Check if the config file is correct: cat /etc/nginx/sites-available/therapease | grep -A 10 'location.*uploads'"
echo "   2. Test config: sudo nginx -t"
echo "   3. Reload Nginx: sudo systemctl reload nginx"
echo "   4. Check error logs: sudo tail -f /var/log/nginx/error.log"
echo ""

