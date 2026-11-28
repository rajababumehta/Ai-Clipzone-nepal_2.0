import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const isDevHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('ais-dev-'));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as unknown as { __deferredPwaInstallPrompt?: Event | null }).__deferredPwaInstallPrompt = e;
    try {
      localStorage.removeItem('hamrolms_pwa_installed');
    } catch {}
    window.dispatchEvent(new CustomEvent('hamrolms-pwa-prompt-ready'));
  });

  window.addEventListener('appinstalled', () => {
    (window as unknown as { __deferredPwaInstallPrompt?: Event | null }).__deferredPwaInstallPrompt = null;
    try {
      localStorage.setItem('hamrolms_pwa_installed', 'true');
    } catch {}
    window.dispatchEvent(new CustomEvent('hamrolms-pwa-installed'));
  });
}

if ('serviceWorker' in navigator) {
  const isProd = Boolean((import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD);
  if (!isProd || isDevHost) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => {
        void reg.unregister();
      });
    }).catch(() => {});
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    });
  }
}

// Prevent pinch-to-zoom, Safari gesture zoom, and Ctrl/Cmd browser zoom
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const preventGesture = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });

  document.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
