#!/bin/bash

echo "🔧 Fixing Database Connection - Final Fix..."

cd /root/therapease/therapease

# Stop PM2 processes
/usr/bin/pm2 stop all 2>/dev/null || true
/usr/bin/pm2 delete all 2>/dev/null || true

cd server

# Check current .env.production
echo "[INFO] Current .env.production contents:"
cat .env.production | grep -E "(DB_|JWT_)"

# Fix database configuration to force correct credentials
echo "[INFO] Fixing database configuration..."
cat > config/database.js << 'EOF'
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

console.log('🚀 Loading MySQL database configuration from:', require('path').resolve('.env.production'));

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'therapease_user',
  password: process.env.DB_PASSWORD || 'TherapEase2025!@#',
  database: process.env.DB_NAME || 'therapease_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
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

# Create proper ecosystem config
echo "[INFO] Creating ecosystem config..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './index.js',
      cwd: '/root/therapease/therapease/server',
      instances: 1,
      exec_mode: 'fork',
      env_file: '.env.production',
      error_file: '/root/therapease/logs/therapease-api-error.log',
      out_file: '/root/therapease/logs/therapease-api-out.log',
      log_file: '/root/therapease/logs/therapease-api.log',
      time: true,
      max_memory_restart: '500M',
      restart_delay: 5000
    },
    {
      name: 'therapease-public',
      script: './server.js',
      cwd: '/root/therapease/therapease/public-website',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0'
      },
      error_file: '/root/therapease/logs/therapease-public-error.log',
      out_file: '/root/therapease/logs/therapease-public-out.log',
      log_file: '/root/therapease/logs/therapease-public.log',
      time: true,
      max_memory_restart: '200M',
      restart_delay: 5000
    }
  ]
};
EOF

# Start services
echo "[INFO] Starting services..."
/usr/bin/pm2 start ecosystem.config.js

# Wait and test
sleep 10

echo "[INFO] Testing database connection..."
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 200

echo ""
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5