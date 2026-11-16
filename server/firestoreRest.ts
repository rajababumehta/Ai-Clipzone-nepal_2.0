import { readAppletConfig } from './appletConfig.ts';

function isValidFirestoreDatabaseId(val?: string): val is string {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('/')) return false;
  return true;
}

function getFirestoreRestConfig() {
  const cfg = readAppletConfig();
  const projectId = cfg.projectId?.trim() || process.env.FIREBASE_PROJECT_ID?.trim() || '';
  const databaseId = isValidFirestoreDatabaseId(cfg.firestoreDatabaseId)
    ? cfg.firestoreDatabaseId.trim()
    : isValidFirestoreDatabaseId(process.env.FIREBASE_DATABASE_ID)
    ? process.env.FIREBASE_DATABASE_ID!.trim()
    : '(default)';
  const apiKey = cfg.apiKey?.trim() || process.env.FIREBASE_WEB_API_KEY?.trim() || '';
  return { projectId, databaseId, apiKey };
}

function toFirestoreValue(val: any): Record<string, any> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map((v) => toFirestoreValue(v)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(v: any): any {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return String(v.stringValue);
  if ('timestampValue' in v) return Date.parse(v.timestampValue) || v.timestampValue;
  if ('arrayValue' in v) {
    const vals = Array.isArray(v.arrayValue?.values) ? v.arrayValue.values : [];
    return vals.map(fromFirestoreValue);
  }
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    const fields = v.mapValue?.fields || {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(fv);
    }
    return out;
  }
  return null;
}

function toFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function fromFirestoreDoc(docJson: any): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = docJson?.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

function randomDocId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const OP_MAP: Record<string, string> = {
  '==': 'EQUAL',
  '!=': 'NOT_EQUAL',
  '<': 'LESS_THAN',
  '<=': 'LESS_THAN_OR_EQUAL',
  '>': 'GREATER_THAN',
  '>=': 'GREATER_THAN_OR_EQUAL',
  'array-contains': 'ARRAY_CONTAINS',
};

export interface VerifiedRestUser {
  uid: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
}

export async function verifyFirebaseIdTokenViaRest(idToken: string): Promise<VerifiedRestUser | null> {
  if (!idToken) return null;
  const { apiKey } = getFirestoreRestConfig();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user?.localId) return null;
    return {
      uid: String(user.localId),
      email: user.email ? String(user.email) : undefined,
      name: user.displayName ? String(user.displayName) : undefined,
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}

export function createRestFirestore(idToken?: string): any {
  const { projectId, databaseId } = getFirestoreRestConfig();
  const dbResourcePrefix = `projects/${projectId}/databases/${databaseId}/documents`;
  const baseUrl = `https://firestore.googleapis.com/v1/${dbResourcePrefix}`;

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  }

  async function restFetch(url: string, init: RequestInit = {}) {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...buildHeaders(),
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { error: { message: text } };
    }
    return { ok: res.ok, status: res.status, json };
  }

  function makeDocRef(docPath: string): any {
    const segments = docPath.split('/').filter(Boolean);
    const id = segments[segments.length - 1] || '';

    return {
      id,
      path: docPath,
      collection: (sub: string) => makeCollectionRef(`${docPath}/${sub}`),
      get: async () => {
        const { ok, status, json } = await restFetch(`${baseUrl}/${docPath}`, { method: 'GET' });
        if (status === 404) {
          return { id, exists: false, ref: makeDocRef(docPath), data: () => undefined, _updateTime: undefined };
        }
        if (!ok) {
          const msg = json?.error?.message || `Firestore REST get failed (${status})`;
          throw new Error(msg);
        }
        const parsed = fromFirestoreDoc(json);
        return {
          id,
          exists: true,
          ref: makeDocRef(docPath),
          data: () => parsed,
          _updateTime: json?.updateTime,
        };
      },
      set: async (data: Record<string, any>, opts?: { merge?: boolean }) => {
        const fields = toFirestoreFields(data);
        let url = `${baseUrl}/${docPath}`;
        if (opts?.merge) {
          const keys = Object.keys(fields);
          if (keys.length > 0) {
            const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
            url += `?${mask}`;
          }
        }
        const { ok, status, json } = await restFetch(url, {
          method: 'PATCH',
          body: JSON.stringify({ fields }),
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST set failed (${status})`);
        }
      },
      update: async (data: Record<string, any>) => {
        const fields = toFirestoreFields(data);
        const keys = Object.keys(fields);
        const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
        const url = `${baseUrl}/${docPath}?currentDocument.exists=true${mask ? `&${mask}` : ''}`;
        const { ok, status, json } = await restFetch(url, {
          method: 'PATCH',
          body: JSON.stringify({ fields }),
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST update failed (${status})`);
        }
      },
      delete: async () => {
        const { ok, status, json } = await restFetch(`${baseUrl}/${docPath}`, { method: 'DELETE' });
        if (!ok && status !== 404) {
          throw new Error(json?.error?.message || `Firestore REST delete failed (${status})`);
        }
      },
    };
  }

  function makeQuery(
    collectionPath: string,
    filters: Array<{ field: string; op: string; value: any }> = [],
    orderField?: { field: string; dir: 'asc' | 'desc' },
    limitCount?: number
  ): any {
    return {
      where: (field: string, op: string, value: any) =>
        makeQuery(collectionPath, [...filters, { field, op, value }], orderField, limitCount),
      orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') =>
        makeQuery(collectionPath, filters, { field, dir }, limitCount),
      limit: (n: number) => makeQuery(collectionPath, filters, orderField, n),
      get: async () => {
        const segments = collectionPath.split('/').filter(Boolean);
        const collectionId = segments[segments.length - 1];
        const parentRel = segments.slice(0, -1).join('/');
        const parentUrl = parentRel ? `${baseUrl}/${parentRel}:runQuery` : `${baseUrl}:runQuery`;

        const structuredQuery: Record<string, any> = {
          from: [{ collectionId }],
        };

        if (filters.length > 0) {
          const fieldFilters = filters.map((f) => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: OP_MAP[f.op] || 'EQUAL',
              value: toFirestoreValue(f.value),
            },
          }));
          structuredQuery.where =
            fieldFilters.length === 1
              ? fieldFilters[0]
              : { compositeFilter: { op: 'AND', filters: fieldFilters } };
        }

        if (orderField) {
          structuredQuery.orderBy = [
            {
              field: { fieldPath: orderField.field },
              direction: orderField.dir === 'desc' ? 'DESCENDING' : 'ASCENDING',
            },
          ];
        }

        if (typeof limitCount === 'number') {
          structuredQuery.limit = limitCount;
        }

        const { ok, status, json } = await restFetch(parentUrl, {
          method: 'POST',
          body: JSON.stringify({ structuredQuery }),
        });

        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST query failed (${status})`);
        }

        const rows = Array.isArray(json) ? json : [];
        const docs = rows
          .filter((r) => Boolean(r?.document?.name))
          .map((r) => {
            const fullName = String(r.document.name);
            const relPath = fullName.replace(`${dbResourcePrefix}/`, '');
            const id = relPath.split('/').pop() || '';
            const parsed = fromFirestoreDoc(r.document);
            return {
              id,
              exists: true,
              ref: makeDocRef(relPath),
              data: () => parsed,
            };
          });

        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb: (d: any) => void) => docs.forEach(cb),
        };
      },
    };
  }

  function makeCollectionRef(collectionPath: string): any {
    const q = makeQuery(collectionPath);
    return {
      ...q,
      doc: (id?: string) => makeDocRef(`${collectionPath}/${id || randomDocId()}`),
      add: async (data: Record<string, any>) => {
        const ref = makeDocRef(`${collectionPath}/${randomDocId()}`);
        await ref.set(data);
        return ref;
      },
    };
  }

  return {
    isRestFallback: true,
    collection: (name: string) => makeCollectionRef(name),
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const readMeta = new Map<string, { exists: boolean; updateTime?: string }>();
      const writes: any[] = [];

      const tx = {
        get: async (docRef: any) => {
          const snap = await docRef.get();
          readMeta.set(docRef.path, { exists: snap.exists, updateTime: snap._updateTime });
          return snap;
        },
        set: (docRef: any, data: Record<string, any>, opts?: { merge?: boolean }) => {
          const fields = toFirestoreFields(data);
          const meta = readMeta.get(docRef.path);
          const writeObj: Record<string, any> = {
            update: {
              name: `${dbResourcePrefix}/${docRef.path}`,
              fields,
            },
          };
          if (opts?.merge) {
            writeObj.updateMask = { fieldPaths: Object.keys(fields) };
          }
          if (meta) {
            writeObj.currentDocument = meta.exists && meta.updateTime ? { updateTime: meta.updateTime } : { exists: false };
          }
          writes.push(writeObj);
        },
        update: (docRef: any, data: Record<string, any>) => {
          const fields = toFirestoreFields(data);
          const meta = readMeta.get(docRef.path);
          const writeObj: Record<string, any> = {
            update: {
              name: `${dbResourcePrefix}/${docRef.path}`,
              fields,
            },
            updateMask: { fieldPaths: Object.keys(fields) },
            currentDocument:
              meta?.exists && meta.updateTime ? { updateTime: meta.updateTime } : { exists: true },
          };
          writes.push(writeObj);
        },
        delete: (docRef: any) => {
          writes.push({ delete: `${dbResourcePrefix}/${docRef.path}` });
        },
      };

      const result = await fn(tx);

      if (writes.length > 0) {
        const { ok, status, json } = await restFetch(`${baseUrl}:commit`, {
          method: 'POST',
          body: JSON.stringify({ writes }),
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST transaction commit failed (${status})`);
        }
      }

      return result;
    },
  };
}
