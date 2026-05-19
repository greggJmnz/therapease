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
      return;
    }

    this.isConnecting = true;
    this.lastToken = token;
    
    // Dynamic WebSocket URL construction
    let wsUrl;
    
    // Determine if we're in development or production
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.startsWith('192.168.') ||
                          window.location.hostname.startsWith('10.') ||
                          window.location.hostname.startsWith('172.');
    
    if (isDevelopment) {
      // Development environment - connect directly to Node.js on port 5000
      wsUrl = `ws://${window.location.hostname}:5000/ws?token=${token}`;
      console.log('🔌 Development WebSocket URL:', wsUrl);
    } else {
      // Production environment - Use same domain (Nginx will proxy to Node.js)
      // CRITICAL: Do NOT use port 5000 in production - Nginx proxies /ws to Node.js
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Use the same hostname (therapease.site or www.therapease.site)
      // Nginx will proxy /ws requests to the Node.js server
      // This avoids CORS issues and works with both domains
      // IMPORTANT: Never use port 5000 in production - it won't work through Nginx
      const hostname = window.location.hostname;
      
      // Ensure we never add port 5000 in production
      if (hostname.includes(':5000')) {
        console.error('❌ ERROR: Hostname contains port 5000! This should never happen in production.');
        // Remove port 5000 if somehow present
        wsUrl = `${protocol}//${hostname.replace(':5000', '')}/ws?token=${token}`;
      } else {
        wsUrl = `${protocol}//${hostname}/ws?token=${token}`;
      }
      
      // Debug logging
      console.log('🔌 Production WebSocket debug info:', {
        hostname: hostname,
        protocol: window.location.protocol,
        nodeEnv: import.meta.env.MODE,
        wsUrl: wsUrl,
        isDevelopment: false
      });
    }
    
    // IMPORTANT: Log the final WebSocket URL to verify it's correct
    console.log('🔌 WebSocket connecting to:', wsUrl);
    
    // CRITICAL: Verify URL doesn't contain port 5000 in production
    // This is a safety check to prevent connection failures
    const isProduction = !isDevelopment;
    if (isProduction && wsUrl.includes(':5000')) {
      console.error('❌ CRITICAL ERROR: WebSocket URL contains port 5000 in production!');
      console.error('   This will cause connection failures because Nginx proxies /ws, not :5000/ws');
      console.error('   Expected URL format: wss://therapease.site/ws?token=...');
      console.error('   Actual URL:', wsUrl);
      console.error('   Fix: Rebuild the client with the latest code');
      
      // Prevent connection with wrong URL
      this.isConnecting = false;
      return;
    }
    
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
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
        
        // Only attempt reconnection if it's not a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };
      
      this.ws.onerror = (error) => {
        this.isConnecting = false;
        this.connectionState = 'error';
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }
    }
  }

  scheduleReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = 2000; // Fixed 2 second delay
    
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
    const { type } = data || {};
    const messageData = data?.data ?? data?.payload ?? data;
    
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type);
      callbacks.forEach(callback => {
        try {
          callback(messageData);
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

  // Configuration method for different environments
  configure(options = {}) {
    if (options.maxReconnectAttempts !== undefined) {
      this.maxReconnectAttempts = options.maxReconnectAttempts;
    }
    if (options.reconnectInterval !== undefined) {
      this.reconnectInterval = options.reconnectInterval;
    }
  }

  // Method to get connection status
  getConnectionStatus() {
    return {
      connected: this.ws && this.ws.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

const websocketService = new WebSocketService();
export default websocketService;
