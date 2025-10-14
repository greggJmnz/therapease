import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Calendar, 
  User, 
  FileText, 
  Target, 
  AlertCircle, 
  Info,
  CheckCircle
} from 'lucide-react';
import { useWebSocketEvent } from '../hooks/useWebSocket';

const RealtimeNotificationToast = () => {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  // Listen for real-time notifications
  useWebSocketEvent('notification', (data) => {
    const notification = {
      id: Date.now(),
      ...data.notification,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 2)]); // Keep only last 3
    setIsVisible(true);
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 6000);
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
    
    setNotifications(prev => [notification, ...prev.slice(0, 2)]);
    setIsVisible(true);
    
    setTimeout(() => {
      setIsVisible(false);
    }, 6000);
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
    
    setNotifications(prev => [notification, ...prev.slice(0, 2)]);
    setIsVisible(true);
    
    setTimeout(() => {
      setIsVisible(false);
    }, 6000);
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
        return <Calendar className="h-5 w-5" />;
      case 'patient':
        return <User className="h-5 w-5" />;
      case 'assessment':
        return <FileText className="h-5 w-5" />;
      case 'progress':
        return <Target className="h-5 w-5" />;
      case 'system':
        return <Info className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'patient':
        return 'bg-pink-50 border-pink-200 text-pink-800';
      case 'assessment':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'progress':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'system':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`border-l-4 ${getPriorityColor(notification.priority)} ${getTypeColor(notification.type)} rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-full`}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold">
                    {notification.title}
                  </h4>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm opacity-90 mb-2">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs opacity-75">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/50">
                    {notification.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RealtimeNotificationToast;
