#!/bin/bash

echo "🔧 Fixing Nginx Permissions Issues..."

# Stop Nginx first
echo "🛑 Stopping Nginx..."
sudo systemctl stop nginx

# Fix permissions for Nginx access
echo "🔧 Fixing file permissions..."
sudo chown -R www-data:www-data /home/therapease/therapease/server/public/
sudo chmod -R 755 /home/therapease/therapease/server/public/

# Also fix the parent directory permissions
sudo chmod 755 /home/therapease/therapease/server/
sudo chmod 755 /home/therapease/therapease/

# Check permissions
echo "🔍 Checking permissions after fix..."
ls -la /home/therapease/therapease/server/public/
ls -la /home/therapease/therapease/server/public/index.html

# Create a simpler Nginx configuration that should work
echo "⚙️ Creating simplified Nginx configuration..."
sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - Simplified
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        root /home/therapease/therapease/server/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main site - serve React app
    location / {
        root /home/therapease/therapease/server/public;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
EOF

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Start Nginx
    echo "🚀 Starting Nginx..."
    sudo systemctl start nginx
    
    # Wait a moment
    sleep 3
    
    # Test the deployment
    echo "🧪 Testing deployment..."
    echo "Main site:"
    curl -s -I http://therapease.site/
    
    echo ""
    echo "Static assets:"
    curl -s -I http://therapease.site/static/css/main.f22b40a2.css
    
    echo ""
    echo "API:"
    curl -s http://therapease.site/api/maintenance-status
    
    echo ""
    echo "Checking React app content:"
    curl -s http://therapease.site/ | head -10
    
    echo ""
    echo "📊 Nginx error logs (if any):"
    sudo tail -3 /var/log/nginx/error.log
    
    echo ""
    echo "✅ Permission fix complete!"
    
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi
