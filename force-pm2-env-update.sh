#!/bin/bash

# Force PM2 Environment Update
echo "🔧 Force PM2 Environment Update..."

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

cd /home/therapease/therapease/server

# 1. Check current .env.production
print_status "Checking current .env.production configuration..."
echo "Current database configuration:"
grep -E "^(DB_|NODE_ENV)" .env.production

# 2. Stop PM2 completely
print_status "Stopping PM2 completely..."
pm2 stop all
pm2 delete all

# 3. Clear PM2 cache
print_status "Clearing PM2 cache..."
pm2 kill
sleep 2

# 4. Verify therapease_user connection
print_status "Verifying therapease_user database connection..."
if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ therapease_user connection is working"
else
    print_error "❌ therapease_user connection failed"
    print_status "Recreating therapease_user..."
    
    # Recreate user with sudo access
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

# 5. Start PM2 with explicit environment update
print_status "Starting PM2 with explicit environment update..."
pm2 start ecosystem.config.js --update-env

# 6. Wait for startup
print_status "Waiting for server to start..."
sleep 10

# 7. Check PM2 status
print_status "Checking PM2 status..."
pm2 status

# 8. Check logs for database connection
print_status "Checking recent logs for database connection..."
pm2 logs therapease-api --lines 15

# 9. Test the API
print_status "Testing API endpoints..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working! Testing response:"
    curl -s http://localhost:5000/api/maintenance-status
    echo ""
    print_status "🎉 SUCCESS! Your API is now working with MySQL!"
else
    print_error "❌ API still not working. Let's check what's happening..."
    
    # Check if server is listening on port 5000
    print_status "Checking what's listening on port 5000..."
    lsof -i :5000 || ss -tlnp | grep :5000 || netstat -tlnp | grep :5000
    
    # Check PM2 logs for any errors
    print_status "Checking PM2 logs for errors..."
    pm2 logs therapease-api --lines 20
fi

# 10. Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
    print_status "🎉 COMPLETE SUCCESS! Your API is fully working!"
else
    print_warning "⚠️ External API access still failing - this might be nginx configuration"
    print_status "But local API should be working now!"
fi

print_status "PM2 environment update complete!"
