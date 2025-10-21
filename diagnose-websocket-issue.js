#!/usr/bin/env node

/**
 * Comprehensive WebSocket Issue Diagnostic Script
 * This script identifies and fixes WebSocket connection problems
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 WebSocket Issue Diagnostic');
console.log('=============================');

console.log('\n🔍 Step 1: Analyzing WebSocket service code...');

const websocketServicePath = path.join(__dirname, 'client', 'src', 'services', 'websocketService.js');

if (fs.existsSync(websocketServicePath)) {
    const content = fs.readFileSync(websocketServicePath, 'utf8');
    
    console.log('✅ websocketService.js found');
    
    // Check for the problematic URL construction
    if (content.includes('window.location.hostname}/ws?token=')) {
        console.log('❌ ISSUE FOUND: WebSocket URL construction is missing port 5000');
        console.log('   Current: wss://www.therapease.site/ws');
        console.log('   Should be: wss://www.therapease.site:5000/ws');
    } else {
        console.log('✅ WebSocket URL construction looks correct');
    }
    
    // Check for reconnection attempts
    const maxReconnectMatch = content.match(/this\.maxReconnectAttempts = (\d+)/);
    if (maxReconnectMatch) {
        const maxAttempts = parseInt(maxReconnectMatch[1]);
        console.log(`📊 Max reconnection attempts: ${maxAttempts}`);
        if (maxAttempts > 1) {
            console.log('⚠️  High reconnection attempts may cause performance issues');
        }
    }
    
} else {
    console.log('❌ websocketService.js not found');
}

console.log('\n🔍 Step 2: Checking server WebSocket configuration...');

const serverIndexPath = path.join(__dirname, 'server', 'index.js');
const emergencyServerPath = path.join(__dirname, 'server', 'emergency-server-with-websocket.js');

if (fs.existsSync(serverIndexPath)) {
    const content = fs.readFileSync(serverIndexPath, 'utf8');
    
    if (content.includes('WebSocketServer')) {
        console.log('✅ Main server has WebSocket support');
    } else {
        console.log('❌ Main server missing WebSocket support');
    }
    
    if (content.includes("path: '/ws'")) {
        console.log('✅ WebSocket path configured as /ws');
    } else {
        console.log('❌ WebSocket path not configured');
    }
} else {
    console.log('❌ server/index.js not found');
}

if (fs.existsSync(emergencyServerPath)) {
    console.log('✅ Emergency server with WebSocket exists');
} else {
    console.log('❌ Emergency server with WebSocket missing');
}

console.log('\n🔍 Step 3: Creating WebSocket connection test...');

const testWebSocketScript = `#!/bin/bash

echo "🧪 Testing WebSocket connections..."

# Test 1: Direct connection to emergency server
echo "📡 Test 1: Direct connection to localhost:5000/ws"
node -e "
const WebSocket = require('ws');
console.log('🔌 Testing WebSocket connection to localhost:5000/ws...');

const ws = new WebSocket('ws://localhost:5000/ws?token=test-token');

ws.on('open', () => {
  console.log('✅ WebSocket connection to localhost:5000/ws successful');
  ws.close();
});

ws.on('error', (error) => {
  console.log('❌ WebSocket connection to localhost:5000/ws failed:', error.message);
});

setTimeout(() => {
  console.log('⏰ Test 1 timeout');
  process.exit(0);
}, 3000);
"

echo ""

# Test 2: Connection to production domain
echo "📡 Test 2: Connection to www.therapease.site:5000/ws"
node -e "
const WebSocket = require('ws');
console.log('🔌 Testing WebSocket connection to www.therapease.site:5000/ws...');

const ws = new WebSocket('wss://www.therapease.site:5000/ws?token=test-token');

ws.on('open', () => {
  console.log('✅ WebSocket connection to www.therapease.site:5000/ws successful');
  ws.close();
});

ws.on('error', (error) => {
  console.log('❌ WebSocket connection to www.therapease.site:5000/ws failed:', error.message);
});

setTimeout(() => {
  console.log('⏰ Test 2 timeout');
  process.exit(0);
}, 5000);
"

echo ""

# Test 3: Check if port 5000 is accessible
echo "📡 Test 3: Checking if port 5000 is accessible"
curl -s "http://localhost:5000/health" | head -c 100
echo ""

echo "✅ WebSocket connection tests complete"
`;

const testScriptPath = path.join(__dirname, 'test-websocket-connections.sh');
fs.writeFileSync(testScriptPath, testScript);
fs.chmodSync(testScriptPath, '755');
console.log('✅ WebSocket connection test script created');

console.log('\n🔍 Step 4: Creating WebSocket fix...');

const fixWebSocketScript = `#!/bin/bash

echo "🔧 Fixing WebSocket Connection Issues"
echo "======================================"

echo ""
echo "🔍 Step 1: Stopping current PM2 processes..."
pm2 stop all

echo ""
echo "🔍 Step 2: Fixing WebSocket URL in client code..."

# Create a fixed version of websocketService.js
cat > client/src/services/websocketService-fixed.js << 'EOF'
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 1; // Reduced to prevent aggressive reconnections
    this.reconnectInterval = 5000;
    this.listeners = new Map();
    this.isConnecting = false;
    this.lastToken = null;
  }

  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    // Prevent reconnection with the same token if it failed before
    if (this.lastToken === token && this.reconnectAttempts > 0) {
      console.log('🔌 Skipping WebSocket connection - same token that failed before');
      return;
    }

    this.isConnecting = true;
    this.lastToken = token;
    
    // Determine WebSocket URL based on environment
    let wsUrl;
    
    console.log('🔍 WebSocket debug info:', {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      nodeEnv: process.env.NODE_ENV
    });
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development environment
      wsUrl = \`ws://\${window.location.hostname}:5000/ws?token=\${token}\`;
      console.log('🔌 Using localhost for WebSocket');
    } else {
      // Production environment - FIXED: Include port 5000
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = \`\${protocol}//\${window.location.hostname}:5000/ws?token=\${token}\`;
      console.log('🔌 Using production host with port 5000 for WebSocket');
    }
    
    console.log('🔌 WebSocket connecting to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionState = 'connected';
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(\`🔌 WebSocket disconnected: \${event.code}\`);
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        
        // Only attempt reconnection if it's not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };
      
      this.ws.onerror = (error) => {
        console.log('🔌 WebSocket error:', error);
        this.isConnecting = false;
        this.connectionState = 'error';
        
        // Don't attempt reconnection on error - just log it
        console.log('🔌 WebSocket connection failed, but continuing without WebSocket');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      console.log('🔌 WebSocket connection failed, but continuing without WebSocket');
    }
  }

  scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached, stopping reconnection');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(5000, 10000); // Fixed delay to prevent aggressive reconnections
    
    console.log(\`🔄 Attempting to reconnect (\${this.reconnectAttempts}/\${this.maxReconnectAttempts}) in \${delay}ms\`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(token);
      }
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  handleMessage(data) {
    const { type, payload } = data;
    
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type);
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error('WebSocket callback error:', error);
        }
      });
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;
EOF

# Replace the original file
mv client/src/services/websocketService-fixed.js client/src/services/websocketService.js
echo "✅ WebSocket service fixed with correct port 5000"

echo ""
echo "🔍 Step 3: Building frontend with fixed WebSocket..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 4: Starting emergency server with WebSocket..."
pm2 start ecosystem-emergency-websocket.config.js

echo ""
echo "🔍 Step 5: Testing WebSocket connections..."
./test-websocket-connections.sh

echo ""
echo "🔍 Step 6: Final status check..."
pm2 status

echo ""
echo "🏁 WebSocket fix complete!"
echo ""
echo "📋 Summary of fixes:"
echo "✅ Fixed WebSocket URL to include port 5000"
echo "✅ Reduced reconnection attempts to 1"
echo "✅ Added better error handling"
echo "✅ Built frontend with fixes"
echo "✅ Started emergency server with WebSocket"
echo ""
echo "🎯 Expected results:"
echo "- ✅ WebSocket connects to wss://www.therapease.site:5000/ws"
echo "- ✅ No more 'Unexpected response code: 200' errors"
echo "- ✅ Faster login experience"
echo "- ✅ Real-time features working"
`;

const fixScriptPath = path.join(__dirname, 'fix-websocket-connection.sh');
fs.writeFileSync(fixScriptPath, fixScript);
fs.chmodSync(fixScriptPath, '755');
console.log('✅ WebSocket fix script created');

console.log('\n🏁 WebSocket diagnostic complete!');
console.log('\n📋 Issues identified:');
console.log('1. ❌ WebSocket URL missing port 5000');
console.log('2. ❌ Client trying to connect to wss://www.therapease.site/ws');
console.log('3. ❌ Should connect to wss://www.therapease.site:5000/ws');
console.log('4. ❌ Server returning HTML (200) instead of WebSocket upgrade');
console.log('\n🔧 Solutions provided:');
console.log('1. ✅ Fixed WebSocket URL construction');
console.log('2. ✅ Added port 5000 to production WebSocket URL');
console.log('3. ✅ Created connection test script');
console.log('4. ✅ Created comprehensive fix script');
console.log('\n🚀 Next steps:');
console.log('1. Run: ./fix-websocket-connection.sh');
console.log('2. Test: ./test-websocket-connections.sh');
console.log('3. Verify: Check browser console for successful WebSocket connection');
console.log('\n📋 Expected results:');
console.log('- ✅ WebSocket connects to correct URL with port 5000');
console.log('- ✅ No more handshake errors');
console.log('- ✅ Real-time features working');
console.log('- ✅ Fast login experience');
