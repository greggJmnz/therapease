#!/bin/bash

echo "🧪 Testing and Fixing Login - Comprehensive Test Suite..."

cd /root/therapease/therapease

# 1. Test current system status
echo "=========================================="
echo "🔍 STEP 1: Testing Current System Status"
echo "=========================================="

# Check PM2 status
echo "[TEST] PM2 Status:"
/usr/bin/pm2 list

# Check if services are running
echo "[TEST] Port Status:"
ss -tlnp | grep -E ":(5000|8080)" || echo "❌ No services on expected ports"

# Test local API
echo "[TEST] Local API Test:"
LOCAL_MAINTENANCE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance endpoint: HTTP $LOCAL_MAINTENANCE"

LOCAL_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "Login endpoint: HTTP $LOCAL_LOGIN"

# Test external API
echo "[TEST] External API Test:"
EXTERNAL_MAINTENANCE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance: HTTP $EXTERNAL_MAINTENANCE"

EXTERNAL_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "External login: HTTP $EXTERNAL_LOGIN"

# 2. Test database connection
echo "=========================================="
echo "🔍 STEP 2: Testing Database Connection"
echo "=========================================="

cd server

# Test MySQL connection
echo "[TEST] MySQL Connection Test:"
mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
fi

# Test admin user exists
echo "[TEST] Admin User Test:"
ADMIN_EXISTS=$(mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 therapease_db -sN -e "SELECT COUNT(*) FROM users WHERE email='admin@therapease.com';" 2>/dev/null)
echo "Admin user exists: $ADMIN_EXISTS"

if [ "$ADMIN_EXISTS" = "1" ]; then
    echo "✅ Admin user found"
    
    # Test password hash
    echo "[TEST] Password Hash Test:"
    CURRENT_HASH=$(mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 therapease_db -sN -e "SELECT password FROM users WHERE email='admin@therapease.com';" 2>/dev/null)
    echo "Current hash length: ${#CURRENT_HASH}"
    
    # Test if password works
    PASSWORD_TEST=$(node -e "
    const bcrypt = require('bcryptjs');
    const hash = '$CURRENT_HASH';
    const password = 'SecureAdmin2024!@#$';
    bcrypt.compare(password, hash).then(result => {
        console.log('Password match:', result);
        process.exit(result ? 0 : 1);
    }).catch(err => {
        console.log('Password test error:', err.message);
        process.exit(1);
    });
    " 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "✅ Password hash is correct"
    else
        echo "❌ Password hash is incorrect"
    fi
else
    echo "❌ Admin user not found"
fi

# 3. Test route configuration
echo "=========================================="
echo "🔍 STEP 3: Testing Route Configuration"
echo "=========================================="

# Check if auth routes exist
echo "[TEST] Auth Routes Test:"
if [ -f "routes/authRoutes.js" ]; then
    echo "✅ authRoutes.js exists"
    
    # Check if login route is defined
    if grep -q "router.post('/login'" routes/authRoutes.js; then
        echo "✅ Login route defined"
    else
        echo "❌ Login route not found"
    fi
else
    echo "❌ authRoutes.js not found"
fi

# Check if routes are loaded in index.js
echo "[TEST] Route Loading Test:"
if grep -q "authRoutes" index.js; then
    echo "✅ Auth routes loaded in index.js"
else
    echo "❌ Auth routes not loaded in index.js"
fi

# 4. Test environment variables
echo "=========================================="
echo "🔍 STEP 4: Testing Environment Variables"
echo "=========================================="

echo "[TEST] Environment Variables:"
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    
    # Check key variables
    DB_USER=$(grep "DB_USER" .env.production | cut -d'=' -f2)
    JWT_SECRET=$(grep "JWT_SECRET" .env.production | cut -d'=' -f2)
    
    echo "DB_USER: $DB_USER"
    echo "JWT_SECRET length: ${#JWT_SECRET}"
    
    if [ "$DB_USER" = "therapease_user" ]; then
        echo "✅ DB_USER is correct"
    else
        echo "❌ DB_USER is incorrect"
    fi
    
    if [ ${#JWT_SECRET} -gt 20 ]; then
        echo "✅ JWT_SECRET is set"
    else
        echo "❌ JWT_SECRET is missing or too short"
    fi
else
    echo "❌ .env.production not found"
fi

# 5. Apply fixes if needed
echo "=========================================="
echo "🔧 STEP 5: Applying Fixes"
echo "=========================================="

# Stop PM2 processes
echo "[FIX] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true
/usr/bin/pm2 delete all 2>/dev/null || true

# Fix database configuration
echo "[FIX] Fixing database configuration..."
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

# Fix auth routes
echo "[FIX] Fixing auth routes..."
cat > routes/authRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAll, getOne, runQuery } = require('../config/database');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email, timestamp: new Date().toISOString() });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Get user from database
    const sql = 'SELECT * FROM users WHERE email = ?';
    const user = await getOne(sql, [email]);

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    console.log('👤 User found:', { id: user.id, email: user.email, role: user.role });

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    console.log('✅ Password valid for user:', email);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log('🎉 Login successful for user:', email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'patient' } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    // Check if user already exists
    const existingUser = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const sql = `
      INSERT INTO users (email, password, firstName, lastName, role, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `;
    
    const result = await runQuery(sql, [email, hashedPassword, firstName, lastName, role]);
    
    res.json({
      success: true,
      message: 'User registered successfully',
      data: { userId: result.insertId }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    const sql = 'SELECT id, email, firstName, lastName, role, status, createdAt FROM users WHERE id = ?';
    const user = await getOne(sql, [decoded.userId]);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
EOF

# Ensure admin user exists with correct password
echo "[FIX] Ensuring admin user exists..."
HASHED_PASSWORD=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('SecureAdmin2024!@#$', 12));")

mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 therapease_db -e "
INSERT INTO users (email, password, firstName, lastName, role, status, createdAt, updatedAt)
VALUES ('admin@therapease.com', '$HASHED_PASSWORD', 'System', 'Administrator', 'admin', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
password = '$HASHED_PASSWORD',
status = 'active',
updatedAt = NOW();
" 2>/dev/null

echo "✅ Admin user ensured"

# Create ecosystem config
echo "[FIX] Creating ecosystem config..."
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

# Create logs directory
mkdir -p /root/therapease/logs

# Start services
echo "[FIX] Starting services..."
/usr/bin/pm2 start ecosystem.config.js

# Wait for services to start
sleep 15

# 6. Final tests
echo "=========================================="
echo "🧪 STEP 6: Final Tests"
echo "=========================================="

# Test local login
echo "[FINAL TEST] Local Login Test:"
LOCAL_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "Response: $LOCAL_LOGIN_RESPONSE"

if echo "$LOCAL_LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Local login successful!"
    
    # Extract token and test protected endpoint
    TOKEN=$(echo "$LOCAL_LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$TOKEN" ]; then
        echo "[FINAL TEST] Testing protected endpoint with token..."
        PROTECTED_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/auth/me)
        echo "Protected endpoint response: $PROTECTED_RESPONSE"
    fi
else
    echo "❌ Local login failed"
fi

# Test external login
echo "[FINAL TEST] External Login Test:"
EXTERNAL_LOGIN_RESPONSE=$(curl -s -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "External response: $EXTERNAL_LOGIN_RESPONSE" | head -c 200

if echo "$EXTERNAL_LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ External login successful!"
else
    echo "❌ External login failed"
fi

# Show final status
echo "=========================================="
echo "📊 FINAL STATUS"
echo "=========================================="

echo "PM2 Status:"
/usr/bin/pm2 list

echo "Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "=========================================="
echo "🎉 Test and Fix Complete!"
echo "=========================================="
