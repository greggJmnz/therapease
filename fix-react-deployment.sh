#!/bin/bash

echo "🔧 Fixing React Deployment Issues..."

# Check what's in the server public directory
echo "📁 Checking server public directory..."
ls -la /home/therapease/therapease/server/public/

# Check permissions
echo "🔍 Checking permissions..."
ls -la /home/therapease/therapease/server/public/static/

# Fix permissions on the entire public directory
echo "🔧 Fixing permissions..."
sudo chown -R therapease:therapease /home/therapease/therapease/server/public/
sudo chmod -R 755 /home/therapease/therapease/server/public/

# Check if index.html exists
echo "📄 Checking for index.html..."
ls -la /home/therapease/therapease/server/public/index.html

# Create a proper Nginx configuration
echo "⚙️ Creating proper Nginx configuration..."
sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - React App
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # Root directory for React app
    root /home/therapease/therapease/server/public;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # API routes - keep the /api prefix
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files (React app assets)
    location /static/ {
        alias /home/therapease/therapease/server/public/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Error pages
    error_page 404 /index.html;
}
EOF

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    
    # Wait a moment
    sleep 2
    
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
    echo "Checking if React app loads:"
    curl -s http://therapease.site/ | grep -i "react\|root" | head -3
    
    echo ""
    echo "📊 Nginx error logs:"
    sudo tail -5 /var/log/nginx/error.log
    
    echo ""
    echo "✅ React deployment fix complete!"
    
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi
