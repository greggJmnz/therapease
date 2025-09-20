import { useState, useEffect, useCallback } from 'react';
import pushNotificationService from '../services/pushNotificationService';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize push notifications
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await pushNotificationService.initialize();
      if (success) {
        setIsSupported(true);
        setIsEnabled(true);
        setPermission(pushNotificationService.getPermissionStatus());
        console.log('✅ Push notifications initialized successfully');
      } else {
        setIsSupported(pushNotificationService.isSupported);
        setIsEnabled(false);
        setPermission(pushNotificationService.getPermissionStatus());
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to initialize push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const hasPermission = await pushNotificationService.requestPermission();
      setPermission(pushNotificationService.getPermissionStatus());
      setIsEnabled(hasPermission);
      return hasPermission;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushNotificationService.subscribe();
      setIsEnabled(true);
      console.log('✅ Subscribed to push notifications');
    } catch (err) {
      setError(err.message);
      console.error('Failed to subscribe to push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushNotificationService.unsubscribe();
      setIsEnabled(false);
      console.log('✅ Unsubscribed from push notifications');
    } catch (err) {
      setError(err.message);
      console.error('Failed to unsubscribe from push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Show local notification
  const showNotification = useCallback(async (title, options = {}) => {
    try {
      await pushNotificationService.showNotification(title, options);
    } catch (err) {
      setError(err.message);
      console.error('Failed to show notification:', err);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    setIsSupported(pushNotificationService.isSupported);
    setPermission(pushNotificationService.getPermissionStatus());
    setIsEnabled(pushNotificationService.isEnabled());

    // Auto-initialize if permission is already granted
    if (pushNotificationService.getPermissionStatus() === 'granted') {
      initialize();
    }
  }, [initialize]);

  return {
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
  };
};

export default usePushNotifications;
