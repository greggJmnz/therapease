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
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development environment
      wsUrl = `ws://${window.location.hostname}:5000/ws?token=${token}`;
    } else {
      // Production environment - Use API subdomain for WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Check if we're on therapease.site domain - use api subdomain
      if (window.location.hostname.includes('therapease.site')) {
        // Replace main domain with api subdomain
        const apiHost = window.location.hostname.replace('therapease.site', 'api.therapease.site');
        wsUrl = `${protocol}//${apiHost}/ws?token=${token}`;
      } else {
        // For other production domains, try standard ports first
        wsUrl = `${protocol}//${window.location.hostname}/ws?token=${token}`;
      }
    }
    
    // Set connection timeout to prevent long waits
    this.connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
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
