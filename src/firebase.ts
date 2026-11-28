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

export interface PublicBootstrapSnapshot {
  courses: any[] | null;
  config: Record<string, any> | null;
  siteSettings: Record<string, any> | null;
  paymentQr: Record<string, any> | null;
  faqs: any[] | null;
  subAdmins: any[] | null;
  liveSessions: any[] | null;
}

function decodeFirestoreDocItem(docItem: any): Record<string, any> {
  const obj: Record<string, any> = {};
  const fields = docItem?.fields || {};
  for (const k of Object.keys(fields)) {
    obj[k] = decodeFirestoreRestValue(fields[k]);
  }
  const docId = String(docItem?.name?.split('/').pop() || obj.id || '');
  return { ...obj, id: docId };
}

export async function fetchCoursesViaRest(timeoutMs = 3500): Promise<any[] | null> {
  if (typeof fetch === 'undefined' || !firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/courses?pageSize=100`;
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    return docs.map(decodeFirestoreDocItem);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublicBootstrapViaRest(timeoutMs = 3500): Promise<PublicBootstrapSnapshot> {
  const empty: PublicBootstrapSnapshot = {
    courses: null,
    config: null,
    siteSettings: null,
    paymentQr: null,
    faqs: null,
    subAdmins: null,
    liveSessions: null,
  };
  if (typeof fetch === 'undefined' || !firebaseConfig?.projectId || !firebaseConfig?.firestoreDatabaseId) {
    return empty;
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const fetchDocSafe = async (docPath: string): Promise<Record<string, any> | null> => {
    try {
      const res = await fetch(`${baseUrl}/${docPath}`, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json?.fields) return null;
      return decodeFirestoreDocItem(json);
    } catch {
      return null;
    }
  };

  const fetchCollectionSafe = async (colPath: string, pageSize = 100): Promise<any[] | null> => {
    try {
      const res = await fetch(`${baseUrl}/${colPath}?pageSize=${pageSize}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const json = await res.json();
      const docs = Array.isArray(json?.documents) ? json.documents : [];
      return docs.map(decodeFirestoreDocItem);
    } catch {
      return null;
    }
  };

  const fetchActiveSubAdminsSafe = async (): Promise<any[] | null> => {
    try {
      const res = await fetch(`${baseUrl}:runQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
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
  };

  try {
    const [courses, config, siteSettings, paymentQr, faqsDoc, subAdmins, liveSessionsRaw] =
      await Promise.all([
        fetchCollectionSafe('courses', 100),
        fetchDocSafe('system/config'),
        fetchDocSafe('system/site_settings'),
        fetchDocSafe('system/payment_qr'),
        fetchDocSafe('system/faqs'),
        fetchActiveSubAdminsSafe(),
        fetchCollectionSafe('live_sessions', 50),
      ]);

    const liveSessions = Array.isArray(liveSessionsRaw)
      ? [...liveSessionsRaw].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      : null;

    return {
      courses,
      config,
      siteSettings,
      paymentQr,
      faqs: Array.isArray(faqsDoc?.items) ? faqsDoc.items : null,
      subAdmins,
      liveSessions,
    };
  } finally {
    clearTimeout(timer);
  }
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
