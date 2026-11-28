import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Suppress reachability warning logs in sandboxed iframe environment
try {
  setLogLevel('silent');
} catch (e) {
  // ignore
}

// Initialize Firestore with persistent IndexedDB offline cache and auto-detected fast streaming transport
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);

function decodeFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return values.map(decodeFirestoreRestValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const key of Object.keys(fields)) {
      out[key] = decodeFirestoreRestValue(fields[key]);
    }
    return out;
  }
  return undefined;
}

export interface CoreCatalogSnapshot {
  courses: any[] | null;
  config: Record<string, any> | null;
  subAdmins: any[] | null;
}

export interface SecondarySettingsSnapshot {
  siteSettings: Record<string, any> | null;
  paymentQr: Record<string, any> | null;
  faqs: any[] | null;
  liveSessions: any[] | null;
}

export interface PublicBootstrapSnapshot extends CoreCatalogSnapshot, SecondarySettingsSnapshot {}

function decodeFirestoreDocItem(docItem: any): Record<string, any> {
  const obj: Record<string, any> = {};
  const fields = docItem?.fields || {};
  for (const k of Object.keys(fields)) {
    obj[k] = decodeFirestoreRestValue(fields[k]);
  }
  const docId = String(docItem?.name?.split('/').pop() || obj.id || '');
  return { ...obj, id: docId };
}

function canUseFirestoreRest(): boolean {
  return Boolean(
    typeof fetch !== 'undefined' &&
      firebaseConfig?.projectId &&
      firebaseConfig?.firestoreDatabaseId
  );
}

function getFirestoreRestBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
}

async function fetchRestDocSafe(
  baseUrl: string,
  docPath: string,
  signal: AbortSignal
): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${baseUrl}/${docPath}`, { signal, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.fields) return null;
    return decodeFirestoreDocItem(json);
  } catch {
    return null;
  }
}

async function fetchRestCollectionSafe(
  baseUrl: string,
  colPath: string,
  pageSize: number,
  signal: AbortSignal
): Promise<any[] | null> {
  try {
    const res = await fetch(`${baseUrl}/${colPath}?pageSize=${pageSize}`, {
      signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    return docs.map(decodeFirestoreDocItem);
  } catch {
    return null;
  }
}

async function fetchRestActiveSubAdminsSafe(
  baseUrl: string,
  signal: AbortSignal
): Promise<any[] | null> {
  try {
    const res = await fetch(`${baseUrl}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      cache: 'no-store',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'sub_admins' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'active' },
            },
          },
        },
      }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const subs: any[] = [];
    for (const row of rows) {
      if (!row?.document?.fields) continue;
      const d = decodeFirestoreDocItem(row.document);
      if (d.status !== 'active' || !d.name) continue;
      // Public-safe fields only (never expose secret `code` or `activeDeviceId` from public bootstrap)
      subs.push({
        id: d.id,
        name: String(d.name),
        courseId: String(d.courseId || ''),
        courseTitle: String(d.courseTitle || ''),
        courseIds: Array.isArray(d.courseIds) ? d.courseIds.map(String).filter(Boolean) : [],
        courseTitles: Array.isArray(d.courseTitles) ? d.courseTitles.map(String).filter(Boolean) : [],
        avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
        status: 'active',
      });
    }
    return subs;
  } catch {
    return null;
  }
}

export async function fetchCoursesViaRest(timeoutMs = 3500): Promise<any[] | null> {
  if (!canUseFirestoreRest()) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchRestCollectionSafe(getFirestoreRestBaseUrl(), 'courses', 100, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCoreCatalogViaRest(timeoutMs = 2200): Promise<CoreCatalogSnapshot> {
  if (!canUseFirestoreRest()) {
    return { courses: null, config: null, subAdmins: null };
  }
  const baseUrl = getFirestoreRestBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [courses, config, subAdmins] = await Promise.all([
      fetchRestCollectionSafe(baseUrl, 'courses', 100, controller.signal),
      fetchRestDocSafe(baseUrl, 'system/config', controller.signal),
      fetchRestActiveSubAdminsSafe(baseUrl, controller.signal),
    ]);
    return { courses, config, subAdmins };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSecondarySettingsViaRest(timeoutMs = 2500): Promise<SecondarySettingsSnapshot> {
  if (!canUseFirestoreRest()) {
    return { siteSettings: null, paymentQr: null, faqs: null, liveSessions: null };
  }
  const baseUrl = getFirestoreRestBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [siteSettings, paymentQr, faqsDoc, liveSessionsRaw] = await Promise.all([
      fetchRestDocSafe(baseUrl, 'system/site_settings', controller.signal),
      fetchRestDocSafe(baseUrl, 'system/payment_qr', controller.signal),
      fetchRestDocSafe(baseUrl, 'system/faqs', controller.signal),
      fetchRestCollectionSafe(baseUrl, 'live_sessions', 50, controller.signal),
    ]);
    const liveSessions = Array.isArray(liveSessionsRaw)
      ? [...liveSessionsRaw].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : null;
    return {
      siteSettings,
      paymentQr,
      faqs: Array.isArray(faqsDoc?.items) ? faqsDoc.items : null,
      liveSessions,
    };
  } finally {
    clearTimeout(timer);
  }
}

let earlyCoreBootstrapPromise: Promise<CoreCatalogSnapshot> | null = null;
let earlyCoreConsumed = false;
let earlySecondaryBootstrapPromise: Promise<SecondarySettingsSnapshot> | null = null;
let earlySecondaryConsumed = false;

if (typeof window !== 'undefined' && (typeof navigator === 'undefined' || navigator.onLine)) {
  earlyCoreBootstrapPromise = fetchCoreCatalogViaRest(2200);
  earlySecondaryBootstrapPromise = fetchSecondarySettingsViaRest(2500);
}

export function consumeEarlyCoreBootstrap(timeoutMs = 2200): Promise<CoreCatalogSnapshot> {
  if (earlyCoreBootstrapPromise && !earlyCoreConsumed) {
    earlyCoreConsumed = true;
    return earlyCoreBootstrapPromise;
  }
  return fetchCoreCatalogViaRest(timeoutMs);
}

export function consumeEarlySecondaryBootstrap(timeoutMs = 2500): Promise<SecondarySettingsSnapshot> {
  if (earlySecondaryBootstrapPromise && !earlySecondaryConsumed) {
    earlySecondaryConsumed = true;
    return earlySecondaryBootstrapPromise;
  }
  return fetchSecondarySettingsViaRest(timeoutMs);
}

export async function fetchPublicBootstrapViaRest(timeoutMs = 3500): Promise<PublicBootstrapSnapshot> {
  const [core, secondary] = await Promise.all([
    fetchCoreCatalogViaRest(timeoutMs),
    fetchSecondarySettingsViaRest(timeoutMs),
  ]);
  return { ...core, ...secondary };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function reportFirestoreNonFatal(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = reportFirestoreNonFatal(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(attempt = 1) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      if (attempt < 2) {
        setTimeout(() => {
          void testConnection(attempt + 1);
        }, 1500);
        return;
      }
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
