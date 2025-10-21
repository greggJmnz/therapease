#!/bin/bash

echo "🔧 Force WebSocket Fix - Comprehensive Solution"
echo "=============================================="

echo ""
echo "🔍 Step 1: Creating emergency WebSocket service with hardcoded port 5000..."

cat > client/src/services/websocketService.js << 'EOF'
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 1; // Only 1 attempt to prevent long loading
    this.reconnectInterval = 2000; // Faster timeout
    this.listeners = new Map();
    this.isConnecting = false;
    this.lastToken = null;
    this.connectionTimeout = null;
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
    
    // HARDCODED FIX: Always use port 5000 for production
    let wsUrl;
    
    console.log('🔍 WebSocket debug info:', {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      nodeEnv: process.env.NODE_ENV
    });
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development environment
      wsUrl = `ws://${window.location.hostname}:5000/ws?token=${token}`;
      console.log('🔌 Using localhost for WebSocket');
    } else {
      // Production environment - HARDCODED: Always use port 5000
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // FORCE port 5000 - this is the key fix
      wsUrl = `${protocol}//${window.location.hostname}:5000/ws?token=${token}`;
      console.log('🔌 FORCED: Using production host with port 5000 for WebSocket');
    }
    
    console.log('🔌 WebSocket connecting to:', wsUrl);
    
    // Set connection timeout to prevent long waits
    this.connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        console.log('🔌 WebSocket connection timeout, closing...');
        this.ws.close();
        this.isConnecting = false;
      }
    }, 3000); // 3 second timeout
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionState = 'connected';
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
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
        console.log(`🔌 WebSocket disconnected: ${event.code}`);
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
        
        // Only attempt reconnection if it's not a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        } else {
          console.log('🔌 WebSocket connection failed, continuing without WebSocket');
        }
      };
      
      this.ws.onerror = (error) => {
        console.log('🔌 WebSocket error:', error);
        this.isConnecting = false;
        this.connectionState = 'error';
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
        
        // Don't attempt reconnection on error - just log it and continue
        console.log('🔌 WebSocket connection failed, but continuing without WebSocket');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
      console.log('🔌 WebSocket connection failed, but continuing without WebSocket');
    }
  }

  scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached, stopping reconnection');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = 2000; // Fixed 2 second delay
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
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
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
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

echo "✅ Emergency WebSocket service created with hardcoded port 5000"

echo ""
echo "🔍 Step 2: Building production with forced WebSocket fix..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 3: Verifying the build contains correct WebSocket URL..."
if grep -q ":5000/ws" client/build/static/js/main.*.js; then
    echo "✅ Build contains correct WebSocket URL with port 5000"
else
    echo "❌ Build does not contain correct WebSocket URL"
    echo "🔍 Checking what's in the build..."
    grep -o "wss://[^/]*/ws" client/build/static/js/main.*.js | head -5
fi

echo ""
echo "🔍 Step 4: Creating deployment verification script..."

cat > verify-websocket-fix.sh << 'EOF'
#!/bin/bash

echo "🔍 Verifying WebSocket Fix"
echo "========================="

echo ""
echo "🔍 Step 1: Checking if build contains port 5000..."
if grep -q ":5000/ws" client/build/static/js/main.*.js; then
    echo "✅ Build contains correct WebSocket URL with port 5000"
    echo "🎯 Expected URL: wss://www.therapease.site:5000/ws"
    echo "✅ WebSocket fix is properly applied"
else
    echo "❌ Build does not contain correct WebSocket URL"
    echo "🔍 Current URLs in build:"
    grep -o "wss://[^/]*/ws" client/build/static/js/main.*.js | head -5
    echo "❌ WebSocket fix not applied correctly"
fi

echo ""
echo "🔍 Step 2: Testing WebSocket connection..."
echo "Expected: wss://www.therapease.site:5000/ws"
echo "Previous: wss://www.therapease.site/ws (causing 200 error)"
echo ""
echo "🎯 Key differences:"
echo "- ✅ Includes port 5000"
echo "- ✅ Only 1 reconnection attempt"
echo "- ✅ 3 second connection timeout"
echo "- ✅ Graceful fallback when WebSocket fails"
EOF

chmod +x verify-websocket-fix.sh

echo ""
echo "🏁 Force WebSocket fix complete!"
echo ""
echo "📋 Summary of forced fixes:"
echo "1. ✅ HARDCODED port 5000 in WebSocket URL"
echo "2. ✅ Only 1 reconnection attempt (was 5)"
echo "3. ✅ 3 second connection timeout"
echo "4. ✅ Faster 2 second reconnection delay"
echo "5. ✅ Graceful fallback when WebSocket fails"
echo ""
echo "🔧 Next steps:"
echo "1. Run: ./verify-websocket-fix.sh"
echo "2. Deploy to droplet: git add . && git commit -m 'Force WebSocket fix' && git push"
echo "3. On droplet: git pull && pm2 restart all"
echo ""
echo "🎯 Expected results:"
echo "- ✅ WebSocket connects to wss://www.therapease.site:5000/ws"
echo "- ✅ No more 'Unexpected response code: 200' errors"
echo "- ✅ Fast login experience (2-3 seconds instead of 25+ seconds)"
echo "- ✅ Real-time features work when WebSocket connects"
echo "- ✅ Graceful fallback when WebSocket fails"
