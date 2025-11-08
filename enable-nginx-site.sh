#!/bin/bash
# Script to enable the Nginx site configuration

echo "🔧 Enabling Nginx site configuration..."
echo ""

# Check if symlink already exists
if [ -L /etc/nginx/sites-enabled/therapease ]; then
    echo "✅ Symlink already exists"
    echo "   Points to: $(readlink -f /etc/nginx/sites-enabled/therapease)"
else
    echo "📋 Creating symlink..."
    sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/therapease
    if [ $? -eq 0 ]; then
        echo "   ✅ Symlink created successfully"
    else
        echo "   ❌ Failed to create symlink"
        exit 1
    fi
fi

echo ""
echo "📋 Verifying symlink..."
if [ -L /etc/nginx/sites-enabled/therapease ]; then
    echo "   ✅ Symlink exists: /etc/nginx/sites-enabled/therapease"
    echo "   Points to: $(readlink -f /etc/nginx/sites-enabled/therapease)"
else
    echo "   ❌ Symlink does NOT exist!"
    exit 1
fi

echo ""
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo ""
    echo "✅ Nginx configuration is valid"
    echo ""
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo "   ✅ Nginx reloaded successfully"
    else
        echo "   ❌ Failed to reload Nginx"
        exit 1
    fi
else
    echo ""
    echo "❌ Nginx configuration has errors!"
    echo "   Please fix the errors before reloading"
    exit 1
fi

echo ""
echo "✅ Site configuration enabled and Nginx reloaded!"
echo ""
echo "📋 Verifying location /uploads/ is now in running config..."
if sudo nginx -T 2>/dev/null | grep -A 10 "location.*uploads" | grep -q "proxy_pass"; then
    echo "   ✅ Location /uploads/ found with proxy_pass"
else
    echo "   ⚠️  Location /uploads/ still not found - check config file"
fi

echo ""
echo "📋 Verifying client_max_body_size is set..."
if sudo nginx -T 2>/dev/null | grep -B 5 -A 5 "server_name api.therapease.site" | grep -q "client_max_body_size 100M"; then
    echo "   ✅ client_max_body_size 100M is set"
else
    echo "   ⚠️  client_max_body_size not found - check config file"
fi

echo ""

