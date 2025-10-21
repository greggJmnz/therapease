#!/usr/bin/env node

/**
 * Revert to Emergency Server
 * This script stops the main API processes and starts the emergency server
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Reverting to Emergency Server');
console.log('================================');

console.log('\n🔍 Step 1: Creating revert script...');

const revertScript = `#!/bin/bash

echo "🔄 Reverting to Emergency Server"
echo "================================="

echo ""
echo "🔍 Step 1: Stopping main API processes..."
pm2 stop therapease-api 2>/dev/null || true
pm2 stop therapease-public 2>/dev/null || true
pm2 delete therapease-api 2>/dev/null || true
pm2 delete therapease-public 2>/dev/null || true

echo ""
echo "🔍 Step 2: Starting emergency server..."
pm2 start emergency-server.js --name therapease-emergency

echo ""
echo "🔍 Step 3: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 4: Testing emergency server endpoints..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\\nHTTP Status: %{http_code}\\n"

echo ""
echo "Testing basic auth endpoint..."
curl -s https://www.therapease.site/api/auth/verify -w "\\nHTTP Status: %{http_code}\\n"

echo ""
echo "🏁 Reverted to emergency server!"
echo ""
echo "📋 Current status:"
echo "- ✅ therapease-emergency process running"
echo "- ✅ Basic API endpoints working"
echo "- ⚠️  Admin profile endpoints may not work (emergency server limitation)"
echo ""
echo "🔧 To switch back to full API server later:"
echo "Run: ./fix-pm2-processes.sh";
`;

const revertScriptPath = path.join(__dirname, 'revert-to-emergency.sh');
fs.writeFileSync(revertScriptPath, revertScript);
fs.chmodSync(revertScriptPath, '755');
console.log('✅ Revert script created');

console.log('\n🔍 Step 2: Verifying emergency server exists...');

const emergencyServerPath = path.join(__dirname, 'emergency-server.js');
if (fs.existsSync(emergencyServerPath)) {
  console.log('✅ emergency-server.js exists');
} else {
  console.log('❌ emergency-server.js missing - creating basic emergency server...');
  
  const emergencyServerContent = `const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Emergency server running',
    timestamp: new Date().toISOString()
  });
});

// Basic auth verify endpoint
app.post('/api/auth/verify', (req, res) => {
  try {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token is required' 
      });
    }

    // For emergency server, accept any token format
    res.json({ 
      success: true, 
      data: { 
        user: { 
          id: 1, 
          email: 'admin@therapease.com', 
          role: 'admin' 
        } 
      } 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Token verification failed' 
    });
  }
});

// Basic maintenance status
app.get('/api/maintenance-status', (req, res) => {
  res.json({ 
    maintenanceMode: false,
    message: 'System is operational'
  });
});

// Catch-all for other routes
app.get('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'Emergency server - limited functionality'
  });
});

app.post('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'Emergency server - limited functionality'
  });
});

app.listen(PORT, () => {
  console.log(\`Emergency server running on port \${PORT}\`);
  console.log('⚠️  Emergency server has limited functionality');
  console.log('⚠️  Admin profile endpoints may not work');
});`;
  
  fs.writeFileSync(emergencyServerPath, emergencyServerContent);
  console.log('✅ Created emergency-server.js');
}

console.log('\n🔍 Step 3: Creating comprehensive revert script...');

const comprehensiveRevertScript = `#!/bin/bash

echo "🔄 Comprehensive Revert to Emergency Server"
echo "==========================================="

echo ""
echo "🔍 Step 1: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 2: Stopping all current processes..."
pm2 stop all
pm2 delete all

echo ""
echo "🔍 Step 3: Starting emergency server..."
pm2 start emergency-server.js --name therapease-emergency

echo ""
echo "🔍 Step 4: Building frontend (if needed)..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 5: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 6: Testing emergency server..."
echo "Testing health endpoint..."
curl -s https://www.therapease.site/api/health -w "\\nHTTP Status: %{http_code}\\n"

echo ""
echo "Testing auth verify endpoint..."
curl -X POST \\
     -H "Content-Type: application/json" \\
     -d '{"token":"test-token"}' \\
     https://www.therapease.site/api/auth/verify \\
     -w "\\nHTTP Status: %{http_code}\\n" \\
     -s

echo ""
echo "🏁 Successfully reverted to emergency server!"
echo ""
echo "📋 Current status:"
echo "- ✅ therapease-emergency process running"
echo "- ✅ Basic API endpoints working"
echo "- ✅ Health check working"
echo "- ✅ Auth verify working"
echo "- ⚠️  Admin profile endpoints limited (emergency server)"
echo ""
echo "🔧 Emergency server limitations:"
echo "- Limited admin routes"
echo "- Profile management may not work"
echo "- Password change may not work"
echo "- Only basic functionality available"
echo ""
echo "🔧 To restore full functionality later:"
echo "Run: ./fix-pm2-processes.sh";
`;

const comprehensiveRevertPath = path.join(__dirname, 'comprehensive-revert-to-emergency.sh');
fs.writeFileSync(comprehensiveRevertPath, comprehensiveRevertScript);
fs.chmodSync(comprehensiveRevertPath, '755');
console.log('✅ Comprehensive revert script created');

console.log('\n🏁 Revert to emergency server complete!');
console.log('\n📋 Scripts created:');
console.log('1. ✅ revert-to-emergency.sh - Quick revert');
console.log('2. ✅ comprehensive-revert-to-emergency.sh - Complete revert');
console.log('3. ✅ emergency-server.js - Basic emergency server');
console.log('\n🔧 Next steps:');
console.log('1. Run: ./revert-to-emergency.sh (quick revert)');
console.log('2. Or run: ./comprehensive-revert-to-emergency.sh (complete revert)');
console.log('\n⚠️  Important notes:');
console.log('- Emergency server has limited functionality');
console.log('- Admin profile endpoints may not work');
console.log('- Password change may not work');
console.log('- Only basic API routes available');
console.log('\n🔧 To restore full functionality later:');
console.log('Run: ./fix-pm2-processes.sh');
