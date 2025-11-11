// Auto-initialize push notifications after login (hidden component)
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import pushNotificationService from '../services/pushNotificationService';

const AutoPushNotificationInitializer = () => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Only initialize if user is authenticated and push notifications are supported
    if (!isAuthenticated || !user) {
      return;
    }

    // Check if push notifications are supported
    if (!pushNotificationService.isSupported) {
      console.log('Push notifications not supported in this browser');
      return;
    }

    // Wait a bit after login to ensure everything is loaded
    const timer = setTimeout(async () => {
      try {
        // Check current permission status
        const currentPermission = Notification.permission;
        
        if (currentPermission === 'default') {
          // Permission not set yet - request it automatically
          console.log('Requesting push notification permission...');
          const hasPermission = await pushNotificationService.requestPermission();
          
          if (hasPermission) {
            // Permission granted - initialize push notifications
            console.log('Permission granted, initializing push notifications...');
            await pushNotificationService.initialize();
          } else {
            console.log('Permission denied by user');
          }
        } else if (currentPermission === 'granted') {
          // Permission already granted - initialize if not already done
          if (!pushNotificationService.isEnabled()) {
            console.log('Permission already granted, initializing push notifications...');
            await pushNotificationService.initialize();
          }
        } else {
          // Permission denied - don't try to initialize
          console.log('Push notification permission denied');
        }
      } catch (error) {
        console.error('Failed to auto-initialize push notifications:', error);
      }
    }, 2000); // Wait 2 seconds after login

    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  // This component doesn't render anything
  return null;
};

export default AutoPushNotificationInitializer;

