// Simple service worker for TherapEase public website
self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
});

self.addEventListener('fetch', function(event) {
  // Simple pass-through for now
  event.respondWith(fetch(event.request));
});
