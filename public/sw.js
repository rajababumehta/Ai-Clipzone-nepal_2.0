// AI Clipzone Nepal - Advanced PWA Service Worker
const CACHE_NAME = 'aiclipzone-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg',
  '/apple-touch-icon.svg',
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
