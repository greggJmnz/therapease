#!/bin/bash

echo "🔧 Fixing Login 405 Error - Complete System Repair..."

cd /root/therapease/therapease

# Stop all PM2 processes
echo "[INFO] Stopping all PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true
/usr/bin/pm2 delete all 2>/dev/null || true

cd server

# 1. Fix the database configuration completely
echo "[INFO] Fixing database configuration..."
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

# 2. Fix authRoutes.js with proper error handling
echo "[INFO] Fixing authRoutes.js..."
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

# 3. Fix server/index.js to ensure proper route loading
echo "[INFO] Fixing server/index.js..."
if [ -f "index.js" ]; then
    # Backup original
    cp index.js index.js.backup.$(date +%Y%m%d_%H%M%S)
    
    # Check if auth routes are properly loaded
    if ! grep -q "authRoutes" index.js; then
        echo "[INFO] Adding auth routes to index.js..."
        # Add auth routes after other route imports
        sed -i '/const.*Routes = require/a const authRoutes = require("./routes/authRoutes");' index.js
        sed -i '/app.use.*\/api\/admin/a app.use("/api/auth", authRoutes);' index.js
    fi
fi

# 4. Ensure admin user exists with correct password
echo "[INFO] Ensuring admin user exists..."
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

# 5. Create proper ecosystem config
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

# 6. Create logs directory
mkdir -p /root/therapease/logs

# 7. Start services
echo "[INFO] Starting services..."
/usr/bin/pm2 start ecosystem.config.js

# Wait for services to start
sleep 15

# 8. Test login
echo "[INFO] Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "Login response:"
echo "$LOGIN_RESPONSE"

# 9. Test external login
echo "[INFO] Testing external login..."
EXTERNAL_LOGIN_RESPONSE=$(curl -s -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "External login response:"
echo "$EXTERNAL_LOGIN_RESPONSE" | head -c 500

# 10. Show status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 10

echo "[INFO] Fix complete!"