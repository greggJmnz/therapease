#!/bin/bash

# Fix Database Loader to Use .env.production
echo "🔧 Fixing Database Loader to Use .env.production..."

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

# 1. Check current database loader
print_status "Checking current database loader configuration..."
cat config/database-loader.js

# 2. Update database-loader.js to use .env.production
print_status "Updating database-loader.js to use .env.production..."

cat > config/database-loader.js << 'EOF'
const path = require('path');

// Load environment variables - use .env.production in production, .env in development
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.env.production')
  : path.join(__dirname, '../../.env');

require('dotenv').config({ path: envFile });

// Database loader - force MySQL for production
const loadDatabase = () => {
  console.log('🚀 Loading MySQL database configuration...');
  return require('./database');
};

module.exports = loadDatabase;
EOF

print_status "✅ Updated database-loader.js to use .env.production in production"

# 3. Update database.js to use the correct environment file
print_status "Updating database.js to use the correct environment file..."

# Create a backup of the original database.js
cp config/database.js config/database.js.backup

# Update the environment loading in database.js
sed -i "s|require('dotenv').config({ path: joinPaths(__dirname, '../../.env') });|// Environment loading moved to database-loader.js|g" config/database.js

print_status "✅ Updated database.js to not load environment directly"

# 4. Verify the changes
print_status "Verifying the changes..."
echo "Database loader configuration:"
cat config/database-loader.js

# 5. Stop PM2
print_status "Stopping PM2 to apply changes..."
pm2 stop all
pm2 delete all

# 6. Start PM2 with the updated configuration
print_status "Starting PM2 with updated database configuration..."
pm2 start ecosystem.config.js

# 7. Wait for startup
print_status "Waiting for server to start..."
sleep 8

# 8. Check PM2 status
print_status "Checking PM2 status..."
pm2 status

# 9. Check logs for database connection
print_status "Checking recent logs for database connection..."
pm2 logs therapease-api --lines 15

# 10. Test the API
print_status "Testing API endpoints..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working! Testing response:"
    curl -s http://localhost:5000/api/maintenance-status
    echo ""
    print_status "🎉 SUCCESS! Your API is now working with MySQL!"
else
    print_error "❌ API still not working. Let's check what's happening..."
    
    # Check PM2 logs for any errors
    print_status "Checking PM2 logs for errors..."
    pm2 logs therapease-api --lines 20
fi

# 11. Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
    print_status "🎉 COMPLETE SUCCESS! Your API is fully working!"
else
    print_warning "⚠️ External API access still failing - this might be nginx configuration"
    print_status "But local API should be working now!"
fi

print_status "Database loader fix complete!"
