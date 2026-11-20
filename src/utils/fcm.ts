import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';
import { registerFcmTokenBackend } from './liveClassApi';
import { showNativeNotification } from './notifications';

const DELIVERED_KEYS_STORAGE = 'clipzone_fcm_seen_keys';
let foregroundListenerAttached = false;

function markDeliverySeen(deliveryKey?: string): boolean {
  if (!deliveryKey) return false;
  try {
    const raw = localStorage.getItem(DELIVERED_KEYS_STORAGE);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list.includes(deliveryKey)) {
      return true;
    }
    const next = [deliveryKey, ...list].slice(0, 60);
    localStorage.setItem(DELIVERED_KEYS_STORAGE, JSON.stringify(next));
    return false;
  } catch {
    return false;
  }
}

export function getFirebaseVapidKey(): string {
  return (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || '';
}

export async function registerFcmPushToken(options: {
  deviceId: string;
  onForegroundLiveNotification?: (payload: {
    title: string;
    body: string;
    url?: string;
    liveClassId?: string;
    deliveryKey?: string;
  }) => void;
}): Promise<{ status: 'registered' | 'permission_denied' | 'missing_vapid' | 'unsupported' | 'error'; token?: string }> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return { status: 'unsupported' };
    }

    if (Notification.permission !== 'granted') {
      return { status: 'permission_denied' };
    }

    const supported = await isSupported().catch(() => false);
    if (!supported) {
      return { status: 'unsupported' };
    }

    const vapidKey = getFirebaseVapidKey();
    if (!vapidKey) {
      return { status: 'missing_vapid' };
    }

    // Register dedicated FCM worker under isolated scope so it never conflicts with PWA /sw.js
    const fcmSwRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });

    const app = getApps()[0] || initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: fcmSwRegistration,
    });

    if (!token) {
      return { status: 'error' };
    }

    // Cache token locally & send to backend where server binds verified enrolledCourseIds
    const prevToken = localStorage.getItem('clipzone_fcm_token');
    localStorage.setItem('clipzone_fcm_token', token);
    const platform =
      window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        ? 'pwa-standalone'
        : 'web';

    await registerFcmTokenBackend({
      token,
      deviceId: options.deviceId,
      platform,
    }).catch((err) => {
      if (prevToken !== token) {
        console.warn('FCM backend sync deferred:', err?.message || err);
      }
    });

    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true;
      onMessage(messaging, async (payload) => {
        const notif = payload.notification || {};
        const data = (payload.data || {}) as Record<string, string>;
        const deliveryKey = data.deliveryKey;
        if (markDeliverySeen(deliveryKey)) return;

        const title = notif.title || data.title || 'HamroLms Live Class';
        const body = notif.body || data.body || 'A live class update is available.';
        const url = data.url || (data.liveClassId ? `/?tab=live&classId=${encodeURIComponent(data.liveClassId)}` : '/?tab=live');

        await showNativeNotification({
          title,
          body,
          url,
          tag: deliveryKey || `fcm-fg-${Date.now()}`,
        });

        options.onForegroundLiveNotification?.({
          title,
          body,
          url,
          liveClassId: data.liveClassId,
          deliveryKey,
        });
      });
    }

    return { status: 'registered', token };
  } catch (err) {
    console.warn('FCM registration warning:', err);
    return { status: 'error' };
  }
}
