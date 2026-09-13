// Utility for managing browser and PWA push notifications

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
};

// Play a pleasant subtle chime when a notification arrives
export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Note 1 (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2 (B5 - 987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    // AudioContext blocked or not allowed until interaction
  }
};

export interface ShowNativeNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export const showNativeNotification = async (options: ShowNativeNotificationOptions): Promise<boolean> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const iconUrl = options.icon || '/pwa-192x192.png';
  const notificationTitle = options.title || 'AI Clipzone Nepal';

  // Try service worker first (best for PWA & mobile)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(notificationTitle, {
          body: options.body,
          icon: iconUrl,
          badge: '/pwa-192x192.png',
          tag: options.tag || `clipzone-notif-${Date.now()}`,
          data: {
            url: options.url || '/'
          }
        } as any);
        playNotificationChime();
        return true;
      }
    } catch (e) {
      console.warn('SW showNotification error, falling back to window.Notification:', e);
    }
  }

  // Fallback to Window Notification API
  try {
    const notif = new Notification(notificationTitle, {
      body: options.body,
      icon: iconUrl,
      tag: options.tag || `clipzone-notif-${Date.now()}`
    });
    notif.onclick = () => {
      window.focus();
      if (options.url && options.url !== '/') {
        window.location.hash = options.url.replace(/^#/, '');
      }
      notif.close();
    };
    playNotificationChime();
    return true;
  } catch (err) {
    console.warn('Window Notification error:', err);
    return false;
  }
};
