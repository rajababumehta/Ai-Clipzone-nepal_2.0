// Google Analytics 4 (GA4) lightweight SPA integration.
// Configured exclusively via environment variable VITE_GA_MEASUREMENT_ID (never hardcoded).

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initializedMeasurementId: string | null = null;

export function getConfiguredGaMeasurementId(): string {
  try {
    const id = String((import.meta as any).env?.VITE_GA_MEASUREMENT_ID || '').trim();
    if (/^G-[A-Z0-9]+$/i.test(id)) {
      return id;
    }
  } catch {
    // ignore env lookup issues
  }
  return '';
}

export function initGoogleAnalyticsIfConfigured(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const measurementId = getConfiguredGaMeasurementId();
  if (!measurementId || initializedMeasurementId === measurementId) return;

  initializedMeasurementId = measurementId;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  if (!document.querySelector(`script[data-ga-id="${measurementId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.setAttribute('data-ga-id', measurementId);
    document.head.appendChild(script);
  }
}

export function trackPageView(pagePath: string, pageTitle: string): void {
  if (typeof window === 'undefined') return;
  const measurementId = getConfiguredGaMeasurementId();
  if (!measurementId) return;
  initGoogleAnalyticsIfConfigured();
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_title: pageTitle,
      page_path: pagePath,
      page_location: window.location.href,
    });
  }
}
