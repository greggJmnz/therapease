#!/bin/bash

echo "🔧 Complete Permissions Fix..."

# Stop Nginx
echo "🛑 Stopping Nginx..."
sudo systemctl stop nginx

# Fix the entire path permissions
echo "🔧 Fixing entire path permissions..."
sudo chmod 755 /home/
sudo chmod 755 /home/therapease/
sudo chmod 755 /home/therapease/therapease/
sudo chmod 755 /home/therapease/therapease/server/
sudo chmod 755 /home/therapease/therapease/server/public/

# Set ownership and permissions for the public directory
sudo chown -R www-data:www-data /home/therapease/therapease/server/public/
sudo chmod -R 755 /home/therapease/therapease/server/public/

# Check the permissions
echo "🔍 Checking permissions..."
ls -la /home/therapease/therapease/server/public/
ls -la /home/therapease/therapease/server/public/index.html

# Test if nginx can access the file
echo "🧪 Testing nginx access..."
sudo -u www-data test -r /home/therapease/therapease/server/public/index.html && echo "✅ Nginx can read index.html" || echo "❌ Nginx cannot read index.html"

# Create a completely different approach - move files to a more accessible location
echo "📁 Moving files to /var/www/therapease..."
sudo mkdir -p /var/www/therapease
sudo cp -r /home/therapease/therapease/server/public/* /var/www/therapease/
sudo chown -R www-data:www-data /var/www/therapease/
sudo chmod -R 755 /var/www/therapease/

# Update Nginx configuration to use the new location
echo "⚙️ Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - Using /var/www
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
    echo "✅ Complete permissions fix done!"
    
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi
