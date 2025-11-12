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
      return;
    }

    // Wait a bit after login to ensure everything is loaded
    // Use a longer delay for iOS Safari to ensure app is fully rendered first
    const timer = setTimeout(async () => {
      try {
        // Double-check that service workers are supported before attempting
        if (!('serviceWorker' in navigator)) {
          return;
        }

        // Check current permission status
        const currentPermission = Notification.permission;
        
        if (currentPermission === 'default') {
          // Permission not set yet - request it automatically
          // This is non-blocking - app will continue even if it fails
          const hasPermission = await pushNotificationService.requestPermission();
          
          if (hasPermission) {
            // Permission granted - initialize push notifications
            // This is also non-blocking - errors are caught and logged
            await pushNotificationService.initialize();
          }
        } else if (currentPermission === 'granted') {
          // Permission already granted - initialize if not already done
          if (!pushNotificationService.isEnabled()) {
            // Non-blocking initialization
            await pushNotificationService.initialize();
          }
        }
      } catch (error) {
        // Silently handle errors - push notifications are optional
        // Don't let push notification errors break the app
        console.error('Failed to auto-initialize push notifications (non-critical):', error);
      }
    }, 3000); // Wait 3 seconds after login (increased from 2s for iOS stability)

    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  // This component doesn't render anything
  return null;
};

export default AutoPushNotificationInitializer;

