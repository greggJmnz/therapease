const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId to WebSocket connections
    this.rooms = new Map(); // Map of room names to Set of client IDs
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    const logger = require('../utils/logger');
    logger.info('WebSocket service initialized');
  }

  verifyClient(info) {
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return false;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      return true;
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('WebSocket token verification failed:', error.message);
      return false;
    }
  }

  handleConnection(ws, req) {
    const user = req.user;
    const userId = user.userId;
    const userRole = user.role;

    // Store client connection
    this.clients.set(userId, {
      ws,
      user,
      lastPing: Date.now()
    });

    // Join role-based rooms
    this.joinRoom(userId, `role_${userRole}`);
    this.joinRoom(userId, `user_${userId}`);

    // Send connection confirmation
    this.sendToUser(userId, {
      type: 'connection_established',
      data: { userId, role: userRole, timestamp: new Date().toISOString() }
    });

    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(userId, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.clients.delete(userId);
      this.leaveAllRooms(userId);
    });

    // Handle ping/pong for connection health
    ws.on('pong', () => {
      const client = this.clients.get(userId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    // Send ping every 30 seconds
    const pingInterval = setInterval(() => {
      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      } else {
        clearInterval(pingInterval);
        this.clients.delete(userId);
      }
    }, 30000);
  }

  handleMessage(userId, data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'join_room':
        this.joinRoom(userId, payload.room);
        break;
      case 'leave_room':
        this.leaveRoom(userId, payload.room);
        break;
      case 'subscribe_patient':
        this.joinRoom(userId, `patient_${payload.patientId}`);
        break;
      case 'unsubscribe_patient':
        this.leaveRoom(userId, `patient_${payload.patientId}`);
        break;
      default:
        // Unknown message type - ignore silently
    }
  }

  joinRoom(userId, roomName) {
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(userId);
  }

  leaveRoom(userId, roomName) {
    if (this.rooms.has(roomName)) {
      this.rooms.get(roomName).delete(userId);
      if (this.rooms.get(roomName).size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  leaveAllRooms(userId) {
    for (const [roomName, users] of this.rooms.entries()) {
      users.delete(userId);
      if (users.size === 0) {
        this.rooms.delete(roomName);
      }
    }
  }

  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  sendToRoom(roomName, message) {
    const users = this.rooms.get(roomName);
    if (!users) return 0;

    let sentCount = 0;
    for (const userId of users) {
      if (this.sendToUser(userId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  // Broadcast appointment changes
  broadcastAppointmentChange(appointment, changeType) {
    const message = {
      type: 'appointment_change',
      data: {
        appointment,
        changeType, // 'created', 'updated', 'cancelled'
        timestamp: new Date().toISOString()
      }
    };

    // Send to admin role
    this.sendToRoom('role_admin', message);
    
    // Send to therapist
    this.sendToRoom(`user_${appointment.therapistId}`, message);
    
    // Send to patient (use patientUserId if available, otherwise fallback to patientId)
    const patientUserId = appointment.patientUserId || appointment.patientId;
    this.sendToRoom(`user_${patientUserId}`, message);
    
    // Send to patient-specific room
    this.sendToRoom(`patient_${appointment.patientId}`, message);
    
  }

  // Broadcast patient record changes
  broadcastPatientChange(patient, changeType) {
    const message = {
      type: 'patient_change',
      data: {
        patient,
        changeType, // 'created', 'updated', 'deleted'
        timestamp: new Date().toISOString()
      }
    };

    // Send to admin role
    this.sendToRoom('role_admin', message);
    
    // Send to therapist
    this.sendToRoom(`user_${patient.therapistId}`, message);
    
    // Send to patient
    this.sendToRoom(`user_${patient.userId}`, message);
    
    // Send to patient-specific room
    this.sendToRoom(`patient_${patient.id}`, message);
  }

  // Broadcast daily notes changes
  broadcastDailyNoteChange(note, changeType) {
    const message = {
      type: 'daily_note_change',
      data: {
        note,
        changeType, // 'created', 'updated', 'deleted'
        timestamp: new Date().toISOString()
      }
    };

    // Send to admin role
    this.sendToRoom('role_admin', message);
    
    // Send to therapist
    this.sendToRoom(`user_${note.therapistId}`, message);
    
    // Send to patient (if patientUserId is available)
    if (note.patientUserId) {
      this.sendToRoom(`user_${note.patientUserId}`, message);
    }
    
    // Send to patient-specific room
    this.sendToRoom(`patient_${note.patientId}`, message);
  }

  // Broadcast progress tracking changes
  broadcastProgressChange(progress, changeType) {
    const message = {
      type: 'progress_change',
      data: {
        progress,
        changeType, // 'created', 'updated', 'deleted'
        timestamp: new Date().toISOString()
      }
    };

    // Send to therapist
    this.sendToRoom(`user_${progress.therapistId}`, message);
    
    // Send to patient
    this.sendToRoom(`user_${progress.patientId}`, message);
    
    // Send to patient-specific room
    this.sendToRoom(`patient_${progress.patientId}`, message);
  }

  // Broadcast notification
  broadcastNotification(notification) {
    const message = {
      type: 'notification',
      data: {
        notification,
        timestamp: new Date().toISOString()
      }
    };

    // Send to specific user
    this.sendToUser(notification.userId, message);
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: this.clients.size,
      totalRooms: this.rooms.size,
      connectionsByRole: this.getConnectionsByRole(),
      activeRooms: Array.from(this.rooms.keys())
    };
  }

  getConnectionsByRole() {
    const roleCounts = {};
    for (const client of this.clients.values()) {
      const role = client.user.role;
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    return roleCounts;
  }

  // Broadcast to all admin users
  broadcastToAdmins(event) {
    this.sendToRoom('role_admin', event);
  }

  // Broadcast to all connected clients
  broadcastToAll(event) {
    let sentCount = 0;
    for (const [userId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(event));
        sentCount++;
      }
    }
    return sentCount;
  }

  // Broadcast profile change
  broadcastProfileChange(userId, userRole, profileData, action) {
    const event = {
      type: 'profile_change',
      action,
      data: {
        userId,
        userRole,
        profile: profileData
      },
      timestamp: new Date().toISOString()
    };

    // Send to the user whose profile was updated
    this.sendToUser(userId, event);

    // Send to admins for all profile changes
    this.broadcastToAdmins(event);

    // Send to therapist if patient profile was updated
    if (userRole === 'patient' && profileData.therapistId) {
      this.sendToUser(profileData.therapistId, event);
    }

  }

  // Broadcast settings change
  broadcastSettingsChange(userId, userRole, settingsData, action) {
    const event = {
      type: 'settings_change',
      action,
      data: {
        userId,
        userRole,
        settings: settingsData
      },
      timestamp: new Date().toISOString()
    };

    // Send to the user whose settings were updated
    this.sendToUser(userId, event);

    // Send to admins for all settings changes
    this.broadcastToAdmins(event);

  }

  // Broadcast system settings change
  broadcastSystemSettingsChange(settingsData) {
    const event = {
      type: 'system_settings_change',
      data: {
        settings: settingsData
      },
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients
    this.broadcastToAll(event);

  }

  // Broadcast session change
  broadcastSessionChange(session, changeType) {
    const message = {
      type: 'session_change',
      data: {
        session,
        changeType, // 'created', 'updated', 'cancelled'
        timestamp: new Date().toISOString()
      }
    };

    // Send to therapist
    this.sendToUser(session.therapistId, message);

    // Send to patient
    this.sendToUser(session.patientId, message);

    // Send to admins
    this.broadcastToAdmins(message);

  }

  // Broadcast home exercise change
  broadcastHomeExerciseChange(exercise, changeType) {
    const message = {
      type: 'home_exercise_change',
      data: {
        exercise,
        changeType, // 'created', 'updated', 'deleted', 'assigned'
        timestamp: new Date().toISOString()
      }
    };

    // Send to therapist
    this.sendToUser(exercise.therapistId, message);

    // Send to patient
    this.sendToUser(exercise.patientUserId, message);

    // Send to patient-specific room
    this.sendToRoom(`patient_${exercise.patientId}`, message);

  }

  // Broadcast proof submission change
  broadcastProofChange(proof, changeType) {
    const message = {
      type: 'proof_change',
      data: {
        proof,
        changeType, // 'submitted', 'reviewed', 'approved', 'needs_revision'
        timestamp: new Date().toISOString()
      }
    };

    // Send to therapist
    this.sendToUser(proof.therapistId, message);

    // Send to patient
    this.sendToUser(proof.patientUserId, message);

    // Send to patient-specific room
    this.sendToRoom(`patient_${proof.patientId}`, message);

  }
}

module.exports = new WebSocketService();
