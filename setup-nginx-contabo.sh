#!/bin/bash
# Quick script to setup nginx configuration on Contabo

set -e

echo "🌐 Setting up Nginx configuration for TherapEase on Contabo..."
echo ""

# Check if nginx-contabo.conf exists
if [ ! -f "nginx-contabo.conf" ]; then
    echo "❌ Error: nginx-contabo.conf not found in current directory"
    echo "   Please run this script from the repository root"
    exit 1
fi

# Copy nginx configuration
echo "📋 Copying nginx configuration..."
sudo cp nginx-contabo.conf /etc/nginx/sites-available/therapease

# Create symlink
echo "🔗 Creating symlink..."
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Remove default site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️  Removing default nginx site..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Add rate limiting to nginx.conf if not present
if ! grep -q "limit_req_zone.*zone=api" /etc/nginx/nginx.conf; then
    echo "📝 Adding rate limiting to nginx.conf..."
    # Create backup
    sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    # Add rate limiting zones
    sudo sed -i '/http {/a\    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;\n    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;' /etc/nginx/nginx.conf
    echo "✅ Rate limiting added to nginx.conf"
fi

# Test configuration
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed"
    echo "   Please check the error messages above"
    exit 1
fi

echo ""
echo "✅ Nginx setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update DNS records to point to Contabo IP (62.72.47.195)"
echo "   2. Run: sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site"
echo "   3. Test the application"

