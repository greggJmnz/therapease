// Push Notification Service for TherapEase
// Handles browser push notifications, service worker registration, and notification management

// Get API base URL (same logic as api.js)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '/api';
};

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = Notification.permission;
    this.baseURL = getApiBaseUrl();
  }

  // Initialize push notifications
  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered successfully');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker is ready');

      // Request notification permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('Notification permission denied');
        return false;
      }

      // Subscribe to push notifications
      await this.subscribe();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
      });

      this.subscription = subscription;
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      console.log('✅ Push subscription successful');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.subscription) {
      return;
    }

    try {
      const result = await this.subscription.unsubscribe();
      this.subscription = null;
      
      // Notify server about unsubscription
      await this.sendUnsubscriptionToServer();
      
      console.log('✅ Push unsubscription successful');
      return result;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${this.baseURL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subscription: subscription,
          userAgent: navigator.userAgent,
          endpoint: subscription.endpoint
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      console.log('✅ Subscription sent to server');
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  // Send unsubscription to server
  async sendUnsubscriptionToServer() {
    try {
      await fetch(`${this.baseURL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('✅ Unsubscription sent to server');
    } catch (error) {
      console.error('Failed to send unsubscription to server:', error);
    }
  }

  // Show local notification
  async showNotification(title, options = {}) {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    const defaultOptions = {
      body: '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'therapease-notification',
      requireInteraction: false,
      silent: false,
      data: {
        url: '/notifications',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png'
        }
      ]
    };

    const notificationOptions = { ...defaultOptions, ...options };

    try {
      await this.registration.showNotification(title, notificationOptions);
      console.log('✅ Local notification shown');
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  }

  // Get subscription info
  getSubscriptionInfo() {
    if (!this.subscription) {
      return null;
    }

    return {
      endpoint: this.subscription.endpoint,
      keys: this.subscription.getKey ? {
        p256dh: this.urlBase64ToUint8Array(this.subscription.getKey('p256dh')),
        auth: this.urlBase64ToUint8Array(this.subscription.getKey('auth'))
      } : null
    };
  }

  // Check if notifications are supported and enabled
  isEnabled() {
    return this.isSupported && this.permission === 'granted' && this.subscription !== null;
  }

  // Get permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Listen for notification clicks
  setupNotificationClickHandler() {
    if (!this.registration) {
      return;
    }

    this.registration.addEventListener('notificationclick', (event) => {
      console.log('Notification clicked:', event);
      
      event.notification.close();

      const action = event.action;
      const notificationData = event.notification.data || {};

      if (action === 'dismiss') {
        return;
      }

      // Handle notification click
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
              if (client.url.includes(notificationData.url || '/notifications') && 'focus' in client) {
                client.focus();
                return client.navigate(notificationData.url || '/notifications');
              }
            }

            // Open new window if none exists
            if (clients.openWindow) {
              const targetUrl = notificationData.url || '/notifications';
              return clients.openWindow(targetUrl);
            }
          })
      );
    });
  }

  // Update service worker
  async updateServiceWorker() {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
      console.log('✅ Service Worker updated');
    } catch (error) {
      console.error('Failed to update Service Worker:', error);
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
