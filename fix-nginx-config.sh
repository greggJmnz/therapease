#!/bin/bash

# Fix Nginx Configuration for API Subdomain
echo "🔧 Fixing Nginx Configuration..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Check Nginx status
print_status "Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

# 2. Check Nginx error logs
print_status "Checking Nginx error logs..."
sudo journalctl -xeu nginx.service --no-pager -l | tail -20

# 3. Check current Nginx configuration
print_status "Checking current Nginx configuration..."
sudo cat /etc/nginx/sites-available/therapease

# 4. Create a proper Nginx configuration
print_status "Creating proper Nginx configuration..."

sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Nginx Configuration

# Main site (www.therapease.site and therapease.site)
server {
    listen 80;
    listen 443 ssl http2;
    server_name therapease.site www.therapease.site;

    # SSL configuration (if certificates exist)
    ssl_certificate /etc/ssl/certs/therapease.crt;
    ssl_certificate_key /etc/ssl/private/therapease.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Serve static files from React build
    root /home/therapease/therapease/server/public;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets with caching
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# API subdomain (api.therapease.site)
server {
    listen 80;
    listen 443 ssl http2;
    server_name api.therapease.site;

    # SSL configuration (if certificates exist)
    ssl_certificate /etc/ssl/certs/therapease.crt;
    ssl_certificate_key /etc/ssl/private/therapease.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # CORS headers for API
    add_header Access-Control-Allow-Origin "https://www.therapease.site" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://www.therapease.site";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # API routes - proxy to backend
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

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Redirect HTTP to HTTPS for main site
server {
    listen 80;
    server_name therapease.site www.therapease.site;
    return 301 https://$server_name$request_uri;
}

# Redirect HTTP to HTTPS for API
server {
    listen 80;
    server_name api.therapease.site;
    return 301 https://$server_name$request_uri;
}
EOF

# 5. Test Nginx configuration
print_status "Testing Nginx configuration..."
if sudo nginx -t; then
    print_status "✅ Nginx configuration is valid"
else
    print_error "❌ Nginx configuration has errors"
    exit 1
fi

# 6. Restart Nginx
print_status "Restarting Nginx..."
sudo systemctl restart nginx

# 7. Check Nginx status
print_status "Checking Nginx status after restart..."
sudo systemctl status nginx --no-pager -l

# 8. Test API endpoints
print_status "Testing API endpoints..."

echo "Testing HTTP API:"
curl -s http://api.therapease.site/api/maintenance-status || echo "HTTP API failed"

echo ""
echo "Testing HTTPS API:"
curl -s https://api.therapease.site/api/maintenance-status || echo "HTTPS API failed"

echo ""
echo "Testing main site:"
curl -s https://www.therapease.site/ | head -5 || echo "Main site failed"

print_status "Nginx configuration fix complete!"
