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
      wsUrl = `ws://${window.location.hostname}:5000/ws?token=${token}`;
      console.log('🔌 Using localhost for WebSocket');
    } else {
      // Production environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.hostname}/ws?token=${token}`;
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
        console.log(`🔌 WebSocket disconnected: ${event.code}`);
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
