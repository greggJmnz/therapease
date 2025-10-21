#!/usr/bin/env node

/**
 * Fix build and server issues
 * This script addresses the syntax error and server file issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Build and Server Issues');
console.log('==================================');

console.log('\n🔍 Step 1: Fixing websocketService.js syntax error...');

const websocketServicePath = path.join(__dirname, 'client', 'src', 'services', 'websocketService.js');

if (fs.existsSync(websocketServicePath)) {
    // Create a clean websocketService.js
    const cleanWebSocketService = `class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
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
      // Production environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = \`\${protocol}//\${window.location.hostname}/ws?token=\${token}\`;
      console.log('🔌 Using current host for WebSocket');
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
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };
      
      this.ws.onerror = (error) => {
        console.log('🔌 WebSocket error:', error);
        this.isConnecting = false;
        this.connectionState = 'error';
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached, stopping reconnection');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
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
`;

    fs.writeFileSync(websocketServicePath, cleanWebSocketService);
    console.log('✅ Fixed websocketService.js syntax error');
} else {
    console.log('❌ websocketService.js not found');
}

console.log('\n🔍 Step 2: Checking server files...');

const serverIndexPath = path.join(__dirname, 'server', 'index.js');
const ecosystemPath = path.join(__dirname, 'ecosystem.config.js');

if (fs.existsSync(serverIndexPath)) {
    console.log('✅ server/index.js exists');
} else {
    console.log('❌ server/index.js missing');
}

if (fs.existsSync(ecosystemPath)) {
    console.log('✅ ecosystem.config.js exists');
} else {
    console.log('❌ ecosystem.config.js missing');
}

console.log('\n🔍 Step 3: Creating ecosystem.config.js...');

const ecosystemConfig = `module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'therapease-public',
      script: 'public-website/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/public-error.log',
      out_file: './logs/public-out.log',
      log_file: './logs/public-combined.log',
      time: true
    }
  ]
};
`;

fs.writeFileSync(ecosystemPath, ecosystemConfig);
console.log('✅ Created ecosystem.config.js');

console.log('\n🔍 Step 4: Creating public-website/server.js...');

const publicWebsiteDir = path.join(__dirname, 'public-website');
if (!fs.existsSync(publicWebsiteDir)) {
    fs.mkdirSync(publicWebsiteDir, { recursive: true });
}

const publicServerContent = `const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`🌐 Public website running on port \${PORT}\`);
});

module.exports = app;
`;

const publicServerPath = path.join(publicWebsiteDir, 'server.js');
fs.writeFileSync(publicServerPath, publicServerContent);
console.log('✅ Created public-website/server.js');

console.log('\n🔍 Step 5: Creating logs directory...');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Created logs directory');
} else {
    console.log('✅ Logs directory exists');
}

console.log('\n🔍 Step 6: Creating build fix script...');

const buildFixScript = `#!/bin/bash

echo "🔧 Fixing build and server issues..."

# Create logs directory
mkdir -p logs

# Fix permissions
chmod +x server/index.js
chmod +x public-website/server.js

# Clean and rebuild
cd client
rm -rf build
npm run build
cd ..

# Start PM2 processes
pm2 start ecosystem.config.js

# Check status
pm2 status

echo "✅ Build and server issues fixed!"
`;

const buildFixPath = path.join(__dirname, 'fix-build-issues.sh');
fs.writeFileSync(buildFixPath, buildFixScript);
fs.chmodSync(buildFixPath, '755');
console.log('✅ Created build fix script');

console.log('\n🏁 Build and server issues fix complete!');
console.log('\n📋 Summary of fixes:');
console.log('1. ✅ Fixed websocketService.js syntax error');
console.log('2. ✅ Created ecosystem.config.js');
console.log('3. ✅ Created public-website/server.js');
console.log('4. ✅ Created logs directory');
console.log('5. ✅ Created build fix script');
console.log('\n🔧 Next steps:');
console.log('1. Run: ./fix-build-issues.sh');
console.log('2. Check: pm2 status');
console.log('3. Test: curl http://localhost:5000/health');
console.log('\n📋 Expected results:');
console.log('- ✅ Build completes successfully');
console.log('- ✅ PM2 processes start correctly');
console.log('- ✅ Server responds to requests');
console.log('- ✅ No more syntax errors');
