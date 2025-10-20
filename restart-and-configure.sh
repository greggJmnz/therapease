#!/bin/bash

# Restart and Configure TherapEase Droplet
echo "🚀 Restarting and Configuring TherapEase Droplet..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Step 1: Navigate to project directory
print_header "1. Navigating to project directory..."
cd /home/therapease/therapease
print_status "Current directory: $(pwd)"

# Step 2: Pull latest changes
print_header "2. Pulling latest changes from repository..."
git pull origin main
print_status "✅ Repository updated"

# Step 3: Stop all PM2 processes
print_header "3. Stopping all PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
print_status "✅ PM2 processes stopped"

# Step 4: Check environment files
print_header "4. Checking environment configuration..."
echo "=== .env.production ==="
if [ -f "server/.env.production" ]; then
    cat server/.env.production | grep -E "^(DB_|NODE_ENV|VAPID_)"
else
    print_error "❌ .env.production not found!"
    exit 1
fi

# Step 5: Verify MySQL is running
print_header "5. Checking MySQL status..."
if systemctl is-active --quiet mysql; then
    print_status "✅ MySQL is running"
else
    print_warning "⚠️ MySQL is not running, starting it..."
    sudo systemctl start mysql
    sleep 3
    if systemctl is-active --quiet mysql; then
        print_status "✅ MySQL started successfully"
    else
        print_error "❌ Failed to start MySQL"
        exit 1
    fi
fi

# Step 6: Test database connection
print_header "6. Testing database connection..."
if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ therapease_user database connection working"
else
    print_warning "⚠️ therapease_user connection failed, recreating user..."
    
    # Recreate database user
    sudo mysql -e "
    DROP USER IF EXISTS 'therapease_user'@'localhost';
    CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
    GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
    FLUSH PRIVILEGES;
    "
    
    # Test again
    if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
        print_status "✅ therapease_user recreated and working"
    else
        print_error "❌ Still cannot connect with therapease_user"
        exit 1
    fi
fi

# Step 7: Check Nginx status
print_header "7. Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    print_status "✅ Nginx is running"
else
    print_warning "⚠️ Nginx is not running, starting it..."
    sudo systemctl start nginx
    sleep 2
    if systemctl is-active --quiet nginx; then
        print_status "✅ Nginx started successfully"
    else
        print_error "❌ Failed to start Nginx"
    fi
fi

# Step 8: Enable Nginx site if not enabled
print_header "8. Checking Nginx site configuration..."
if [ ! -L "/etc/nginx/sites-enabled/therapease" ]; then
    print_warning "⚠️ TherapEase site not enabled, enabling it..."
    sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    print_status "✅ TherapEase site enabled"
else
    print_status "✅ TherapEase site already enabled"
fi

# Step 9: Clear any cached files
print_header "9. Clearing cached files..."
rm -rf server/node_modules/.cache 2>/dev/null || true
rm -rf /home/therapease/.pm2/logs/* 2>/dev/null || true
print_status "✅ Cache cleared"

# Step 10: Start PM2 with fresh configuration
print_header "10. Starting PM2 with fresh configuration..."
cd server
NODE_ENV=production pm2 start ecosystem.config.js
print_status "✅ PM2 started"

# Step 11: Wait for server to initialize
print_header "11. Waiting for server to initialize..."
sleep 10

# Step 12: Check PM2 status
print_header "12. Checking PM2 status..."
pm2 status

# Step 13: Check server logs
print_header "13. Checking server logs..."
pm2 logs therapease-api --lines 15

# Step 14: Test local API
print_header "14. Testing local API..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ Local API is working!"
    echo "API Response:"
    curl -s http://localhost:5000/api/maintenance-status
    echo ""
else
    print_error "❌ Local API not working"
    print_status "Checking recent logs for errors..."
    pm2 logs therapease-api --lines 10
fi

# Step 15: Test external API
print_header "15. Testing external API..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API is working!"
    echo "External API Response:"
    curl -s https://api.therapease.site/api/maintenance-status
    echo ""
else
    print_warning "⚠️ External API not working - this might be nginx configuration"
fi

# Step 16: Final status check
print_header "16. Final status check..."
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l

echo ""
echo "=== MySQL Status ==="
sudo systemctl status mysql --no-pager -l

echo ""
echo "=== Port Usage ==="
ss -tlnp | grep -E ":(80|443|5000|3306)" || netstat -tlnp | grep -E ":(80|443|5000|3306)"

# Final summary
echo ""
print_header "🎉 RESTART AND CONFIGURATION COMPLETE!"
echo ""
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ SUCCESS: Your TherapEase API is working!"
    print_status "🌐 Local API: http://localhost:5000/api/maintenance-status"
    if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
        print_status "🌐 External API: https://api.therapease.site/api/maintenance-status"
    fi
    print_status "🎯 Your application is ready to use!"
else
    print_error "❌ ISSUE: API is still not working"
    print_status "Please check the logs above for any errors"
fi

print_status "Restart and configuration complete!"
