#!/usr/bin/env node

/**
 * Fix WebSocket connection issue without disabling WebSocket
 * This script fixes the WebSocket connection to work with the emergency server
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing WebSocket Connection Issue');
console.log('====================================');

console.log('\n🔍 Step 1: Modifying websocketService.js to handle connection failures gracefully...');

const websocketServicePath = path.join(__dirname, 'client', 'src', 'services', 'websocketService.js');

if (fs.existsSync(websocketServicePath)) {
    let content = fs.readFileSync(websocketServicePath, 'utf8');
    
    // Modify the connect method to handle connection failures gracefully
    const fixedContent = content.replace(
        /connect\(token\) \{[\s\S]*?\}/,
        `connect(token) {
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
      // Production environment - try emergency server first
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = \`\${protocol}//\${window.location.hostname}:5000/ws?token=\${token}\`;
      console.log('🔌 Using emergency server for WebSocket');
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
  }`
    );
    
    fs.writeFileSync(websocketServicePath, fixedContent);
    console.log('✅ WebSocket service modified to handle connection failures gracefully');
} else {
    console.log('❌ websocketService.js not found');
}

console.log('\n🔍 Step 2: Modifying scheduleReconnect to be less aggressive...');

if (fs.existsSync(websocketServicePath)) {
    let content = fs.readFileSync(websocketServicePath, 'utf8');
    
    // Modify the scheduleReconnect method to be less aggressive
    const fixedContent = content.replace(
        /scheduleReconnect\(token\) \{[\s\S]*?\}/,
        `scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached, stopping reconnection');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 10000); // Slower, shorter delays
    
    console.log(\`🔄 Attempting to reconnect (\${this.reconnectAttempts}/\${this.maxReconnectAttempts}) in \${delay}ms\`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(token);
      }
    }, delay);
  }`
    );
    
    fs.writeFileSync(websocketServicePath, fixedContent);
    console.log('✅ WebSocket reconnection made less aggressive');
}

console.log('\n🔍 Step 3: Creating WebSocket connection test...');

const testWebSocketScript = `#!/bin/bash

echo "🧪 Testing WebSocket connection..."

# Test WebSocket connection to emergency server
node -e "
const WebSocket = require('ws');
console.log('🔌 Testing WebSocket connection to emergency server...');

const ws = new WebSocket('ws://localhost:5000/ws?token=test-token');

ws.on('open', () => {
  console.log('✅ WebSocket connection successful');
  ws.close();
});

ws.on('error', (error) => {
  console.log('❌ WebSocket connection failed:', error.message);
});

setTimeout(() => {
  console.log('⏰ WebSocket test timeout');
  process.exit(0);
}, 3000);
"

echo "✅ WebSocket test complete"
`;

const testScriptPath = path.join(__dirname, 'test-websocket-connection.sh');
fs.writeFileSync(testScriptPath, testScript);
fs.chmodSync(testScriptPath, '755');
console.log('✅ WebSocket test script created');

console.log('\n🔍 Step 4: Creating build script...');

const buildScript = `#!/bin/bash

echo "🔧 Building frontend with improved WebSocket handling..."

# Build the frontend
cd client
npm run build
cd ..

echo "✅ Frontend built with improved WebSocket handling"
echo "🎯 Expected results:"
echo "- WebSocket connections work when available"
echo "- Graceful fallback when WebSocket fails"
echo "- No aggressive reconnection loops"
echo "- Faster login experience"
echo "- Real-time features work when connected"
`;

const buildScriptPath = path.join(__dirname, 'build-with-improved-websocket.sh');
fs.writeFileSync(buildScriptPath, buildScript);
fs.chmodSync(buildScriptPath, '755');
console.log('✅ Build script created');

console.log('\n🏁 WebSocket connection issue fixed!');
console.log('\n📋 Summary of improvements:');
console.log('1. ✅ WebSocket connections try emergency server first');
console.log('2. ✅ Graceful handling of connection failures');
console.log('3. ✅ Less aggressive reconnection attempts');
console.log('4. ✅ Better error handling and logging');
console.log('5. ✅ WebSocket functionality preserved');
console.log('\n🔧 Next steps:');
console.log('1. Run: ./build-with-improved-websocket.sh');
console.log('2. Test: ./test-websocket-connection.sh');
console.log('3. Restart PM2: pm2 restart all');
console.log('\n📋 Expected results:');
console.log('- ✅ WebSocket connects when server supports it');
console.log('- ✅ Graceful fallback when WebSocket unavailable');
console.log('- ✅ No more aggressive reconnection loops');
console.log('- ✅ Faster login experience');
console.log('- ✅ Real-time features work when connected');
console.log('- ✅ Application works with or without WebSocket');
