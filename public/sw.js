// Ai Clipzone - Advanced PWA Service Worker
const CACHE_NAME = 'aiclipzone-pwa-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg',
  '/pwa-48x48.png',
  '/pwa-72x72.png',
  '/pwa-96x96.png',
  '/pwa-128x128.png',
  '/pwa-144x144.png',
  '/pwa-152x152.png',
  '/pwa-192x192.png',
  '/pwa-256x256.png',
  '/pwa-384x384.png',
  '/pwa-512x512.png',
  '/pwa-1024x1024.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-384x384.png',
  '/pwa-maskable-512x512.png',
  '/pwa-maskable-1024x1024.png',
  '/apple-touch-icon.png',
  '/screenshots/screenshot-desktop.png',
  '/screenshots/screenshot-mobile.png',
  '/widget-template.json',
  '/robots.txt',
  '/sitemap.xml'
];

// 1. Install Event: Pre-cache static app shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching PWA App Shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some precache assets skipped:', err);
      });
    })
  );
});

// 2. Activate Event: Clean old cache versions & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-First with Cache Fallback for navigation, Cache-First for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Chrome extension or external dev requests
  if (!url.protocol.startsWith('http')) return;

  // HTML Page Navigation requests (Network-first with offline cache fallback)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/') || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Static Assets (Images, SVGs, Fonts, CSS, JS) - Cache-first with network fallback & update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to keep cache fresh
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (url.origin === location.origin || url.hostname.includes('unsplash.com'))) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[SW] Fetch failed offline:', event.request.url, err);
      });
    })
  );
});

// 4. Notification Click Event: Focus or open the app when user taps system notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing open window if available
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 5. Push Event: Handle server push notifications if configured
self.addEventListener('push', (event) => {
  let data = {
    title: 'AI Clipzone Nepal',
    body: 'New update or course discount available!',
    icon: '/pwa-192x192.png',
    data: { url: '/' }
  };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Clipzone Nepal', {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data.data || { url: '/' }
    })
  );
});
