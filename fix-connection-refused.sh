#!/bin/bash

echo "🔧 Fixing Connection Refused Issues..."

# Stop all services first
echo "🛑 Stopping all services..."
pm2 stop all
sudo systemctl stop nginx

# Kill any processes that might be holding ports
echo "🧹 Cleaning up port conflicts..."
sudo pkill -f "node.*5000" || true
sudo pkill -f "node.*8080" || true
sudo pkill -f "nginx" || true

# Wait a moment
sleep 2

# Check what's still running
echo "🔍 Checking for remaining processes..."
sudo lsof -i :80 || echo "Port 80 is free"
sudo lsof -i :5000 || echo "Port 5000 is free"
sudo lsof -i :8080 || echo "Port 8080 is free"

# Create a simple Nginx configuration
echo "⚙️ Creating simple Nginx configuration..."
sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# Simple TherapEase Configuration
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:5000/;
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
    
    # Main site
    location / {
        proxy_pass http://localhost:8080;
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

# Enable the site
echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Start Nginx
    echo "🚀 Starting Nginx..."
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Check Nginx status
    echo "📊 Nginx status:"
    sudo systemctl status nginx --no-pager
    
    # Start PM2 processes
    echo "🚀 Starting PM2 processes..."
    pm2 start ecosystem.config.js
    
    # Wait for services to start
    echo "⏳ Waiting for services to start..."
    sleep 5
    
    # Check PM2 status
    echo "📊 PM2 status:"
    pm2 status
    
    # Test local connectivity
    echo "🧪 Testing local connectivity..."
    echo "API test:"
    curl -s http://localhost:5000/api/maintenance-status || echo "API not responding"
    
    echo "Public site test:"
    curl -s -I http://localhost:8080 || echo "Public site not responding"
    
    # Test external connectivity
    echo "🌍 Testing external connectivity..."
    echo "HTTP API test:"
    curl -s http://therapease.site/api/maintenance-status || echo "External API not responding"
    
    echo "HTTP site test:"
    curl -s -I http://therapease.site || echo "External site not responding"
    
    # Check what's listening
    echo "🔌 Final port status:"
    sudo lsof -i :80 || echo "Nothing on port 80"
    sudo lsof -i :5000 || echo "Nothing on port 5000"
    sudo lsof -i :8080 || echo "Nothing on port 8080"
    
else
    echo "❌ Nginx configuration is invalid"
    exit 1
fi

echo "✅ Connection fix complete!"
