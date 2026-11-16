import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { readAppletConfig } from './appletConfig.ts';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let cachedMessaging: Messaging | null = null;
let initAttempted = false;
let initError: string | null = null;

function isValidFirestoreDatabaseId(val?: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('/')) return false;
  return true;
}

export function getConfiguredDatabaseId(): string {
  const appletCfg = readAppletConfig();
  if (isValidFirestoreDatabaseId(appletCfg.firestoreDatabaseId)) {
    return appletCfg.firestoreDatabaseId.trim();
  }
  if (isValidFirestoreDatabaseId(process.env.FIREBASE_DATABASE_ID)) {
    return process.env.FIREBASE_DATABASE_ID!.trim();
  }
  return '(default)';
}

export function getConfiguredProjectId(): string {
  const appletCfg = readAppletConfig();
  if (appletCfg.projectId?.trim()) {
    return appletCfg.projectId.trim();
  }
  return process.env.FIREBASE_PROJECT_ID?.trim() || '';
}

function parseServiceAccountFromEnv(): Record<string, any> | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const jsonStr = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf-8');
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.client_email && parsed.private_key) {
        parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
        return parsed;
      }
    } catch (err) {
      console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const projectId = getConfiguredProjectId();
  if (clientEmail && privateKey && projectId) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

export function initializeFirebaseAdmin(): App | null {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  if (initAttempted) return null;
  initAttempted = true;

  const projectId = getConfiguredProjectId();
  const serviceAccount = parseServiceAccountFromEnv();

  try {
    if (serviceAccount) {
      if (projectId && serviceAccount.project_id && serviceAccount.project_id !== projectId) {
        initError = `Service account project_id (${serviceAccount.project_id}) does not match configured Firebase project (${projectId}). Using Firestore REST adapter.`;
        console.warn(`[FirebaseAdmin] ${initError}`);
        return null;
      }
      cachedApp = initializeApp({
        credential: cert(serviceAccount as any),
        projectId: projectId || serviceAccount.project_id || undefined,
      });
      initError = null;
      return cachedApp;
    }

    // Only use ADC when explicit credentials file or Firebase Cloud Functions runtime is active
    // (AI Studio Cloud Run K_SERVICE default ADC belongs to the host project, not the provisioned Firebase project)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FUNCTION_TARGET) {
      cachedApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId || undefined,
      });
      initError = null;
      return cachedApp;
    }

    initError =
      'Using Firestore REST adapter (set FIREBASE_SERVICE_ACCOUNT_JSON for full Admin SDK privileges).';
    return null;
  } catch (err: any) {
    initError = err?.message || 'Failed to initialize Firebase Admin SDK';
    console.error('[FirebaseAdmin] Initialization error:', initError);
    return null;
  }
}

export function markAdminSdkUnusable(reason: string): void {
  cachedDb = null;
  cachedApp = null;
  initAttempted = true;
  initError = reason;
}

export function getAdminDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  const databaseId = getConfiguredDatabaseId();
  cachedDb = databaseId && databaseId !== '(default)' ? getFirestore(app, databaseId) : getFirestore(app);
  return cachedDb;
}

export function getAdminAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export function getAdminMessaging(): Messaging | null {
  if (cachedMessaging) return cachedMessaging;
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  cachedMessaging = getMessaging(app);
  return cachedMessaging;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(getAdminDb());
}

export function getFirebaseAdminInitError(): string | null {
  initializeFirebaseAdmin();
  return initError;
}
