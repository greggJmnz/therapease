import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, Calendar, Users, FileText, TrendingUp } from 'lucide-react';
import { useWebSocketEvent } from '../hooks/useWebSocket';

const RealtimeNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  // Listen for real-time notifications
  useWebSocketEvent('notification', (data) => {
    const notification = {
      id: Date.now(),
      ...data.notification,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only last 5
    setIsVisible(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  });

  // Listen for appointment changes
  useWebSocketEvent('appointment_change', (data) => {
    const { appointment, changeType } = data;
    let message = '';
    
    switch (changeType) {
      case 'created':
        message = `New appointment scheduled: ${appointment.patientName} on ${appointment.appointmentDate}`;
        break;
      case 'updated':
        message = `Appointment updated: ${appointment.patientName} on ${appointment.appointmentDate}`;
        break;
      case 'cancelled':
        message = `Appointment cancelled: ${appointment.patientName} on ${appointment.appointmentDate}`;
        break;
      default:
        message = `Appointment ${changeType}: ${appointment.patientName}`;
    }
    
    const notification = {
      id: Date.now(),
      type: 'appointment',
      title: 'Appointment Update',
      message,
      priority: 'medium',
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setIsVisible(true);
    
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  });

  // Listen for patient changes
  useWebSocketEvent('patient_change', (data) => {
    const { patient, changeType } = data;
    let message = '';
    
    switch (changeType) {
      case 'created':
        message = `New patient added: ${patient.firstName} ${patient.lastName}`;
        break;
      case 'updated':
        message = `Patient updated: ${patient.firstName} ${patient.lastName}`;
        break;
      case 'deleted':
        message = `Patient removed: ${patient.firstName} ${patient.lastName}`;
        break;
      default:
        message = `Patient ${changeType}: ${patient.firstName} ${patient.lastName}`;
    }
    
    const notification = {
      id: Date.now(),
      type: 'patient',
      title: 'Patient Update',
      message,
      priority: 'medium',
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setIsVisible(true);
    
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  });

  // Listen for daily notes changes
  useWebSocketEvent('daily_note_change', (data) => {
    const { note, changeType } = data;
    let message = '';
    
    switch (changeType) {
      case 'created':
        message = `New daily note added for session on ${note.sessionDate}`;
        break;
      case 'updated':
        message = `Daily note updated for session on ${note.sessionDate}`;
        break;
      case 'deleted':
        message = `Daily note removed for session on ${note.sessionDate}`;
        break;
      default:
        message = `Daily note ${changeType} for session on ${note.sessionDate}`;
    }
    
    const notification = {
      id: Date.now(),
      type: 'daily_note',
      title: 'Session Note Update',
      message,
      priority: 'low',
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setIsVisible(true);
    
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  });

  // Listen for progress changes
  useWebSocketEvent('progress_change', (data) => {
    const { progress, changeType } = data;
    let message = '';
    
    switch (changeType) {
      case 'created':
        message = `New progress entry added for ${progress.area}`;
        break;
      case 'updated':
        message = `Progress updated for ${progress.area}`;
        break;
      case 'deleted':
        message = `Progress entry removed for ${progress.area}`;
        break;
      default:
        message = `Progress ${changeType} for ${progress.area}`;
    }
    
    const notification = {
      id: Date.now(),
      type: 'progress',
      title: 'Progress Update',
      message,
      priority: 'low',
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    setIsVisible(true);
    
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  });

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.length === 1) {
      setIsVisible(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'patient':
        return <Users className="h-4 w-4" />;
      case 'daily_note':
        return <FileText className="h-4 w-4" />;
      case 'progress':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out ${getPriorityColor(notification.priority)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium">
                {notification.title}
              </h4>
              <p className="text-sm mt-1">
                {notification.message}
              </p>
              <p className="text-xs mt-1 opacity-75">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RealtimeNotification;
