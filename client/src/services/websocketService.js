class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced from 5 to 3
    this.reconnectInterval = 5000;
    this.listeners = new Map();
    this.isConnecting = false;
    this.lastToken = null; // Store last token to prevent auth loops
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
    
    // Always use the current host for WebSocket connections
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    console.log('🔌 Using current host for WebSocket');
    
    console.log('🔌 WebSocket connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.emit('connection', { status: 'disconnected' });
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };

      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error);
        this.isConnecting = false;
        this.emit('connection', { status: 'error', error });
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
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
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
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  handleMessage(data) {
    const { type, data: payload } = data;
    
    // Emit specific event types
    this.emit(type, payload);
    
    // Emit generic message event
    this.emit('message', data);
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Convenience methods for common operations
  joinRoom(roomName) {
    this.send({
      type: 'join_room',
      payload: { room: roomName }
    });
  }

  leaveRoom(roomName) {
    this.send({
      type: 'leave_room',
      payload: { room: roomName }
    });
  }

  subscribeToPatient(patientId) {
    this.send({
      type: 'subscribe_patient',
      payload: { patientId }
    });
  }

  unsubscribeFromPatient(patientId) {
    this.send({
      type: 'unsubscribe_patient',
      payload: { patientId }
    });
  }

  // Check connection status
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
