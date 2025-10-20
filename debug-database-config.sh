#!/bin/bash

# Debug Database Configuration
echo "🔍 Debugging Database Configuration..."

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

# 1. Check all environment files
print_status "Checking all environment files..."
echo "=== .env.production ==="
cat .env.production | grep -E "^(DB_|NODE_ENV)"

echo ""
echo "=== Root .env ==="
cat ../.env | grep -E "^(DB_|NODE_ENV)" 2>/dev/null || echo "No root .env file"

echo ""
echo "=== .env ==="
cat .env | grep -E "^(DB_|NODE_ENV)" 2>/dev/null || echo "No .env file in server directory"

# 2. Check what environment variables are actually loaded
print_status "Checking what environment variables are actually loaded by Node.js..."

cat > debug-env.js << 'EOF'
// Load environment variables the same way the server does
const path = require('path');

// Load environment variables - use .env.production in production, .env in development
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.env.production')
  : path.join(__dirname, '../../.env');

console.log('Environment file being loaded:', envFile);
console.log('NODE_ENV:', process.env.NODE_ENV);

require('dotenv').config({ path: envFile });

console.log('After loading environment:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
EOF

node debug-env.js

# 3. Check if there are any other database configuration files
print_status "Checking for other database configuration files..."
find . -name "*.js" -exec grep -l "DB_USER\|DB_PASSWORD" {} \; | head -10

# 4. Check the actual database configuration being used
print_status "Checking the actual database configuration being used..."

cat > debug-db-config.js << 'EOF'
// Load environment variables the same way the server does
const path = require('path');

// Load environment variables - use .env.production in production, .env in development
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.env.production')
  : path.join(__dirname, '../../.env');

require('dotenv').config({ path: envFile });

// Import the database configuration
const { getEnvVar } = require('./utils/windowsCompatibility');

const dbConfig = {
  host: getEnvVar('DB_HOST', '127.0.0.1'),
  user: getEnvVar('DB_USER', 'root'),
  password: getEnvVar('DB_PASSWORD', ''),
  database: getEnvVar('DB_NAME', 'therapease'),
  port: parseInt(getEnvVar('DB_PORT', '3306'))
};

console.log('Database configuration being used:');
console.log(JSON.stringify(dbConfig, null, 2));
EOF

node debug-db-config.js

# 5. Test database connection with therapease_user
print_status "Testing database connection with therapease_user..."
if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ therapease_user connection is working"
else
    print_error "❌ therapease_user connection failed"
fi

# 6. Test database connection with root
print_status "Testing database connection with root..."
if mysql -u root -p"TherapEase2025!@#" -e "SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ root connection is working"
else
    print_warning "❌ root connection failed"
fi

# 7. Check if there's a root .env file that might be overriding
print_status "Checking for root .env file that might be overriding..."
if [ -f "../.env" ]; then
    print_warning "Found root .env file that might be overriding .env.production"
    echo "Root .env database config:"
    cat ../.env | grep -E "^(DB_|NODE_ENV)"
    
    print_status "Backing up root .env and creating a clean one..."
    mv ../.env ../.env.backup
    echo "NODE_ENV=production" > ../.env
    print_status "✅ Root .env file backed up and cleaned"
else
    print_status "No root .env file found"
fi

# 8. Clean up debug files
rm -f debug-env.js debug-db-config.js

# 9. Restart PM2
print_status "Restarting PM2 with cleaned environment..."
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js

# 10. Wait and test
print_status "Waiting for server to start..."
sleep 8

# 11. Check logs
print_status "Checking recent logs..."
pm2 logs therapease-api --lines 10

# 12. Test API
print_status "Testing API endpoints..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working! Testing response:"
    curl -s http://localhost:5000/api/maintenance-status
    echo ""
    print_status "🎉 SUCCESS! Your API is now working!"
else
    print_error "❌ API still not working. Final check..."
    pm2 logs therapease-api --lines 5
fi

print_status "Database configuration debug complete!"
