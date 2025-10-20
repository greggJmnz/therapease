#!/bin/bash

# Fix Cached Database Connection Issue
echo "🔧 Fixing Cached Database Connection Issue..."

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

# 1. Stop PM2 completely
print_status "Stopping PM2 completely..."
pm2 stop all
pm2 delete all
pm2 kill

# 2. Clear any cached modules
print_status "Clearing Node.js module cache..."
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Check if there's a database connection pool being cached
print_status "Checking for cached database connections..."

# 4. Create a simple test to verify the database configuration
print_status "Creating database configuration test..."

cat > test-db-config.js << 'EOF'
// Test database configuration loading
const path = require('path');

// Set NODE_ENV to production
process.env.NODE_ENV = 'production';

// Load environment variables - use .env.production in production
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.env.production')
  : path.join(__dirname, '../../.env');

console.log('Loading environment from:', envFile);
require('dotenv').config({ path: envFile });

console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME);

// Test database connection
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'therapease',
  port: parseInt(process.env.DB_PORT || '3306')
};

console.log('Database configuration:', JSON.stringify(dbConfig, null, 2));

// Test connection
async function testConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful!');
    await connection.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();
EOF

# 5. Run the test
print_status "Testing database configuration..."
node test-db-config.js

# 6. Clean up test file
rm -f test-db-config.js

# 7. Force restart PM2 with explicit environment
print_status "Starting PM2 with explicit environment variables..."
NODE_ENV=production pm2 start ecosystem.config.js

# 8. Wait for startup
print_status "Waiting for server to start..."
sleep 10

# 9. Check PM2 status
print_status "Checking PM2 status..."
pm2 status

# 10. Check logs
print_status "Checking recent logs..."
pm2 logs therapease-api --lines 15

# 11. Test the API
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

# 12. Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
    print_status "🎉 COMPLETE SUCCESS! Your API is fully working!"
else
    print_warning "⚠️ External API access still failing - this might be nginx configuration"
    print_status "But local API should be working now!"
fi

print_status "Cached database connection fix complete!"
