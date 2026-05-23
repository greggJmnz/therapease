// Push Notification Service for TherapEase
// Handles browser push notifications, service worker registration, and notification management

import { getApiBaseUrl } from '../utils/apiUrl';

class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    // Safely check if Notification API is available before accessing it
    this.isSupported = typeof window !== 'undefined' && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
    // Safely get notification permission - check if Notification API exists first
    this.permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    this.baseURL = getApiBaseUrl();
  }

  // Initialize push notifications
  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker with error handling for iOS Safari
      // iOS Safari has limited service worker support, so we handle errors gracefully
      // IMPORTANT: Service worker registration must not block app initialization
      try {
        // Check if service workers are supported before attempting registration
        if (!('serviceWorker' in navigator)) {
          console.warn('Service workers are not supported in this browser');
          return false;
        }

        // Attempt to register service worker (non-blocking for iOS)
        this.registration = await navigator.serviceWorker.register('/sw.js');
        
        // Wait for service worker to be ready (with timeout for iOS)
        // Use Promise.race to prevent hanging on iOS Safari
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker ready timeout')), 5000))
        ]);
      } catch (swError) {
        // iOS Safari may have service worker limitations or CSP restrictions
        // Log but don't fail completely - app should still work without push notifications
        console.warn('Service worker registration issue (may be iOS Safari limitation or CSP restriction):', swError.message);
        // Clear registration to prevent retry attempts
        this.registration = null;
        // Return false but don't throw - app functionality should still work
        return false;
      }

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
    // Check if Notification API is available
    if (typeof Notification === 'undefined') {
      console.warn('Notification API is not available');
      return false;
    }

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
    // Ensure service worker is registered before subscribing
    if (!this.registration) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        
        // Wait for service worker to be ready (with timeout for iOS)
        try {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker ready timeout')), 5000))
          ]);
        } catch (readyError) {
          console.warn('Service worker ready timeout (iOS Safari may have limitations):', readyError.message);
          // Continue if registration exists
          if (!this.registration) {
            throw new Error('Service Worker registration failed');
          }
        }
      } catch (error) {
        console.error('Failed to register service worker:', error);
        throw new Error('Service Worker registration failed: ' + error.message);
      }
    }

    try {
      const vapidPublicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
      if (!vapidPublicKey) {
        throw new Error('Missing VITE_VAPID_PUBLIC_KEY for push subscription');
      }

      const desiredApplicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);
      const existingSubscription = await this.registration.pushManager.getSubscription();

      if (existingSubscription) {
        const existingKey = existingSubscription.options?.applicationServerKey
          ? new Uint8Array(existingSubscription.options.applicationServerKey)
          : null;
        const isSameVapidKey = existingKey && this.uint8ArrayToBase64Url(existingKey) === this.uint8ArrayToBase64Url(desiredApplicationServerKey);

        if (isSameVapidKey) {
          this.subscription = existingSubscription;
          await this.sendSubscriptionToServer(existingSubscription);
          return existingSubscription;
        }

        // Existing subscription was created with different VAPID keys; rotate it.
        await existingSubscription.unsubscribe();
        await this.sendUnsubscriptionToServer();
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: desiredApplicationServerKey
      });

      this.subscription = subscription;
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  uint8ArrayToBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }

    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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

    } catch (error) {
      console.error('Failed to send unsubscription to server:', error);
    }
  }

  // Show local notification
  async showNotification(title, options = {}) {
    // Ensure service worker is registered and ready
    if (!this.registration) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        
        // Wait for service worker to be ready (with timeout for iOS)
        try {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker ready timeout')), 5000))
          ]);
        } catch (readyError) {
          console.warn('Service worker ready timeout for notification (iOS Safari may have limitations):', readyError.message);
          // Continue if registration exists
          if (!this.registration) {
            return false;
          }
        }
      } catch (error) {
        console.error('Failed to register service worker for notification:', error);
        throw new Error('Service Worker registration failed: ' + error.message);
      }
    }

    // Ensure service worker is ready
    try {
      await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Service worker not ready:', error);
      throw new Error('Service Worker not ready');
    }

    // Check notification permission
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
        const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unavailable';
        throw new Error('Notification permission not granted. Current permission: ' + currentPermission);
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
    } catch (error) {
      console.error('Failed to update Service Worker:', error);
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
