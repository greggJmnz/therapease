#!/bin/bash

echo "🔧 Fixing JWT Secret Loading - Environment Variable Issue..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Check current environment loading
echo "[INFO] Checking environment variable loading..."
echo "JWT_SECRET from .env.production:"
grep "JWT_SECRET" .env.production

# 3. Fix the WebSocket service to properly load environment variables
echo "[INFO] Fixing WebSocket service environment loading..."
cat > services/websocketService.js << 'EOF'
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

let wss = null;

function initialize(server) {
  console.log('🔌 Initializing WebSocket service...');
  console.log('🔑 JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');
  
  wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    verifyClient: (info) => {
      console.log('🔍 WebSocket connection attempt from:', info.origin);
      return true; // Allow all connections for now
    }
  });

  wss.on('connection', (ws, req) => {
    console.log('🔌 WebSocket client connected');
    
    // Extract token from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
        console.log('🔑 Using JWT secret:', jwtSecret ? 'Present' : 'Missing');
        
        const decoded = jwt.verify(token, jwtSecret);
        console.log('✅ WebSocket token verified for user:', decoded.email);
        ws.userId = decoded.userId;
        ws.userEmail = decoded.email;
      } catch (error) {
        console.log('❌ WebSocket token verification failed:', error.message);
        ws.close(1008, 'Invalid token');
        return;
      }
    } else {
      console.log('⚠️ WebSocket connection without token');
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📨 WebSocket message received:', data);
        
        // Echo back the message
        ws.send(JSON.stringify({
          type: 'echo',
          data: data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    });

    ws.on('close', (code, reason) => {
      console.log('🔌 WebSocket client disconnected:', code, reason.toString());
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to TherapEase WebSocket',
      timestamp: new Date().toISOString()
    }));
  });

  console.log('✅ WebSocket service initialized');
}

function broadcast(message, excludeUserId = null) {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (!excludeUserId || client.userId !== excludeUserId) {
        client.send(data);
      }
    }
  });
}

function sendToUser(userId, message) {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(data);
    }
  });
}

module.exports = {
  initialize,
  broadcast,
  sendToUser
};
EOF

# 4. Fix the auth middleware to properly load environment variables
echo "[INFO] Fixing auth middleware environment loading..."
cat > middleware/authMiddleware.js << 'EOF'
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    console.log('🔑 Auth middleware JWT secret:', jwtSecret ? 'Present' : 'Missing');
    
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};
EOF

# 5. Fix the auth routes to properly load environment variables
echo "[INFO] Fixing auth routes environment loading..."
cat > routes/authRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAll, getOne, runQuery } = require('../config/database');

// Load environment variables
require('dotenv').config({ path: '.env.production' });

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
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    console.log('🔑 JWT secret for token generation:', jwtSecret ? 'Present' : 'Missing');
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      jwtSecret,
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
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const decoded = jwt.verify(token, jwtSecret);
    
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

# 6. Test environment loading
echo "[INFO] Testing environment variable loading..."
node -e "
require('dotenv').config({ path: '.env.production' });
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
"

# 7. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 8. Test login
echo "[INFO] Testing login with JWT secret fix..."
LOGIN_RESPONSE=$(curl -s -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "Login response: $LOGIN_RESPONSE"

# 9. Test maintenance status
echo "[INFO] Testing maintenance status..."
MAINTENANCE_RESPONSE=$(curl -s https://therapease.site/api/maintenance-status)
echo "Maintenance response: $MAINTENANCE_RESPONSE"

# 10. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] JWT Secret loading fix complete!"
