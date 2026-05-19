// TherapEase Service Worker for Push Notifications
// This service worker handles push notifications, background sync, and offline functionality

// IMPORTANT: Increment version to force cache clear on deployment
const CACHE_NAME = 'therapease-v5';
const NOTIFICATION_ICON = '/favicon.svg';
const NOTIFICATION_BADGE = '/favicon.svg';

// Install event - cache essential resources (BUT NOT index.html)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // DO NOT cache index.html - it must always be fetched fresh
        // Only cache static assets that have content hashes
        // Note: JS/CSS assets with hashes are cached automatically via fetch handler
        return cache.addAll([
          '/favicon.svg',
          '/manifest.json'
        ]);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
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
      // Try to parse as JSON first
      try {
        const pushData = event.data.json();
        
        if (pushData && typeof pushData === 'object' && Object.keys(pushData).length > 0) {
          notificationData = {
            ...notificationData,
            ...pushData,
            data: {
              ...notificationData.data,
              ...(pushData.data || {})
            }
          };
        }
      } catch (jsonError) {
        // Try as text if JSON parsing fails
        try {
          const textData = event.data.text();
          if (textData && textData.trim().length > 0) {
            notificationData.body = textData;
          }
        } catch (textError) {
          // Silently fail and use default notification
        }
      }
    } catch (error) {
      // Silently fail and use default notification
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .catch((error) => {
        console.error('Failed to show notification:', error);
      })
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
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
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
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

  const url = new URL(event.request.url);
  
  // CRITICAL: Never cache index.html - always fetch fresh from network
  // This ensures users always get the latest chunk references
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Return fresh index.html, don't cache it
          return response;
        })
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For all other requests (assets with hashes), use cache-first strategy
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

            // Cache the response (assets with hashes are safe to cache)
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests (but not index.html)
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
  } catch (error) {
    console.error('Notification sync failed:', error);
  }
}

async function cacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
  } catch (error) {
    console.error('Failed to cache URLs:', error);
  }
}

async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

async function getStoredNotifications() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removeStoredNotification(id) {
  // This would typically use IndexedDB
  // For now, just a placeholder
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

