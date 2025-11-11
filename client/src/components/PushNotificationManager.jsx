import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useWebSocketEvent } from '../hooks/useWebSocket';
import ModernButton from './ModernButton';
import NotificationSettings from './NotificationSettings';

const PushNotificationManager = () => {
  const {
    isSupported,
    isEnabled,
    permission,
    isLoading,
    error,
    initialize,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Listen for real-time notifications via WebSocket
  useWebSocketEvent('notification', (data) => {
    const notification = {
      id: Date.now(),
      ...data.notification,
      timestamp: new Date().toISOString()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    
    // Show push notification if enabled
    if (isEnabled) {
      showNotification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: `notification-${notification.id}`,
        data: {
          url: '/notifications',
          notificationId: notification.id
        }
      });
    }
  });

  // Auto-initialize on mount
  useEffect(() => {
    if (isSupported && permission === 'granted' && !isEnabled) {
      initialize();
    }
  }, [isSupported, permission, isEnabled, initialize]);

  const handleToggleNotifications = async () => {
    if (isEnabled) {
      await unsubscribe();
    } else {
      if (permission === 'denied') {
        alert('Notification permission is denied. Please enable it in your browser settings.');
        return;
      }
      
      if (permission === 'default') {
        const hasPermission = await requestPermission();
        if (hasPermission) {
          // Use initialize to ensure service worker is registered before subscribing
          await initialize();
        }
      } else if (permission === 'granted') {
        // Use initialize to ensure service worker is registered before subscribing
        await initialize();
      }
    }
  };

  const handleTestNotification = async () => {
    await showNotification('Test Notification', {
      body: 'This is a test notification from TherapEase!',
      icon: '/favicon.ico',
      tag: 'test-notification'
    });
  };

  const getStatusIcon = () => {
    if (isLoading) return Loader2;
    if (isEnabled) return CheckCircle;
    if (permission === 'denied') return AlertCircle;
    return BellOff;
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-500';
    if (isEnabled) return 'text-green-500';
    if (permission === 'denied') return 'text-red-500';
    return 'text-gray-500';
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleNotifications}
          disabled={isLoading || !isSupported}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isEnabled 
              ? 'bg-green-100 hover:bg-green-200 text-green-600' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          } ${isLoading ? 'animate-pulse' : ''}`}
          title={
            !isSupported ? 'Push notifications not supported' :
            isEnabled ? 'Disable notifications' :
            'Enable notifications'
          }
        >
          <StatusIcon className={`h-5 w-5 ${getStatusColor()} ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all duration-200"
          title="Notification settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {isEnabled && (
          <button
            onClick={handleTestNotification}
            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-all duration-200"
            title="Test notification"
          >
            Test
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-0 z-50">
          <NotificationSettings onClose={() => setShowSettings(false)} />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-12 right-0 z-50 bg-red-50 border border-red-200 rounded-lg p-3 max-w-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="absolute top-12 right-0 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Recent Notifications</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className="p-2 bg-gray-50 rounded-lg text-xs"
              >
                <div className="font-medium text-gray-900">{notification.title}</div>
                <div className="text-gray-600 mt-1">{notification.message}</div>
                <div className="text-gray-400 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationManager;
