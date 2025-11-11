import React, { useState } from 'react';
import { 
  Bell, 
  BellOff, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  MessageSquare,
  Calendar,
  FileText,
  TrendingUp,
  X
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ModernButton from './ModernButton';

const NotificationSettings = ({ onClose }) => {
  const {
    isSupported,
    isEnabled,
    permission,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications();

  const [testNotification, setTestNotification] = useState(false);

  const handleEnableNotifications = async () => {
    if (permission === 'denied') {
      alert('Notification permission is denied. Please enable it in your browser settings.');
      return;
    }

    if (permission === 'default') {
      const hasPermission = await requestPermission();
      if (hasPermission) {
        await subscribe();
      }
    } else if (permission === 'granted' && !isEnabled) {
      await subscribe();
    }
  };

  const handleDisableNotifications = async () => {
    await unsubscribe();
  };

  const handleTestNotification = async () => {
    setTestNotification(true);
    try {
      await showNotification('Test Notification', {
        body: 'This is a test notification from TherapEase!',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    } catch (error) {
      console.error('Failed to show test notification:', error);
    } finally {
      setTimeout(() => setTestNotification(false), 2000);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { status: 'success', text: 'Enabled', icon: CheckCircle };
      case 'denied':
        return { status: 'error', text: 'Denied', icon: AlertCircle };
      default:
        return { status: 'warning', text: 'Not Set', icon: AlertCircle };
    }
  };

  const permissionStatus = getPermissionStatus();
  const StatusIcon = permissionStatus.icon;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Support Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Browser Support</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isSupported ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-sm">
            {isSupported ? 'Push notifications supported' : 'Push notifications not supported'}
          </span>
        </div>
      </div>

      {/* Permission Status */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Permission Status</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          permissionStatus.status === 'success' ? 'bg-green-50 text-green-700' :
          permissionStatus.status === 'error' ? 'bg-red-50 text-red-700' :
          'bg-yellow-50 text-yellow-700'
        }`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-sm">{permissionStatus.text}</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isSupported ? (
          <div className="text-center py-4">
            <BellOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Push notifications are not supported in this browser.
            </p>
          </div>
        ) : !isEnabled ? (
          <ModernButton
            onClick={handleEnableNotifications}
            loading={isLoading}
            disabled={isLoading || permission === 'denied'}
            className="w-full"
            icon={Bell}
          >
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </ModernButton>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Notifications are enabled</span>
            </div>
            
            <div className="flex gap-2">
              <ModernButton
                onClick={handleTestNotification}
                loading={testNotification}
                disabled={testNotification}
                variant="secondary"
                className="flex-1"
                icon={testNotification ? Loader2 : Bell}
              >
                {testNotification ? 'Sending...' : 'Test Notification'}
              </ModernButton>
              
              <ModernButton
                onClick={handleDisableNotifications}
                loading={isLoading}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
                icon={BellOff}
              >
                Disable
              </ModernButton>
            </div>
          </div>
        )}
      </div>

      {/* Notification Types */}
      {isEnabled && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Types</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Appointment reminders</span>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">New assessments</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">Daily notes updates</span>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600">Progress reports</span>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Tip:</strong> You can manage notification permissions in your browser settings. 
          Look for the notification icon in your browser's address bar.
        </p>
      </div>
    </div>
  );
};

export default NotificationSettings;
