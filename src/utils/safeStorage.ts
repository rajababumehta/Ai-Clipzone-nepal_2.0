export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed === undefined || parsed === null ? fallback : parsed) as T;
  } catch {
    return fallback;
  }
}

export function safeStorageGet(
  key: string,
  fallback: string = '',
  storage: 'local' | 'session' = 'local'
): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const store = storage === 'session' ? window.sessionStorage : window.localStorage;
    return store.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeStorageSet(key: string, value: string, storage: 'local' | 'session' = 'local'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const store = storage === 'session' ? window.sessionStorage : window.localStorage;
    store.setItem(key, value);
    return true;
  } catch {
    // Handle QuotaExceededError cleanly by pruning bloated admin caches first
    if (storage === 'local') {
      try {
        window.localStorage.removeItem('clipzone_admin_keys_cache');
        window.localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function safeStorageSetBoundedArray<T>(
  key: string,
  items: T[],
  maxItems: number = 100
): boolean {
  const bounded = Array.isArray(items) ? items.slice(0, maxItems) : [];
  try {
    return safeStorageSet(key, JSON.stringify(bounded));
  } catch {
    return false;
  }
}

export function safeTrim(value: unknown, maxLength: number = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
