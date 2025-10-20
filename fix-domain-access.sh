#!/bin/bash

echo "🔧 Fixing Domain Access Issues..."

# Check current Nginx configuration
echo "📋 Current Nginx configuration:"
sudo cat /etc/nginx/sites-available/therapease

# Create a simple, working Nginx configuration
echo "⚙️ Creating simple Nginx configuration..."
sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - Simple HTTP
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
        root /var/www/therapease;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main site - serve React app
    location / {
        root /var/www/therapease;
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
    
    # Restart Nginx
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    
    # Wait for Nginx to start
    sleep 3
    
    # Test all endpoints
    echo "🧪 Testing all endpoints..."
    echo "1. HTTP therapease.site:"
    curl -s -I http://therapease.site/ | head -3
    
    echo ""
    echo "2. HTTP www.therapease.site:"
    curl -s -I http://www.therapease.site/ | head -3
    
    echo ""
    echo "3. HTTP api.therapease.site:"
    curl -s -I http://api.therapease.site/ | head -3
    
    echo ""
    echo "4. API endpoint:"
    curl -s http://therapease.site/api/maintenance-status
    
    echo ""
    echo "5. Static assets:"
    curl -s -I http://therapease.site/static/css/main.f22b40a2.css | head -3
    
    # Check if services are running
    echo ""
    echo "📊 Service status:"
    pm2 status
    
    echo ""
    echo "🌐 Nginx status:"
    sudo systemctl status nginx --no-pager | head -10
    
    # Test from different perspectives
    echo ""
    echo "🌍 Testing from server perspective:"
    echo "Direct IP test:"
    curl -s -I http://167.71.199.133/ | head -3
    
    echo ""
    echo "Host header test:"
    curl -s -I -H "Host: therapease.site" http://167.71.199.133/ | head -3
    
    echo ""
    echo "✅ Domain access fix complete!"
    echo "🌐 Try accessing: http://therapease.site"
    echo "🌐 Try accessing: http://www.therapease.site"
    
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi
