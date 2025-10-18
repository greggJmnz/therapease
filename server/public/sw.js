// TherapEase Service Worker for Push Notifications
// This service worker handles push notifications, background sync, and offline functionality

const CACHE_NAME = 'therapease-v1';
const NOTIFICATION_ICON = '/favicon.ico';
const NOTIFICATION_BADGE = '/favicon.ico';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential resources');
        return cache.addAll([
          '/',
          '/static/js/bundle.js',
          '/static/css/main.css',
          '/favicon.ico',
          '/manifest.json'
        ]);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('📨 Push notification received:', event);
  
  let notificationData = {
    title: 'TherapEase',
    body: 'You have a new notification',
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_BADGE,
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

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: {
          ...notificationData.data,
          ...pushData.data
        }
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
      // Use text data as body if JSON parsing fails
      notificationData.body = event.data.text();
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Default action or 'view' action
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

// Background sync event - handle offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('💬 Message received in service worker:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CACHE_URLS':
      cacheUrls(payload.urls);
      break;
    case 'CLEAR_CACHE':
      clearCache();
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Helper functions
async function syncNotifications() {
  try {
    console.log('🔄 Syncing notifications...');
    
    // Get stored notifications from IndexedDB
    const notifications = await getStoredNotifications();
    
    // Send to server
    for (const notification of notifications) {
      try {
        await fetch('/api/notifications/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notification)
        });
        
        // Remove from storage after successful sync
        await removeStoredNotification(notification.id);
      } catch (error) {
        console.error('Failed to sync notification:', error);
      }
    }
    
    console.log('✅ Notifications synced successfully');
  } catch (error) {
    console.error('❌ Notification sync failed:', error);
  }
}

async function cacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
    console.log('✅ URLs cached successfully');
  } catch (error) {
    console.error('❌ Failed to cache URLs:', error);
  }
}

async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('✅ Cache cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

async function getStoredNotifications() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removeStoredNotification(id) {
  // This would typically use IndexedDB
  // For now, just log
  console.log('Removing notification:', id);
}

// Notification permission helpers
function requestNotificationPermission() {
  return new Promise((resolve) => {
    if (!('Notification' in self)) {
      resolve(false);
      return;
    }

    if (Notification.permission === 'granted') {
      resolve(true);
      return;
    }

    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        resolve(permission === 'granted');
      });
    } else {
      resolve(false);
    }
  });
}

// Export for use in main thread
self.requestNotificationPermission = requestNotificationPermission;

console.log('🔧 TherapEase Service Worker loaded successfully');
