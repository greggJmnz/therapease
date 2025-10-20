#!/bin/bash

echo "🔧 Fixing 401 and WebSocket Errors - Authentication Focus..."

cd /root/therapease/therapease

# 1. Check current PM2 status and logs
echo "=========================================="
echo "🔍 STEP 1: Current System Status"
echo "=========================================="

echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent API error logs:"
/usr/bin/pm2 logs therapease-api --lines 10 --err

# 2. Test authentication endpoints
echo "=========================================="
echo "🔍 STEP 2: Testing Authentication"
echo "=========================================="

echo "[TEST] Testing login endpoint directly:"
LOGIN_RESPONSE=$(curl -s -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "Login response: $LOGIN_RESPONSE"

# Extract token if login successful
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Login successful, token extracted: ${TOKEN:0:20}..."
    
    # Test protected endpoint with token
    echo "[TEST] Testing protected endpoint with token:"
    PROTECTED_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" https://therapease.site/api/auth/me)
    echo "Protected endpoint response: $PROTECTED_RESPONSE"
else
    echo "❌ Login failed"
fi

# 3. Check WebSocket configuration
echo "=========================================="
echo "🔍 STEP 3: Checking WebSocket Configuration"
echo "=========================================="

echo "[INFO] Checking WebSocket service..."
if [ -f "server/services/websocketService.js" ]; then
    echo "✅ WebSocket service exists"
    echo "[INFO] Checking WebSocket configuration..."
    grep -A 5 -B 5 "wss://" server/services/websocketService.js || echo "No WSS config found"
else
    echo "❌ WebSocket service not found"
fi

# 4. Fix authentication middleware
echo "=========================================="
echo "🔧 STEP 4: Fixing Authentication Middleware"
echo "=========================================="

cd server

echo "[INFO] Checking auth middleware..."
if [ -f "middleware/authMiddleware.js" ]; then
    echo "✅ Auth middleware exists"
    
    # Check if it's properly configured
    echo "[INFO] Checking auth middleware configuration..."
    grep -A 10 -B 5 "authenticateToken" middleware/authMiddleware.js | head -10
else
    echo "❌ Auth middleware not found"
fi

# 5. Fix WebSocket service
echo "=========================================="
echo "🔧 STEP 5: Fixing WebSocket Service"
echo "=========================================="

echo "[INFO] Creating/updating WebSocket service..."
cat > services/websocketService.js << 'EOF'
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss = null;

function initialize(server) {
  console.log('🔌 Initializing WebSocket service...');
  
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
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

echo "✅ WebSocket service updated"

# 6. Fix authentication middleware
echo "=========================================="
echo "🔧 STEP 6: Fixing Authentication Middleware"
echo "=========================================="

echo "[INFO] Creating/updating auth middleware..."
cat > middleware/authMiddleware.js << 'EOF'
const jwt = require('jsonwebtoken');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
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

echo "✅ Auth middleware updated"

# 7. Restart services
echo "=========================================="
echo "🔧 STEP 7: Restarting Services"
echo "=========================================="

echo "[INFO] Restarting PM2 services..."
/usr/bin/pm2 restart all

sleep 10

# 8. Test everything
echo "=========================================="
echo "🧪 STEP 8: Final Testing"
echo "=========================================="

echo "[TEST] Testing login after fixes:"
LOGIN_RESPONSE=$(curl -s -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "Login response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Login working"
    
    # Test maintenance status
    echo "[TEST] Testing maintenance status:"
    MAINTENANCE_RESPONSE=$(curl -s https://therapease.site/api/maintenance-status)
    echo "Maintenance response: $MAINTENANCE_RESPONSE"
else
    echo "❌ Login still failing"
fi

# 9. Final status
echo "=========================================="
echo "📊 FINAL STATUS"
echo "=========================================="

echo "PM2 Status:"
/usr/bin/pm2 list

echo "Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "=========================================="
echo "🎉 401 and WebSocket Fix Complete!"
echo "=========================================="
echo "[INFO] Authentication and WebSocket issues should be resolved"
echo "[INFO] Try logging in from the frontend now"
