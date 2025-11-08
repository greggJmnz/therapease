#!/bin/bash
# Script to debug Nginx configuration

echo "🔍 Debugging Nginx Configuration"
echo "=================================="
echo ""

# Check which config file is being used
echo "📋 Checking which config files are included..."
echo ""
echo "Main nginx.conf includes:"
sudo grep -E "^[^#]*include" /etc/nginx/nginx.conf | grep -v "^#" | sed 's/^/   /'
echo ""

# Check if the site config is actually being included
echo "📋 Checking if therapease site config is enabled..."
if [ -L /etc/nginx/sites-enabled/therapease ]; then
    echo "   ✅ Symlink exists: /etc/nginx/sites-enabled/therapease"
    echo "   Points to: $(readlink -f /etc/nginx/sites-enabled/therapease)"
else
    echo "   ❌ Symlink does NOT exist!"
fi
echo ""

# Check the actual config file
echo "📋 Checking config file contents..."
echo ""
echo "Location blocks in /etc/nginx/sites-available/therapease:"
grep -n "location" /etc/nginx/sites-available/therapease | grep -v "^#" | sed 's/^/   /'
echo ""

# Check for client_max_body_size
echo "📋 Checking client_max_body_size in config file:"
grep -n "client_max_body_size" /etc/nginx/sites-available/therapease | sed 's/^/   /'
echo ""

# Check for root directive
echo "📋 Checking root directive in config file:"
grep -n "root" /etc/nginx/sites-available/therapease | grep -v "^#" | sed 's/^/   /'
echo ""

# Check the actual running config for api.therapease.site
echo "📋 Checking running config for api.therapease.site..."
echo ""
echo "Server block:"
sudo nginx -T 2>/dev/null | grep -B 2 -A 50 "server_name api.therapease.site" | head -60 | sed 's/^/   /'
echo ""

# Check specifically for location /uploads/
echo "📋 Checking for location /uploads/ in running config:"
if sudo nginx -T 2>/dev/null | grep -A 20 "location.*uploads" | grep -q "proxy_pass"; then
    echo "   ✅ Found location /uploads/ with proxy_pass"
    echo ""
    echo "   Full location block:"
    sudo nginx -T 2>/dev/null | grep -B 2 -A 20 "location.*uploads" | head -25 | sed 's/^/   /'
else
    echo "   ❌ Location /uploads/ NOT found or not proxying!"
    echo ""
    echo "   Searching for any location blocks:"
    sudo nginx -T 2>/dev/null | grep -B 2 -A 10 "server_name api.therapease.site" | grep -A 10 "location" | head -30 | sed 's/^/   /'
fi
echo ""

# Check client_max_body_size in running config
echo "📋 Checking client_max_body_size in running config:"
sudo nginx -T 2>/dev/null | grep -B 5 -A 5 "server_name api.therapease.site" | grep "client_max_body_size" | sed 's/^/   /'
echo ""

# Check root in running config
echo "📋 Checking root in running config:"
sudo nginx -T 2>/dev/null | grep -B 5 -A 5 "server_name api.therapease.site" | grep "root" | sed 's/^/   /'
echo ""

echo "💡 If location /uploads/ is missing, the config file might not be correct."
echo "   Check: cat /etc/nginx/sites-available/therapease | grep -A 15 'location.*uploads'"
echo ""

