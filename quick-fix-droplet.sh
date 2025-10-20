#!/bin/bash

# Quick Fix for Droplet Issues
echo "🔧 Quick Fix for Droplet Issues..."

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

# 1. Fix PM2 configuration (change from cluster to fork mode)
print_status "Fixing PM2 configuration..."
cd /home/therapease/therapease/server

# Update ecosystem.config.js to use fork mode
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'therapease-api',
    script: 'index.js',
    cwd: '/home/therapease/therapease/server',
    instances: 1,
    exec_mode: 'fork',  // Changed from cluster to fork
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      HOST: '0.0.0.0'  // Ensure it binds to all interfaces
    },
    error_file: '/home/therapease/logs/therapease-api-error.log',
    out_file: '/home/therapease/logs/therapease-api-out.log',
    log_file: '/home/therapease/logs/therapease-api-combined.log',
    time: true
  }]
};
EOF

# 2. Stop and restart PM2 with new configuration
print_status "Restarting PM2 with new configuration..."
pm2 stop therapease-api
pm2 delete therapease-api
pm2 start ecosystem.config.js

# 3. Check if server is running
print_status "Checking server status..."
sleep 3
pm2 status

# 4. Test local connectivity
print_status "Testing local connectivity..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ Backend is accessible on localhost:5000"
else
    print_error "❌ Backend is still not accessible on localhost:5000"
    
    # Check what's listening on port 5000
    print_status "Checking what's listening on port 5000..."
    lsof -i :5000 || netstat -tlnp | grep :5000 || ss -tlnp | grep :5000
    
    # Check PM2 logs
    print_status "Checking PM2 logs..."
    pm2 logs therapease-api --lines 20
fi

# 5. Enable nginx site
print_status "Enabling nginx site..."
if [ -f "/etc/nginx/sites-available/therapease" ]; then
    sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
    print_status "✅ Nginx site enabled"
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_status "✅ Nginx configuration is valid"
        sudo systemctl reload nginx
        print_status "✅ Nginx reloaded"
    else
        print_error "❌ Nginx configuration has errors"
    fi
else
    print_error "❌ Nginx configuration file not found at /etc/nginx/sites-available/therapease"
fi

# 6. Test external access
print_status "Testing external API access..."
sleep 2
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
else
    print_warning "⚠️ External API access still failing - checking nginx logs..."
    sudo tail -n 20 /var/log/nginx/error.log
fi

print_status "Quick fix complete!"
print_status "Check the results above to see if issues are resolved."
