import { useCallback, useEffect, useRef, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const PWA_INSTALLED_STORAGE_KEY = 'hamrolms_pwa_installed';
const PRODUCTION_MANIFEST_ORIGIN = 'https://hamrolms.vercel.app';

export function checkIsStandaloneAppMode(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isStandaloneDisplay =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidAppReferrer =
    typeof document !== 'undefined' && document.referrer.includes('android-app://');
  const isUrlAppFlag =
    window.location.search.includes('mode=app') ||
    window.location.search.includes('app=true') ||
    window.location.search.includes('source=apk') ||
    window.location.search.includes('source=pwa') ||
    window.location.hash.includes('mode=app') ||
    window.location.hash.includes('app=true');
  const isAndroidWebView =
    ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isNativeAndroidBridge =
    (window as unknown as { Android?: unknown }).Android !== undefined ||
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView !== undefined;

  return Boolean(
    isStandaloneDisplay ||
      isIOSStandalone ||
      isAndroidAppReferrer ||
      isUrlAppFlag ||
      isAndroidWebView ||
      isNativeAndroidBridge
  );
}

function readStoredInstalledFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredInstalledFlag(installed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (installed) {
      localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(PWA_INSTALLED_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

function getGlobalDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { __deferredPwaInstallPrompt?: BeforeInstallPromptEvent | null })
      .__deferredPwaInstallPrompt || null
  );
}

function setGlobalDeferredPrompt(evt: BeforeInstallPromptEvent | null): void {
  if (typeof window === 'undefined') return;
  (
    window as unknown as { __deferredPwaInstallPrompt?: BeforeInstallPromptEvent | null }
  ).__deferredPwaInstallPrompt = evt;
}

export function usePWAInstall() {
  const [isRunningInAppMode, setIsRunningInAppMode] = useState<boolean>(() =>
    checkIsStandaloneAppMode()
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    getGlobalDeferredPrompt()
  );
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(
    () => checkIsStandaloneAppMode() || readStoredInstalledFlag()
  );
  const [isInstallCheckComplete, setIsInstallCheckComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !('getInstalledRelatedApps' in window.navigator);
  });
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const checkSeqRef = useRef(0);

  const verifyInstalledRelatedApps = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const seq = ++checkSeqRef.current;

    if (checkIsStandaloneAppMode()) {
      setIsRunningInAppMode(true);
      setIsAppInstalled(true);
      writeStoredInstalledFlag(true);
      setIsInstallCheckComplete(true);
      return;
    }

    const navWithRelated = window.navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string; id?: string }>>;
    };

    if (typeof navWithRelated.getInstalledRelatedApps === 'function') {
      try {
        const related = await navWithRelated.getInstalledRelatedApps();
        if (seq !== checkSeqRef.current) return;

        if (Array.isArray(related) && related.length > 0) {
          setIsAppInstalled(true);
          writeStoredInstalledFlag(true);
        } else if (Array.isArray(related) && related.length === 0) {
          // On the canonical production origin matching manifest.json related_applications,
          // an empty array authoritatively means the PWA is not installed (or was deleted).
          const isCanonicalOrigin = window.location.origin === PRODUCTION_MANIFEST_ORIGIN;
          if (isCanonicalOrigin || getGlobalDeferredPrompt() !== null) {
            writeStoredInstalledFlag(false);
            setIsAppInstalled(false);
          }
        }
      } catch {
        // Ignore browser-level rejections for getInstalledRelatedApps
      } finally {
        if (seq === checkSeqRef.current) {
          setIsInstallCheckComplete(true);
        }
      }
    } else {
      setIsInstallCheckComplete(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    const existingPrompt = getGlobalDeferredPrompt();
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
      writeStoredInstalledFlag(false);
      setIsAppInstalled(false);
    }

    void verifyInstalledRelatedApps();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setGlobalDeferredPrompt(promptEvent);
      setDeferredPrompt(promptEvent);
      // Chromium only fires beforeinstallprompt when the PWA is NOT currently installed
      // (including right after the user deletes/uninstalls the app).
      writeStoredInstalledFlag(false);
      setIsAppInstalled(false);
      setIsInstallCheckComplete(true);
    };

    const handlePromptReady = () => {
      const captured = getGlobalDeferredPrompt();
      if (captured) {
        setDeferredPrompt(captured);
        writeStoredInstalledFlag(false);
        setIsAppInstalled(false);
        setIsInstallCheckComplete(true);
      }
    };

    const handleAppInstalled = () => {
      setGlobalDeferredPrompt(null);
      setDeferredPrompt(null);
      writeStoredInstalledFlag(true);
      setIsAppInstalled(true);
      setIsInstallCheckComplete(true);
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void verifyInstalledRelatedApps();
      }
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches || checkIsStandaloneAppMode()) {
        setIsRunningInAppMode(true);
        setIsAppInstalled(true);
        writeStoredInstalledFlag(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('hamrolms-pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('hamrolms-pwa-installed', handleAppInstalled);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('hamrolms-pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('hamrolms-pwa-installed', handleAppInstalled);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, [verifyInstalledRelatedApps]);

  const promptNativeInstall = useCallback(async (): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > => {
    const activePrompt = deferredPrompt || getGlobalDeferredPrompt();
    if (!activePrompt) return 'unavailable';

    try {
      await activePrompt.prompt();
      const choiceResult = await activePrompt.userChoice;
      setGlobalDeferredPrompt(null);
      setDeferredPrompt(null);

      if (choiceResult?.outcome === 'accepted') {
        writeStoredInstalledFlag(true);
        setIsAppInstalled(true);
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      setGlobalDeferredPrompt(null);
      setDeferredPrompt(null);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const markManualInstallConfirmed = useCallback(() => {
    writeStoredInstalledFlag(true);
    setIsAppInstalled(true);
  }, []);

  return {
    isRunningInAppMode,
    isAppInstalled,
    isInstallCheckComplete,
    isIOS,
    deferredPrompt,
    canPromptNativeInstall: Boolean(deferredPrompt || getGlobalDeferredPrompt()),
    promptNativeInstall,
    markManualInstallConfirmed,
    verifyInstalledRelatedApps,
  };
}
