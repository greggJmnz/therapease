#!/bin/bash

echo "🔒 Setting up HTTPS with Let's Encrypt SSL Certificate..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update

# Install Certbot and Nginx plugin
echo "🔧 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Check if Nginx is running
echo "🌐 Checking Nginx status..."
sudo systemctl status nginx --no-pager

# Stop Nginx temporarily for certificate generation
echo "🛑 Stopping Nginx for certificate generation..."
sudo systemctl stop nginx

# Generate SSL certificate
echo "🔐 Generating SSL certificate for therapease.site and www.therapease.site..."
sudo certbot certonly --standalone -d therapease.site -d www.therapease.site -d api.therapease.site --non-interactive --agree-tos --email admin@therapease.site

# Check if certificate was generated
if [ -f "/etc/letsencrypt/live/therapease.site/fullchain.pem" ]; then
    echo "✅ SSL certificate generated successfully!"
    
    # Create HTTPS Nginx configuration
    echo "⚙️ Creating HTTPS Nginx configuration..."
    sudo tee /etc/nginx/sites-available/therapease > /dev/null << 'EOF'
# TherapEase Configuration - HTTPS
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/therapease.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/therapease.site/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
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
        echo "🚀 Starting Nginx with HTTPS..."
        sudo systemctl start nginx
        sudo systemctl enable nginx
        
        # Wait for Nginx to start
        sleep 3
        
        # Test HTTPS
        echo "🧪 Testing HTTPS deployment..."
        echo "HTTPS Main site:"
        curl -s -I https://therapease.site/
        
        echo ""
        echo "HTTPS www site:"
        curl -s -I https://www.therapease.site/
        
        echo ""
        echo "HTTPS API:"
        curl -s https://therapease.site/api/maintenance-status
        
        echo ""
        echo "HTTPS Static assets:"
        curl -s -I https://therapease.site/static/css/main.f22b40a2.css
        
        echo ""
        echo "HTTP to HTTPS redirect test:"
        curl -s -I http://therapease.site/
        
        # Set up automatic certificate renewal
        echo "🔄 Setting up automatic certificate renewal..."
        sudo crontab -l 2>/dev/null | grep -v certbot > /tmp/crontab_backup || true
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo tee -a /tmp/crontab_backup
        sudo crontab /tmp/crontab_backup
        
        echo ""
        echo "✅ HTTPS setup complete!"
        echo "🔒 Your site is now accessible at: https://therapease.site"
        echo "🔄 SSL certificate will auto-renew every 12 hours"
        
    else
        echo "❌ Nginx configuration is invalid"
        exit 1
    fi
    
else
    echo "❌ SSL certificate generation failed"
    echo "🔄 Starting Nginx without HTTPS..."
    sudo systemctl start nginx
    exit 1
fi
