#!/bin/bash

echo "🔌 Fixing WebSocket Connection Issues..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Check current Nginx configuration
echo "[INFO] Checking current Nginx configuration..."
if [ -f "/etc/nginx/sites-available/therapease" ]; then
    echo "[INFO] Current Nginx config found"
    grep -A 10 -B 5 "location /ws" /etc/nginx/sites-available/therapease || echo "[WARNING] No WebSocket configuration found in Nginx"
else
    echo "[ERROR] Nginx configuration not found!"
    exit 1
fi

# 2. Update Nginx configuration to properly handle WebSocket upgrades
echo "[INFO] Updating Nginx configuration for WebSocket support..."

# Create a backup of the current config
cp /etc/nginx/sites-available/therapease /etc/nginx/sites-available/therapease.backup.$(date +%Y%m%d_%H%M%S)

# Update the Nginx configuration
cat > /etc/nginx/sites-available/therapease << 'EOF'
# TherapEase Nginx Configuration
server {
    listen 80;
    server_name therapease.site www.therapease.site api.therapease.site;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name therapease.site www.therapease.site;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/therapease.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/therapease.site/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Serve React app
    root /var/www/therapease;
    index index.html;
    
    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
        
        # Security headers for static files
        add_header Cache-Control "public, max-age=31536000";
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
    }
    
    # Static assets with long cache
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 443 ssl http2;
    server_name api.therapease.site;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/therapease.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/therapease.site/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://www.therapease.site" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-Data-Protection, X-Content-Encryption" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Expose-Headers "X-Data-Protection, X-Content-Encryption" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://www.therapease.site";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, X-Data-Protection, X-Content-Encryption";
            add_header Access-Control-Allow-Credentials "true";
            add_header Access-Control-Max-Age 86400;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 3. Test Nginx configuration
echo "[INFO] Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# 4. Reload Nginx
echo "[INFO] Reloading Nginx..."
systemctl reload nginx

# 5. Check if API server is running
echo "[INFO] Checking API server status..."
if /usr/local/bin/pm2 list | grep -q "therapease-api.*online"; then
    echo "✅ API server is running"
else
    echo "❌ API server is not running, starting it..."
    /usr/local/bin/pm2 restart therapease-api
    sleep 5
fi

# 6. Test WebSocket connection
echo "[INFO] Testing WebSocket connection..."

# Test HTTP WebSocket upgrade
echo "[INFO] Testing WebSocket upgrade on HTTP..."
WS_HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" http://localhost:5000/ws)
echo "HTTP WebSocket response: $WS_HTTP_RESPONSE"

# Test HTTPS WebSocket upgrade
echo "[INFO] Testing WebSocket upgrade on HTTPS..."
WS_HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" https://api.therapease.site/ws)
echo "HTTPS WebSocket response: $WS_HTTPS_RESPONSE"

# 7. Check PM2 logs for WebSocket activity
echo "[INFO] Checking PM2 logs for WebSocket activity..."
/usr/local/bin/pm2 logs therapease-api --lines 10 | grep -i websocket || echo "No WebSocket activity in logs"

# 8. Test API endpoints
echo "[INFO] Testing API endpoints..."

# Test maintenance status
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "Maintenance status response: $MAINTENANCE_RESPONSE"

# Test admin endpoints
ADMIN_THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/admin/therapists)
echo "Admin therapists response: $ADMIN_THERAPISTS_RESPONSE"

ADMIN_PATIENTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/admin/patients)
echo "Admin patients response: $ADMIN_PATIENTS_RESPONSE"

echo "[INFO] WebSocket connection fix complete!"
echo "[INFO] The WebSocket should now work properly with wss://api.therapease.site/ws"
echo "[INFO] Check the browser console to see if the WebSocket connection is successful"
