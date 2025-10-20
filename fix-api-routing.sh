#!/bin/bash

echo "🔧 Fixing API Routing Issue..."

# Stop services
echo "🛑 Stopping services..."
pm2 stop all
sudo systemctl stop nginx

# Create corrected Nginx configuration with proper API routing
echo "⚙️ Creating corrected Nginx configuration..."
sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - Fixed API Routing
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
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
    
    # Main site - everything else goes to public website
    location / {
        proxy_pass http://127.0.0.1:8080;
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
}
EOF

# Test configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Start Nginx
    echo "🚀 Starting Nginx..."
    sudo systemctl start nginx
    
    # Start PM2
    echo "🚀 Starting PM2..."
    pm2 start ecosystem.config.js
    
    # Wait for services
    sleep 3
    
    # Test everything
    echo "🧪 Testing local API:"
    curl -s http://localhost:5000/api/maintenance-status
    
    echo ""
    echo "🧪 Testing through Nginx (API):"
    curl -s http://localhost/api/maintenance-status
    
    echo ""
    echo "🧪 Testing through Nginx (main site):"
    curl -s -I http://localhost/
    
    echo ""
    echo "🧪 Testing external API:"
    curl -s http://therapease.site/api/maintenance-status
    
    echo ""
    echo "🧪 Testing external site:"
    curl -s -I http://therapease.site/
    
    echo ""
    echo "📊 Final status:"
    pm2 status
    
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi

echo "✅ API routing fix complete!"
