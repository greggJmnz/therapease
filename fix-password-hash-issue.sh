#!/bin/bash

echo "🔧 Fixing Password Hash Issue - Environment Variable Problem..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Check current .env.production password
echo "[INFO] Checking current password in .env.production..."
grep "DB_PASSWORD" .env.production

# 3. Fix the password in .env.production (escape the # character)
echo "[INFO] Fixing password in .env.production..."
sed -i 's/DB_PASSWORD=TherapEase2025!@#/DB_PASSWORD="TherapEase2025!@#"/' .env.production

# 4. Verify the fix
echo "[INFO] Verifying password fix..."
grep "DB_PASSWORD" .env.production

# 5. Test the environment variable loading
echo "[INFO] Testing environment variable loading..."
node -e "
require('dotenv').config({ path: '.env.production' });
console.log('DB_PASSWORD loaded:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('DB_PASSWORD ends with #:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.endsWith('#') : false);
"

# 6. Test database connection with the fixed password
echo "[INFO] Testing database connection with fixed password..."
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'therapease_user',
  password: process.env.DB_PASSWORD || 'TherapEase2025!@#',
  database: process.env.DB_NAME || 'therapease_db'
};

console.log('🔍 Testing database config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password ? 'Present (' + dbConfig.password.length + ' chars)' : 'Missing',
  database: dbConfig.database
});

mysql.createConnection(dbConfig)
  .then(connection => {
    console.log('✅ Database connection successful');
    return connection.execute('SELECT 1 as test');
  })
  .then(([rows]) => {
    console.log('✅ Database query successful:', rows);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  });
"

# 7. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 8. Test API endpoints
echo "[INFO] Testing API endpoints..."

echo "[TEST] Testing maintenance status:"
MAINTENANCE_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" https://therapease.site/api/maintenance-status)
echo "$MAINTENANCE_RESPONSE"

echo "[TEST] Testing login endpoint:"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "$LOGIN_RESPONSE" | head -c 300

# 9. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Password hash fix complete!"
