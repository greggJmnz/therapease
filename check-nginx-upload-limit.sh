#!/bin/bash
# Script to check and fix Nginx upload size limit

echo "🔍 Checking Nginx upload size limits..."
echo ""

# Check main nginx.conf
echo "📋 Main nginx.conf (/etc/nginx/nginx.conf):"
if grep -q "client_max_body_size" /etc/nginx/nginx.conf 2>/dev/null; then
    echo "   Found client_max_body_size in main nginx.conf:"
    grep "client_max_body_size" /etc/nginx/nginx.conf | sed 's/^/   /'
    echo ""
    echo "   ⚠️  WARNING: If this is less than 100M, it will override site-specific settings!"
    echo "   💡 To fix, edit /etc/nginx/nginx.conf and set: client_max_body_size 100M;"
else
    echo "   ✅ No client_max_body_size found in main nginx.conf (good - site config will apply)"
fi
echo ""

# Check site-specific config
echo "📋 Site-specific config (/etc/nginx/sites-available/therapease):"
if [ -f /etc/nginx/sites-available/therapease ]; then
    if grep -q "client_max_body_size" /etc/nginx/sites-available/therapease; then
        echo "   Found client_max_body_size in site config:"
        grep "client_max_body_size" /etc/nginx/sites-available/therapease | sed 's/^/   /'
        echo ""
        # Check if it's 100M
        if grep -q "client_max_body_size 100M" /etc/nginx/sites-available/therapease; then
            echo "   ✅ Upload limit is correctly set to 100M"
        else
            echo "   ⚠️  Upload limit is NOT set to 100M - needs to be updated!"
        fi
    else
        echo "   ❌ No client_max_body_size found in site config!"
        echo "   💡 Add: client_max_body_size 100M; to the server block"
    fi
else
    echo "   ❌ Site config file not found!"
fi
echo ""

# Check if Nginx config is valid
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Nginx configuration is valid"
else
    echo "   ❌ Nginx configuration has errors:"
    sudo nginx -t 2>&1 | sed 's/^/   /'
fi
echo ""

# Check current running config
echo "📊 Current running Nginx config (for api.therapease.site):"
if sudo nginx -T 2>/dev/null | grep -A 10 "server_name api.therapease.site" | grep "client_max_body_size" | head -1; then
    echo "   ✅ Found client_max_body_size in running config"
    echo ""
    echo "   Current value:"
    sudo nginx -T 2>/dev/null | grep -A 10 "server_name api.therapease.site" | grep "client_max_body_size" | head -1 | sed 's/^/   /'
else
    echo "   ⚠️  client_max_body_size not found in running config for api.therapease.site"
    echo "   💡 This means the default (1M) is being used!"
fi
echo ""

echo "💡 To apply changes:"
echo "   1. Edit /etc/nginx/sites-available/therapease if needed"
echo "   2. Run: sudo nginx -t  (to test)"
echo "   3. Run: sudo systemctl reload nginx  (to reload)"
echo ""

