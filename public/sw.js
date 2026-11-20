// HamroLms - High-Speed PWA Service Worker
const CACHE_NAME = 'hamrolms-pwa-v38';
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.png',
  '/institute-logo.png',
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

// 1. Install Event: Pre-cache static icon/manifest assets & activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// 2. Activate Event: Clean ALL old cache versions & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Network-First for HTML & non-hashed code so app updates always appear immediately
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('ais-dev-')) return;
  if (url.pathname.startsWith('/api/')) return;
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts')
  ) {
    return;
  }
  if (url.pathname.endsWith('sw.js') || url.pathname.endsWith('firebase-messaging-sw.js')) return;

  // A. HTML Page Navigation requests (Network-First so new builds never get stuck on old HTML)
  const isNavigation =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request, { cache: 'no-store' });
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cached = (await cache.match(event.request)) || (await cache.match('/')) || (await cache.match('/index.html'));
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // B. Hashed Vite Code & Style Assets (/assets/*.js, /assets/*.css) - Cache-First; unhashed JS/CSS - Network-First
  const isHashedAsset = url.pathname.startsWith('/assets/') && /-[a-zA-Z0-9_-]{6,}\.(js|css)$/.test(url.pathname);
  const isScriptOrStyle =
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.startsWith('/assets/');

  if (isScriptOrStyle) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        if (isHashedAsset) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cached = await cache.match(event.request);
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // C. Other Static Assets (Images, SVGs, Fonts) - Stale-while-revalidate
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
        return Response.error();
      });
    })
  );
});

// 4. Notification Click Event: Focus or open the app at the exact Live Class route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || (notifData.liveClassId ? `/?tab=live&classId=${encodeURIComponent(notifData.liveClassId)}` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.postMessage({
              type: 'OPEN_LIVE_CLASS',
              url: targetUrl,
              liveClassId: notifData.liveClassId || null,
            });
          } catch (e) {}
          if ('navigate' in client && targetUrl !== '/') {
            try {
              await client.navigate(targetUrl);
            } catch (e) {}
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 5. Push Event: Handle server push notifications (supports both custom Web Push & FCM payloads)
self.addEventListener('push', (event) => {
  let raw = {};
  if (event.data) {
    try {
      raw = event.data.json();
    } catch (e) {
      raw = { body: event.data.text() };
    }
  }

  const notifPayload = raw.notification || {};
  const dataPayload = raw.data || {};
  const title = notifPayload.title || raw.title || dataPayload.title || 'HamroLms';
  const body = notifPayload.body || raw.body || dataPayload.body || 'New update available!';
  const liveClassId = dataPayload.liveClassId || '';
  const targetUrl = dataPayload.url || raw.url || (liveClassId ? `/?tab=live&classId=${encodeURIComponent(liveClassId)}` : '/');
  const tag = dataPayload.deliveryKey || raw.tag || (liveClassId ? `live-${liveClassId}` : `hamrolms-${Date.now()}`);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: notifPayload.icon || raw.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag,
      renotify: false,
      data: {
        ...dataPayload,
        url: targetUrl,
        liveClassId,
      },
    })
  );
});
