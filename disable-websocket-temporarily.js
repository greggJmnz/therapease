#!/usr/bin/env node

/**
 * Temporarily disable WebSocket connections to fix performance issues
 * This script modifies the websocketService to prevent connection attempts
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Temporarily Disabling WebSocket Connections');
console.log('==============================================');

console.log('\n🔍 Step 1: Modifying websocketService.js to disable connections...');

const websocketServicePath = path.join(__dirname, 'client', 'src', 'services', 'websocketService.js');

if (fs.existsSync(websocketServicePath)) {
    // Create a modified websocketService that doesn't attempt connections
    const modifiedWebSocketService = `class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 0; // Disable reconnections
    this.reconnectInterval = 5000;
    this.listeners = new Map();
    this.isConnecting = false;
    this.lastToken = null;
    this.disabled = true; // Disable WebSocket connections
  }

  connect(token) {
    // WebSocket connections are temporarily disabled
    console.log('🔌 WebSocket connections temporarily disabled for performance');
    return;
  }

  scheduleReconnect(token) {
    // Reconnections are disabled
    console.log('🔌 WebSocket reconnections disabled');
    return;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  send(message) {
    // WebSocket sending is disabled
    console.log('🔌 WebSocket sending disabled');
    return false;
  }

  handleMessage(data) {
    // WebSocket message handling is disabled
    console.log('🔌 WebSocket message handling disabled');
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
`;

    // Create backup
    const backupPath = websocketServicePath + '.backup.' + new Date().toISOString().slice(0, 19).replace(/:/g, '');
    fs.writeFileSync(backupPath, fs.readFileSync(websocketServicePath));
    console.log('✅ Backup created:', backupPath);

    // Write modified version
    fs.writeFileSync(websocketServicePath, modifiedWebSocketService);
    console.log('✅ WebSocket connections disabled');
} else {
    console.log('❌ websocketService.js not found');
}

console.log('\n🔍 Step 2: Modifying AuthContext to skip WebSocket connections...');

const authContextPath = path.join(__dirname, 'client', 'src', 'context', 'AuthContext.js');

if (fs.existsSync(authContextPath)) {
    let content = fs.readFileSync(authContextPath, 'utf8');
    
    // Comment out WebSocket connection calls
    const modifiedContent = content.replace(
        /\/\/ Initialize WebSocket connection\n\s*websocketService\.connect\(storedToken\);/,
        `// Initialize WebSocket connection - TEMPORARILY DISABLED
    // websocketService.connect(storedToken);`
    ).replace(
        /\/\/ Initialize WebSocket connection\n\s*websocketService\.connect\(data\.data\.token\);/,
        `// Initialize WebSocket connection - TEMPORARILY DISABLED
    // websocketService.connect(data.data.token);`
    );
    
    // Create backup
    const backupPath = authContextPath + '.backup.' + new Date().toISOString().slice(0, 19).replace(/:/g, '');
    fs.writeFileSync(backupPath, content);
    console.log('✅ AuthContext backup created:', backupPath);
    
    fs.writeFileSync(authContextPath, modifiedContent);
    console.log('✅ AuthContext WebSocket connections disabled');
} else {
    console.log('❌ AuthContext.js not found');
}

console.log('\n🔍 Step 3: Creating build script...');

const buildScript = `#!/bin/bash

echo "🔧 Building frontend with disabled WebSocket..."

# Build the frontend
cd client
npm run build
cd ..

echo "✅ Frontend built with WebSocket disabled"
echo "🎯 Expected results:"
echo "- No more WebSocket connection attempts"
echo "- Faster login experience"
echo "- No reconnection loops"
echo "- Smooth data fetching"
`;

const buildScriptPath = path.join(__dirname, 'build-without-websocket.sh');
fs.writeFileSync(buildScriptPath, buildScript);
fs.chmodSync(buildScriptPath, '755');
console.log('✅ Build script created');

console.log('\n🏁 WebSocket temporarily disabled!');
console.log('\n📋 Summary of changes:');
console.log('1. ✅ Modified websocketService.js to disable connections');
console.log('2. ✅ Modified AuthContext.js to skip WebSocket calls');
console.log('3. ✅ Created build script');
console.log('4. ✅ Created backups of original files');
console.log('\n🔧 Next steps:');
console.log('1. Run: ./build-without-websocket.sh');
console.log('2. Restart PM2: pm2 restart all');
console.log('3. Test the application');
console.log('\n📋 Expected results:');
console.log('- ✅ No more WebSocket connection attempts');
console.log('- ✅ Faster login experience');
console.log('- ✅ No reconnection loops');
console.log('- ✅ Smooth data fetching');
console.log('- ✅ All API endpoints working');
console.log('\n🔧 To re-enable WebSocket later:');
console.log('1. Restore from backup files');
console.log('2. Fix WebSocket server configuration');
console.log('3. Rebuild and restart');
