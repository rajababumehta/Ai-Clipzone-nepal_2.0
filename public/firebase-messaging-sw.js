/* eslint-disable no-undef */
// AI Clipzone - Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC4G4zxJlahwFZgds5T_7JTgWNhwbmyDEI',
  authDomain: 'gen-lang-client-0360487518.firebaseapp.com',
  projectId: 'gen-lang-client-0360487518',
  storageBucket: 'gen-lang-client-0360487518.firebasestorage.app',
  messagingSenderId: '822954278678',
  appId: '1:822954278678:web:b3d9ef02cafaae3dedda37',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'AI Clipzone Live Class';
  const body = notif.body || data.body || 'Tap to view your upcoming live session.';
  const liveClassId = data.liveClassId || '';
  const targetUrl = data.url || (liveClassId ? `/?tab=live&classId=${encodeURIComponent(liveClassId)}` : '/?tab=live');
  const tag = data.deliveryKey || (liveClassId ? `live-${liveClassId}` : `fcm-${Date.now()}`);

  self.registration.showNotification(title, {
    body,
    icon: notif.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag,
    renotify: false,
    data: {
      ...data,
      url: targetUrl,
      liveClassId,
    },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl =
    data.url ||
    (data.liveClassId ? `/?tab=live&classId=${encodeURIComponent(data.liveClassId)}` : '/?tab=live');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.postMessage({
              type: 'OPEN_LIVE_CLASS',
              url: targetUrl,
              liveClassId: data.liveClassId || null,
            });
          } catch (e) {}
          if ('navigate' in client) {
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
