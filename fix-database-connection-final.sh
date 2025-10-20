#!/bin/bash

echo "🔧 Final Database Connection Fix - Complete MySQL Setup..."

cd /root/therapease/therapease

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Check current MySQL status
echo "[INFO] Checking MySQL status..."
systemctl status mysql --no-pager -l | head -10

# 3. Test MySQL connection as root
echo "[INFO] Testing MySQL connection as root..."
mysql -u root -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ MySQL root connection successful"
else
    echo "❌ MySQL root connection failed"
    echo "[INFO] Starting MySQL service..."
    systemctl start mysql
    sleep 5
fi

# 4. Check if therapease_user exists
echo "[INFO] Checking if therapease_user exists..."
mysql -u root -e "SELECT User, Host FROM mysql.user WHERE User='therapease_user';" 2>/dev/null

# 5. Create/update therapease_user with correct permissions
echo "[INFO] Creating/updating therapease_user..."
mysql -u root << 'EOF'
-- Drop user if exists
DROP USER IF EXISTS 'therapease_user'@'localhost';
DROP USER IF EXISTS 'therapease_user'@'%';

-- Create user with correct password
CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
CREATE USER 'therapease_user'@'%' IDENTIFIED BY 'TherapEase2025!@#';

-- Grant all privileges on therapease_db
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'%';

-- Grant additional privileges
GRANT CREATE, DROP, ALTER, INDEX, LOCK TABLES ON therapease_db.* TO 'therapease_user'@'localhost';
GRANT CREATE, DROP, ALTER, INDEX, LOCK TABLES ON therapease_db.* TO 'therapease_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show users
SELECT User, Host FROM mysql.user WHERE User='therapease_user';
EOF

# 6. Test connection with therapease_user
echo "[INFO] Testing connection with therapease_user..."
mysql -u therapease_user -p'TherapEase2025!@#' -h localhost -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ therapease_user connection successful"
else
    echo "❌ therapease_user connection failed"
fi

# 7. Test connection with 127.0.0.1
echo "[INFO] Testing connection with 127.0.0.1..."
mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ therapease_user connection with 127.0.0.1 successful"
else
    echo "❌ therapease_user connection with 127.0.0.1 failed"
fi

# 8. Check database exists
echo "[INFO] Checking if therapease_db exists..."
mysql -u root -e "SHOW DATABASES LIKE 'therapease_db';" 2>/dev/null

# 9. Create database if it doesn't exist
echo "[INFO] Creating therapease_db if it doesn't exist..."
mysql -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS therapease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE therapease_db;
SHOW TABLES;
EOF

# 10. Test the database connection from Node.js
echo "[INFO] Testing database connection from Node.js..."
cd server

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

console.log('🔍 Testing database config:', dbConfig);

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

# 11. Update database configuration to be more robust
echo "[INFO] Updating database configuration..."
cat > config/database.js << 'EOF'
const mysql = require('mysql2/promise');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

console.log('🚀 Loading MySQL database configuration from:', require('path').resolve('.env.production'));

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'therapease_user',
  password: process.env.DB_PASSWORD || 'TherapEase2025!@#',
  database: process.env.DB_NAME || 'therapease_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  // Additional connection options
  multipleStatements: true,
  charset: 'utf8mb4'
};

console.log('📊 Database config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

const pool = mysql.createPool(dbConfig);

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

const runQuery = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

const getOne = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  } catch (error) {
    console.error('GetOne error:', error);
    throw error;
  }
};

const getAll = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('GetAll error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  runQuery,
  getOne,
  getAll
};
EOF

# 12. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 13. Test API endpoints
echo "[INFO] Testing API endpoints..."

echo "[TEST] Testing maintenance status:"
MAINTENANCE_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" https://therapease.site/api/maintenance-status)
echo "$MAINTENANCE_RESPONSE"

echo "[TEST] Testing login endpoint:"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "$LOGIN_RESPONSE" | head -c 300

# 14. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Database connection fix complete!"