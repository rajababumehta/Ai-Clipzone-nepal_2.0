// server/vercelApp.ts
import express3 from "express";
import dotenv from "dotenv";

// server/coreApiRoutes.ts
import express2 from "express";
import { GoogleGenAI } from "@google/genai";

// server/liveCrypto.ts
import crypto from "crypto";
var LIVE_TOKEN_KEY = crypto.createHash("sha256").update(
  process.env.LIVE_TOKEN_SECRET || process.env.GEMINI_API_KEY || "aiclipzone-nepal-live-zoom-key-2026"
).digest();
var ENC_PREFIX = "enc_v1:";
function encryptLivePayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", LIVE_TOKEN_KEY, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}
function decryptLivePayload(token) {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", LIVE_TOKEN_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}
function sanitizeHttpUrl(rawUrl) {
  try {
    const trimmed = String(rawUrl || "").trim();
    if (!trimmed || trimmed.length > 2048) return null;
    const match = trimmed.match(/https?:\/\/\S+/i);
    const candidate = match ? match[0] : trimmed;
    if (!/^https?:\/\//i.test(candidate)) return null;
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.startsWith("10.") || host.startsWith("192.168.") || host.endsWith(".local") || host.endsWith(".internal")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
function encryptZoomUrl(rawUrl) {
  const cleanUrl = sanitizeHttpUrl(rawUrl);
  if (!cleanUrl) return null;
  return ENC_PREFIX + encryptLivePayload({ u: cleanUrl, v: 1 });
}
function decryptZoomUrl(storedOrPlainUrl) {
  const val = String(storedOrPlainUrl || "").trim();
  if (!val) return null;
  if (val.startsWith(ENC_PREFIX)) {
    const payload = decryptLivePayload(val.slice(ENC_PREFIX.length));
    if (payload && typeof payload.u === "string") {
      return sanitizeHttpUrl(payload.u);
    }
    return null;
  }
  return sanitizeHttpUrl(val);
}
function buildZoomUrls(rawUrl, studentName) {
  try {
    const cleanUrl = sanitizeHttpUrl(rawUrl);
    if (!cleanUrl) return null;
    const parsed = new URL(cleanUrl);
    const cleanName = String(studentName || "Student").trim().slice(0, 60) || "Student";
    const base64Name = Buffer.from(cleanName, "utf8").toString("base64");
    const idMatch = parsed.pathname.match(/\/(?:j|wc\/join|s)\/(\d{9,12})/i) || parsed.pathname.match(/\/wc\/(\d{9,12})\/join/i);
    const meetingId = idMatch?.[1] || "";
    const pwd = parsed.searchParams.get("pwd") || "";
    const tk = parsed.searchParams.get("tk") || "";
    if (parsed.hostname.toLowerCase().includes("zoom.")) {
      parsed.searchParams.set("uname", cleanName);
    }
    const webUrl = parsed.toString();
    let embedUrl = webUrl;
    if (meetingId) {
      const wc = new URL(`https://app.zoom.us/wc/${meetingId}/join`);
      wc.searchParams.set("prefer", "1");
      wc.searchParams.set("un", base64Name);
      wc.searchParams.set("uname", cleanName);
      if (pwd) wc.searchParams.set("pwd", pwd);
      if (tk) wc.searchParams.set("tk", tk);
      embedUrl = wc.toString();
    }
    return { webUrl, embedUrl };
  } catch {
    return null;
  }
}
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function securityHeadersMiddleware(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), display-capture=(self)");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  next();
}

// server/appletConfig.ts
import fs from "fs";
import path from "path";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "gen-lang-client-0360487518",
  appId: "1:822954278678:web:b3d9ef02cafaae3dedda37",
  apiKey: "AIzaSyC4G4zxJlahwFZgds5T_7JTgWNhwbmyDEI",
  authDomain: "gen-lang-client-0360487518.firebaseapp.com",
  storageBucket: "gen-lang-client-0360487518.firebasestorage.app",
  messagingSenderId: "822954278678",
  firestoreDatabaseId: "ai-studio-aiclipzonenepal-13e41d9c-1db8-4842-a387-8c950c1f5b2a",
  measurementId: "",
  oAuthClientId: "822954278678-rjdqvv9gld9ho4i8mbcpediu0t7i2qtn.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// server/appletConfig.ts
function readAppletConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
  }
  return firebase_applet_config_default || {};
}

// server/firestoreRest.ts
function isValidFirestoreDatabaseId(val) {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) return false;
  return true;
}
function getFirestoreRestConfig() {
  const cfg = readAppletConfig();
  const projectId = cfg.projectId?.trim() || process.env.FIREBASE_PROJECT_ID?.trim() || "";
  const databaseId = isValidFirestoreDatabaseId(cfg.firestoreDatabaseId) ? cfg.firestoreDatabaseId.trim() : isValidFirestoreDatabaseId(process.env.FIREBASE_DATABASE_ID) ? process.env.FIREBASE_DATABASE_ID.trim() : "(default)";
  const apiKey = cfg.apiKey?.trim() || process.env.FIREBASE_WEB_API_KEY?.trim() || "";
  return { projectId, databaseId, apiKey };
}
function toFirestoreValue(val) {
  if (val === null || val === void 0) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== void 0).map((v) => toFirestoreValue(v))
      }
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== void 0) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}
function fromFirestoreValue(v) {
  if (!v || typeof v !== "object") return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return Boolean(v.booleanValue);
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("stringValue" in v) return String(v.stringValue);
  if ("timestampValue" in v) return Date.parse(v.timestampValue) || v.timestampValue;
  if ("arrayValue" in v) {
    const vals = Array.isArray(v.arrayValue?.values) ? v.arrayValue.values : [];
    return vals.map(fromFirestoreValue);
  }
  if ("mapValue" in v) {
    const out = {};
    const fields = v.mapValue?.fields || {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(fv);
    }
    return out;
  }
  return null;
}
function toFirestoreFields(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v !== void 0) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}
function fromFirestoreDoc(docJson) {
  const out = {};
  const fields = docJson?.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}
function randomDocId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 20; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
var OP_MAP = {
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  "array-contains": "ARRAY_CONTAINS"
};
async function verifyFirebaseIdTokenViaRest(idToken) {
  if (!idToken) return null;
  const { apiKey } = getFirestoreRestConfig();
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user?.localId) return null;
    return {
      uid: String(user.localId),
      email: user.email ? String(user.email) : void 0,
      name: user.displayName ? String(user.displayName) : void 0,
      emailVerified: Boolean(user.emailVerified)
    };
  } catch {
    return null;
  }
}
function createRestFirestore(idToken) {
  const { projectId, databaseId } = getFirestoreRestConfig();
  const dbResourcePrefix = `projects/${projectId}/databases/${databaseId}/documents`;
  const baseUrl = `https://firestore.googleapis.com/v1/${dbResourcePrefix}`;
  function buildHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }
    return headers;
  }
  async function restFetch(url, init = {}) {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...buildHeaders(),
        ...init.headers || {}
      }
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { error: { message: text } };
    }
    return { ok: res.ok, status: res.status, json };
  }
  function makeDocRef(docPath) {
    const segments = docPath.split("/").filter(Boolean);
    const id = segments[segments.length - 1] || "";
    return {
      id,
      path: docPath,
      collection: (sub) => makeCollectionRef(`${docPath}/${sub}`),
      get: async () => {
        const { ok, status, json } = await restFetch(`${baseUrl}/${docPath}`, { method: "GET" });
        if (status === 404) {
          return { id, exists: false, ref: makeDocRef(docPath), data: () => void 0, _updateTime: void 0 };
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
          _updateTime: json?.updateTime
        };
      },
      set: async (data, opts) => {
        const fields = toFirestoreFields(data);
        let url = `${baseUrl}/${docPath}`;
        if (opts?.merge) {
          const keys = Object.keys(fields);
          if (keys.length > 0) {
            const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
            url += `?${mask}`;
          }
        }
        const { ok, status, json } = await restFetch(url, {
          method: "PATCH",
          body: JSON.stringify({ fields })
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST set failed (${status})`);
        }
      },
      update: async (data) => {
        const fields = toFirestoreFields(data);
        const keys = Object.keys(fields);
        const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
        const url = `${baseUrl}/${docPath}?currentDocument.exists=true${mask ? `&${mask}` : ""}`;
        const { ok, status, json } = await restFetch(url, {
          method: "PATCH",
          body: JSON.stringify({ fields })
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST update failed (${status})`);
        }
      },
      delete: async () => {
        const { ok, status, json } = await restFetch(`${baseUrl}/${docPath}`, { method: "DELETE" });
        if (!ok && status !== 404) {
          throw new Error(json?.error?.message || `Firestore REST delete failed (${status})`);
        }
      }
    };
  }
  function makeQuery(collectionPath, filters = [], orderField, limitCount) {
    return {
      where: (field, op, value) => makeQuery(collectionPath, [...filters, { field, op, value }], orderField, limitCount),
      orderBy: (field, dir = "asc") => makeQuery(collectionPath, filters, { field, dir }, limitCount),
      limit: (n) => makeQuery(collectionPath, filters, orderField, n),
      get: async () => {
        const segments = collectionPath.split("/").filter(Boolean);
        const collectionId = segments[segments.length - 1];
        const parentRel = segments.slice(0, -1).join("/");
        const parentUrl = parentRel ? `${baseUrl}/${parentRel}:runQuery` : `${baseUrl}:runQuery`;
        const structuredQuery = {
          from: [{ collectionId }]
        };
        if (filters.length > 0) {
          const fieldFilters = filters.map((f) => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: OP_MAP[f.op] || "EQUAL",
              value: toFirestoreValue(f.value)
            }
          }));
          structuredQuery.where = fieldFilters.length === 1 ? fieldFilters[0] : { compositeFilter: { op: "AND", filters: fieldFilters } };
        }
        if (orderField) {
          structuredQuery.orderBy = [
            {
              field: { fieldPath: orderField.field },
              direction: orderField.dir === "desc" ? "DESCENDING" : "ASCENDING"
            }
          ];
        }
        if (typeof limitCount === "number") {
          structuredQuery.limit = limitCount;
        }
        const { ok, status, json } = await restFetch(parentUrl, {
          method: "POST",
          body: JSON.stringify({ structuredQuery })
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST query failed (${status})`);
        }
        const rows = Array.isArray(json) ? json : [];
        const docs = rows.filter((r) => Boolean(r?.document?.name)).map((r) => {
          const fullName = String(r.document.name);
          const relPath = fullName.replace(`${dbResourcePrefix}/`, "");
          const id = relPath.split("/").pop() || "";
          const parsed = fromFirestoreDoc(r.document);
          return {
            id,
            exists: true,
            ref: makeDocRef(relPath),
            data: () => parsed
          };
        });
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb) => docs.forEach(cb)
        };
      }
    };
  }
  function makeCollectionRef(collectionPath) {
    const q = makeQuery(collectionPath);
    return {
      ...q,
      doc: (id) => makeDocRef(`${collectionPath}/${id || randomDocId()}`),
      add: async (data) => {
        const ref = makeDocRef(`${collectionPath}/${randomDocId()}`);
        await ref.set(data);
        return ref;
      }
    };
  }
  return {
    isRestFallback: true,
    collection: (name) => makeCollectionRef(name),
    runTransaction: async (fn) => {
      const readMeta = /* @__PURE__ */ new Map();
      const writes = [];
      const tx = {
        get: async (docRef) => {
          const snap = await docRef.get();
          readMeta.set(docRef.path, { exists: snap.exists, updateTime: snap._updateTime });
          return snap;
        },
        set: (docRef, data, opts) => {
          const fields = toFirestoreFields(data);
          const meta = readMeta.get(docRef.path);
          const writeObj = {
            update: {
              name: `${dbResourcePrefix}/${docRef.path}`,
              fields
            }
          };
          if (opts?.merge) {
            writeObj.updateMask = { fieldPaths: Object.keys(fields) };
          }
          if (meta) {
            writeObj.currentDocument = meta.exists && meta.updateTime ? { updateTime: meta.updateTime } : { exists: false };
          }
          writes.push(writeObj);
        },
        update: (docRef, data) => {
          const fields = toFirestoreFields(data);
          const meta = readMeta.get(docRef.path);
          const writeObj = {
            update: {
              name: `${dbResourcePrefix}/${docRef.path}`,
              fields
            },
            updateMask: { fieldPaths: Object.keys(fields) },
            currentDocument: meta?.exists && meta.updateTime ? { updateTime: meta.updateTime } : { exists: true }
          };
          writes.push(writeObj);
        },
        delete: (docRef) => {
          writes.push({ delete: `${dbResourcePrefix}/${docRef.path}` });
        }
      };
      const result = await fn(tx);
      if (writes.length > 0) {
        const { ok, status, json } = await restFetch(`${baseUrl}:commit`, {
          method: "POST",
          body: JSON.stringify({ writes })
        });
        if (!ok) {
          throw new Error(json?.error?.message || `Firestore REST transaction commit failed (${status})`);
        }
      }
      return result;
    }
  };
}

// server/authAndEnrollment.ts
var ADMIN_EMAILS = /* @__PURE__ */ new Set([
  "ai.clipzone.edu@gmail.com",
  "rajababum426@gmail.com"
]);
function isEmailMainAdmin(email) {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return ADMIN_EMAILS.has(lower);
}
function createRateLimiter(options) {
  const hits = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
    const userHint = req.headers["x-student-uid"] || req.headers["x-device-id"] || "";
    const key = `${options.keyPrefix}:${ip}:${userHint}`;
    const timestamps = (hits.get(key) || []).filter((ts) => now - ts < options.windowMs);
    if (timestamps.length >= options.maxRequests) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment and try again.",
        code: "RATE_LIMITED"
      });
    }
    timestamps.push(now);
    hits.set(key, timestamps);
    if (hits.size > 5e3) {
      for (const [k, list] of hits.entries()) {
        if (list.length === 0 || now - list[list.length - 1] >= options.windowMs) {
          hits.delete(k);
        }
      }
    }
    next();
  };
}
function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}
function parseActivationCodesHeader(req) {
  const raw = req.headers["x-activation-codes"] || (req.body && Array.isArray(req.body.activationCodes) ? req.body.activationCodes.join(",") : "") || (req.body && typeof req.body.activationCode === "string" ? req.body.activationCode : "") || "";
  return Array.from(
    new Set(
      raw.split(",").map((c) => c.trim().toUpperCase()).filter((c) => c.length >= 4 && c.length <= 64)
    )
  );
}
function isActivationKeyExpiredServer(keyData, now = Date.now()) {
  if (!keyData) return true;
  if (keyData.status === "expired" || keyData.status === "deleted") return true;
  const durationMs = keyData.duration === "1day" ? 24 * 60 * 60 * 1e3 : keyData.duration === "1month" ? 30 * 24 * 60 * 60 * 1e3 : 365 * 24 * 60 * 60 * 1e3;
  const expiresAt = Number(keyData.expiresAt || (keyData.claimedAt ? Number(keyData.claimedAt) + durationMs : 0));
  if (expiresAt > 0 && now > expiresAt) return true;
  return false;
}
async function verifyAdminIdentity(req, db, adminAuth) {
  const idToken = getBearerToken(req);
  if (idToken) {
    try {
      const decoded = adminAuth ? await adminAuth.verifyIdToken(idToken) : await verifyFirebaseIdTokenViaRest(idToken);
      const isEmailVerified = decoded?.emailVerified === true || decoded?.email_verified === true;
      if (decoded?.email && isEmailVerified && isEmailMainAdmin(decoded.email)) {
        return {
          isAdmin: true,
          role: "main_admin",
          uid: decoded.uid,
          name: decoded.name || "Main Admin",
          email: decoded.email
        };
      }
      if (decoded?.uid) {
        const adminDoc = await db.collection("admins").doc(decoded.uid).get().catch(() => null);
        if (adminDoc?.exists) {
          return {
            isAdmin: true,
            role: "main_admin",
            uid: decoded.uid,
            name: decoded.name || "Main Admin",
            email: decoded.email
          };
        }
      }
    } catch {
    }
  }
  const adminSessionId = String(req.headers["x-admin-session-id"] || "").trim();
  const deviceId = String(req.headers["x-device-id"] || "").trim();
  if (adminSessionId) {
    try {
      const sessSnap = await db.collection("system").doc("admin_session").get();
      if (sessSnap.exists) {
        const sessData = sessSnap.data();
        if (sessData?.activeSessionId && sessData.activeSessionId === adminSessionId && (!sessData.deviceId || deviceId && sessData.deviceId === deviceId)) {
          return {
            isAdmin: true,
            role: "main_admin",
            uid: `admin_${adminSessionId.slice(0, 16)}`,
            name: "Main Admin"
          };
        }
      }
    } catch (err) {
      console.warn("[Auth] Admin session verification failed:", err);
    }
  }
  const subAdminCode = String(req.headers["x-subadmin-code"] || "").trim().toUpperCase();
  if (subAdminCode) {
    try {
      const subSnap = await db.collection("sub_admins").doc(subAdminCode).get();
      if (subSnap.exists) {
        const subData = subSnap.data();
        if (subData?.status === "active" && (!subData.activeDeviceId || deviceId && subData.activeDeviceId === deviceId)) {
          const courseIds = [];
          if (Array.isArray(subData.courseIds)) {
            subData.courseIds.forEach((cid) => {
              const s = String(cid || "").trim();
              if (s && !courseIds.includes(s)) courseIds.push(s);
            });
          }
          if (subData.courseId) {
            const s = String(subData.courseId).trim();
            if (s && !courseIds.includes(s)) courseIds.push(s);
          }
          return {
            isAdmin: true,
            role: "sub_admin",
            uid: subAdminCode,
            name: subData.name || "Sub-Admin",
            subAdminCode,
            assignedCourseId: courseIds[0] || subData.courseId,
            assignedCourseIds: courseIds
          };
        }
      }
    } catch (err) {
      console.warn("[Auth] Sub-admin verification failed:", err);
    }
  }
  return null;
}
async function verifyStudentEnrollment(req, db, adminAuth, requiredCourseId) {
  const adminCtx = await verifyAdminIdentity(req, db, adminAuth);
  if (adminCtx) {
    const subCourseIds = adminCtx.assignedCourseIds && adminCtx.assignedCourseIds.length > 0 ? adminCtx.assignedCourseIds : adminCtx.assignedCourseId ? [adminCtx.assignedCourseId] : [];
    const adminAllowedCourseIds = adminCtx.role === "main_admin" ? ["course-all"] : subCourseIds;
    const authorized = !requiredCourseId || adminCtx.role === "main_admin" || subCourseIds.includes(requiredCourseId);
    return {
      authorized,
      userId: adminCtx.uid,
      studentName: adminCtx.name,
      studentEmail: adminCtx.email,
      enrolledCourseIds: adminAllowedCourseIds,
      isAdminBypass: true,
      reason: authorized ? void 0 : "Sub-Admin is only authorized for their assigned course."
    };
  }
  let verifiedUid = "";
  let verifiedEmail = "";
  let verifiedName = "";
  const idToken = getBearerToken(req);
  if (idToken) {
    try {
      const decoded = adminAuth ? await adminAuth.verifyIdToken(idToken) : await verifyFirebaseIdTokenViaRest(idToken);
      if (decoded) {
        verifiedUid = decoded.uid;
        verifiedEmail = decoded.email || "";
        verifiedName = decoded.name || "";
      }
    } catch {
    }
  }
  const headerStudentUid = String(req.headers["x-student-uid"] || "").trim();
  const deviceId = String(req.headers["x-device-id"] || "").trim();
  const candidateCodes = parseActivationCodesHeader(req);
  const now = Date.now();
  const enrolledCourseIds = /* @__PURE__ */ new Set();
  let matchedCode = "";
  let resolvedName = verifiedName;
  let resolvedEmail = verifiedEmail;
  let resolvedUid = verifiedUid;
  for (const code of candidateCodes) {
    try {
      const keySnap = await db.collection("activation_keys").doc(code).get();
      if (!keySnap.exists) continue;
      const keyData = keySnap.data();
      if (keyData.status !== "used") continue;
      if (isActivationKeyExpiredServer(keyData, now)) continue;
      const deviceMatches = !keyData.activeDeviceId || Boolean(deviceId) && keyData.activeDeviceId === deviceId;
      const uidMatches = Boolean(verifiedUid && keyData.claimedByUid === verifiedUid);
      if (!deviceMatches && !uidMatches) continue;
      if (keyData.courseId) {
        enrolledCourseIds.add(String(keyData.courseId));
      }
      if (!matchedCode || keyData.courseId === requiredCourseId || keyData.courseId === "course-all") {
        matchedCode = code;
      }
      if (!resolvedName && (keyData.studentName || keyData.claimedByName)) {
        resolvedName = String(keyData.studentName || keyData.claimedByName);
      }
      if (!resolvedEmail && keyData.claimedByEmail) {
        resolvedEmail = String(keyData.claimedByEmail);
      }
      if (!resolvedUid && keyData.claimedByUid) {
        resolvedUid = String(keyData.claimedByUid);
      }
    } catch (err) {
      console.warn("[Enrollment] Key check error:", err);
    }
  }
  if (verifiedUid) {
    try {
      const claimedSnap = await db.collection("activation_keys").where("claimedByUid", "==", verifiedUid).get();
      claimedSnap.forEach((docSnap) => {
        const keyData = docSnap.data();
        if (keyData.status === "used" && !isActivationKeyExpiredServer(keyData, now)) {
          if (keyData.courseId) enrolledCourseIds.add(String(keyData.courseId));
          if (!matchedCode) matchedCode = docSnap.id;
          if (!resolvedName && (keyData.studentName || keyData.claimedByName)) {
            resolvedName = String(keyData.studentName || keyData.claimedByName);
          }
        }
      });
    } catch (err) {
      console.warn("[Enrollment] UID key lookup error:", err);
    }
    try {
      const enrollSnap = await db.collection("enrollments").where("userId", "==", verifiedUid).where("status", "==", "active").get();
      enrollSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.expiresAt || Number(d.expiresAt) > now) {
          if (d.courseId) enrolledCourseIds.add(String(d.courseId));
        }
      });
    } catch (err) {
      console.warn("[Enrollment] Enrollments lookup error:", err);
    }
    try {
      const reqSnap = await db.collection("course_requests").where("userId", "==", verifiedUid).where("status", "==", "accepted").get();
      reqSnap.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.expiresAt || Number(d.expiresAt) > now) {
          if (d.courseId) enrolledCourseIds.add(String(d.courseId));
        }
      });
    } catch (err) {
      console.warn("[Enrollment] course_requests lookup error:", err);
    }
  }
  const courseList = Array.from(enrolledCourseIds);
  const effectiveUserId = resolvedUid || (matchedCode ? `key_${matchedCode}` : headerStudentUid || "");
  if (courseList.length === 0 || !effectiveUserId) {
    return {
      authorized: false,
      userId: effectiveUserId,
      studentName: resolvedName || "Guest",
      studentEmail: resolvedEmail,
      enrolledCourseIds: [],
      reason: "No active verified course enrollment found for this account."
    };
  }
  const hasCourseAccess = !requiredCourseId || courseList.includes("course-all") || courseList.includes(requiredCourseId);
  return {
    authorized: hasCourseAccess,
    userId: effectiveUserId,
    studentName: resolvedName || "Enrolled Student",
    studentEmail: resolvedEmail || void 0,
    activationCode: matchedCode || void 0,
    enrolledCourseIds: courseList,
    reason: hasCourseAccess ? void 0 : "You must purchase and activate this course before accessing its live class."
  };
}

// server/liveClassRoutes.ts
import express from "express";
import crypto4 from "crypto";

// server/firebaseAdmin.ts
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
var cachedApp = null;
var cachedDb = null;
var cachedAuth = null;
var cachedMessaging = null;
var initAttempted = false;
var initError = null;
function isValidFirestoreDatabaseId2(val) {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) return false;
  return true;
}
function getConfiguredDatabaseId() {
  const appletCfg = readAppletConfig();
  if (isValidFirestoreDatabaseId2(appletCfg.firestoreDatabaseId)) {
    return appletCfg.firestoreDatabaseId.trim();
  }
  if (isValidFirestoreDatabaseId2(process.env.FIREBASE_DATABASE_ID)) {
    return process.env.FIREBASE_DATABASE_ID.trim();
  }
  return "(default)";
}
function getConfiguredProjectId() {
  const appletCfg = readAppletConfig();
  if (appletCfg.projectId?.trim()) {
    return appletCfg.projectId.trim();
  }
  return process.env.FIREBASE_PROJECT_ID?.trim() || "";
}
function parseServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const jsonStr = rawJson.startsWith("{") ? rawJson : Buffer.from(rawJson, "base64").toString("utf-8");
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.client_email && parsed.private_key) {
        parsed.private_key = String(parsed.private_key).replace(/\\n/g, "\n");
        return parsed;
      }
    } catch (err) {
      console.error("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err);
    }
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const projectId = getConfiguredProjectId();
  if (clientEmail && privateKey && projectId) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n")
    };
  }
  return null;
}
function initializeFirebaseAdmin() {
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
        credential: cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id || void 0
      });
      initError = null;
      return cachedApp;
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FUNCTION_TARGET) {
      cachedApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId || void 0
      });
      initError = null;
      return cachedApp;
    }
    initError = "Using Firestore REST adapter (set FIREBASE_SERVICE_ACCOUNT_JSON for full Admin SDK privileges).";
    return null;
  } catch (err) {
    initError = err?.message || "Failed to initialize Firebase Admin SDK";
    console.error("[FirebaseAdmin] Initialization error:", initError);
    return null;
  }
}
function markAdminSdkUnusable(reason) {
  cachedDb = null;
  cachedApp = null;
  initAttempted = true;
  initError = reason;
}
function getAdminDb() {
  if (cachedDb) return cachedDb;
  const app2 = initializeFirebaseAdmin();
  if (!app2) return null;
  const databaseId = getConfiguredDatabaseId();
  cachedDb = databaseId && databaseId !== "(default)" ? getFirestore(app2, databaseId) : getFirestore(app2);
  return cachedDb;
}
function getAdminAuth() {
  if (cachedAuth) return cachedAuth;
  const app2 = initializeFirebaseAdmin();
  if (!app2) return null;
  cachedAuth = getAuth(app2);
  return cachedAuth;
}
function getAdminMessaging() {
  if (cachedMessaging) return cachedMessaging;
  const app2 = initializeFirebaseAdmin();
  if (!app2) return null;
  cachedMessaging = getMessaging(app2);
  return cachedMessaging;
}
function getFirebaseAdminInitError() {
  initializeFirebaseAdmin();
  return initError;
}

// server/zoomService.ts
import crypto2 from "crypto";
var ZoomApiError = class extends Error {
  constructor(message, statusCode = 502, code) {
    super(message);
    this.name = "ZoomApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
};
var cachedZoomToken = null;
function isZoomConfigured() {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID?.trim() && process.env.ZOOM_CLIENT_ID?.trim() && process.env.ZOOM_CLIENT_SECRET?.trim()
  );
}
function generateZoomPasscode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto2.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}
async function getZoomAccessToken(fetchFn = fetch) {
  if (!isZoomConfigured()) {
    throw new ZoomApiError(
      "Zoom Server-to-Server OAuth credentials are not configured on the backend (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET).",
      503,
      "ZOOM_NOT_CONFIGURED"
    );
  }
  const now = Date.now();
  if (cachedZoomToken && cachedZoomToken.expiresAt - 6e4 > now) {
    return cachedZoomToken.accessToken;
  }
  const accountId = process.env.ZOOM_ACCOUNT_ID.trim();
  const clientId = process.env.ZOOM_CLIENT_ID.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET.trim();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
  const res = await fetchFn(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    const rawMsg = data?.reason || data?.error_description || data?.message || `Zoom OAuth failed (${res.status})`;
    const lower = String(rawMsg).toLowerCase();
    if (lower.includes("disabled by the developer") || lower.includes("app has been disabled")) {
      throw new ZoomApiError(
        'The Zoom Server-to-Server OAuth app has been disabled by the developer in Zoom App Marketplace. Open marketplace.zoom.us -> Manage -> Created Apps -> your Server-to-Server OAuth app -> Activation tab -> click "Activate your app", or update ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET.',
        401,
        "ZOOM_APP_DISABLED"
      );
    }
    throw new ZoomApiError(rawMsg, res.status >= 400 && res.status < 500 ? 401 : 502, "ZOOM_OAUTH_ERROR");
  }
  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
  cachedZoomToken = {
    accessToken: data.access_token,
    expiresAt: now + expiresInSec * 1e3
  };
  return cachedZoomToken.accessToken;
}
async function createZoomMeeting(input, fetchFn = fetch) {
  const token = await getZoomAccessToken(fetchFn);
  const hostUserId = process.env.ZOOM_HOST_USER_ID?.trim() || "me";
  const durationMinutes = Math.min(Math.max(Math.round(input.durationMinutes || 40), 10), 300);
  const startTimeIso = new Date(input.startTimeMs).toISOString();
  const password = (input.password || generateZoomPasscode()).slice(0, 10);
  const payload = {
    topic: input.topic.slice(0, 200),
    type: 2,
    // Scheduled meeting
    start_time: startTimeIso,
    duration: durationMinutes,
    timezone: input.timezone || "Asia/Kathmandu",
    password,
    agenda: (input.agenda || "").slice(0, 2e3),
    settings: {
      host_video: true,
      participant_video: false,
      cn_meeting: false,
      in_meeting: false,
      join_before_host: true,
      mute_upon_entry: true,
      watermark: false,
      use_pmi: false,
      approval_type: 0,
      // Automatically approve
      audio: "both",
      auto_recording: "none",
      waiting_room: false,
      meeting_authentication: false,
      enforce_login: false,
      registrants_email_notification: false
    }
  };
  const res = await fetchFn(
    `https://api.zoom.us/v2/users/${encodeURIComponent(hostUserId)}/meetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id || !data?.join_url) {
    if (res.status === 401) {
      cachedZoomToken = null;
    }
    const msg = data?.message || (Array.isArray(data?.errors) ? data.errors.map((e) => e.message).join(", ") : "") || `Zoom Create Meeting failed (${res.status})`;
    throw new ZoomApiError(msg, res.status === 429 ? 429 : 502, "ZOOM_CREATE_FAILED");
  }
  return {
    meetingId: String(data.id),
    joinUrl: String(data.join_url),
    startUrl: String(data.start_url || data.join_url),
    password: String(data.password || password),
    hostEmail: data.host_email ? String(data.host_email) : void 0,
    startTimeIso: String(data.start_time || startTimeIso),
    durationMinutes: Number(data.duration || durationMinutes)
  };
}
async function updateZoomMeeting(meetingId, input, fetchFn = fetch) {
  if (!meetingId || !isZoomConfigured()) return;
  const token = await getZoomAccessToken(fetchFn);
  const body = {};
  if (input.topic) body.topic = input.topic.slice(0, 200);
  if (input.agenda !== void 0) body.agenda = input.agenda.slice(0, 2e3);
  if (input.startTimeMs) {
    body.start_time = new Date(input.startTimeMs).toISOString();
    body.timezone = input.timezone || "Asia/Kathmandu";
  }
  if (input.durationMinutes) {
    body.duration = Math.min(Math.max(Math.round(input.durationMinutes), 10), 300);
  }
  const res = await fetchFn(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok && res.status !== 404) {
    if (res.status === 401) {
      cachedZoomToken = null;
    }
    const data = await res.json().catch(() => ({}));
    throw new ZoomApiError(data?.message || `Zoom update failed (${res.status})`, 502, "ZOOM_UPDATE_FAILED");
  }
}
async function deleteZoomMeeting(meetingId, fetchFn = fetch) {
  if (!meetingId || !isZoomConfigured()) return;
  const token = await getZoomAccessToken(fetchFn);
  const res = await fetchFn(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    if (res.status === 401) {
      cachedZoomToken = null;
    }
    const data = await res.json().catch(() => ({}));
    throw new ZoomApiError(data?.message || `Zoom delete failed (${res.status})`, 502, "ZOOM_DELETE_FAILED");
  }
}
async function verifyZoomConnection(fetchFn = fetch) {
  cachedZoomToken = null;
  await getZoomAccessToken(fetchFn);
  return { ok: true };
}

// server/googleMeetService.ts
var GoogleMeetApiError = class extends Error {
  constructor(message, statusCode = 502, code = "GOOGLE_MEET_ERROR") {
    super(message);
    this.name = "GoogleMeetApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
};
async function createGoogleMeetSpace(accessToken, fetchFn = fetch) {
  const token = String(accessToken || "").trim();
  if (!token) {
    throw new GoogleMeetApiError(
      'Please click "Sign in with Google" and grant permission before connecting Google Meet.',
      401,
      "GOOGLE_MEET_REAUTH"
    );
  }
  const res = await fetchFn("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      config: {
        accessType: "OPEN"
      }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.meetingUri) {
    const rawMsg = data?.error?.message || data?.message || `Google Meet Space creation failed (${res.status})`;
    if (res.status === 401) {
      throw new GoogleMeetApiError(
        'Your Google Meet session has expired. Please click "Sign in with Google" again.',
        401,
        "GOOGLE_MEET_REAUTH"
      );
    }
    throw new GoogleMeetApiError(
      rawMsg,
      res.status >= 400 && res.status < 500 ? res.status : 502,
      "GOOGLE_MEET_CREATE_FAILED"
    );
  }
  const meetingUri = String(data.meetingUri);
  const meetingCode = String(data.meetingCode || "").trim() || meetingUri.replace(/^https?:\/\/meet\.google\.com\//i, "").split("?")[0];
  return {
    spaceName: String(data.name || ""),
    meetingUri,
    meetingCode
  };
}

// server/liveRoomHub.ts
import crypto3 from "crypto";
var BOOT_SECRET = crypto3.randomBytes(32).toString("hex");
function getRoomSecret() {
  return process.env.ROOM_TOKEN_SECRET?.trim() || BOOT_SECRET;
}
function mintRoomToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = crypto3.createHmac("sha256", getRoomSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyRoomToken(token, expectedClassId) {
  const raw = String(token || "").trim();
  const dotIdx = raw.indexOf(".");
  if (dotIdx <= 0) return null;
  const body = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!body || !sig) return null;
  const expectedSig = crypto3.createHmac("sha256", getRoomSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto3.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (!parsed || parsed.classId !== expectedClassId || !parsed.userId || !parsed.role) {
      return null;
    }
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
var rooms = /* @__PURE__ */ new Map();
function getOrCreateRoom(classId) {
  let room = rooms.get(classId);
  if (!room) {
    room = {
      classId,
      peers: /* @__PURE__ */ new Map(),
      chat: [],
      ended: false
    };
    rooms.set(classId, room);
  }
  return room;
}
function toPublicPeer(p) {
  return {
    peerId: p.peerId,
    userId: p.userId,
    displayName: p.displayName,
    role: p.role,
    camOn: p.camOn,
    micOn: p.micOn,
    screenSharing: p.screenSharing,
    handRaised: p.handRaised,
    joinedAt: p.joinedAt
  };
}
function writeSse(res, event, data) {
  try {
    res.write(`event: ${event}
data: ${JSON.stringify(data)}

`);
  } catch {
  }
}
function broadcastRoom(room, event, data, excludePeerId) {
  for (const peer of room.peers.values()) {
    if (excludePeerId && peer.peerId === excludePeerId) continue;
    writeSse(peer.sseRes, event, data);
  }
}
function subscribeRoomSse(params) {
  const { tokenData, peerId, camOn = false, micOn = false, res } = params;
  const room = getOrCreateRoom(tokenData.classId);
  if (tokenData.role === "mentor" && room.ended) {
    room.ended = false;
  }
  const prev = room.peers.get(peerId);
  if (prev) {
    try {
      prev.sseRes.end();
    } catch {
    }
    room.peers.delete(peerId);
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  const peer = {
    peerId,
    userId: tokenData.userId,
    displayName: tokenData.displayName,
    role: tokenData.role,
    camOn: Boolean(camOn),
    micOn: Boolean(micOn),
    screenSharing: false,
    handRaised: false,
    joinedAt: Date.now(),
    lastPing: Date.now(),
    sseRes: res
  };
  room.peers.set(peerId, peer);
  writeSse(res, "room_state", {
    selfPeerId: peerId,
    ended: room.ended,
    peers: Array.from(room.peers.values()).map(toPublicPeer),
    chat: room.chat.slice(-100)
  });
  broadcastRoom(room, "peer_joined", { peer: toPublicPeer(peer) }, peerId);
  const heartbeat = setInterval(() => {
    try {
      peer.lastPing = Date.now();
      res.write(`: ping ${peer.lastPing}

`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15e3);
  res.on("close", () => {
    clearInterval(heartbeat);
    const current = room.peers.get(peerId);
    if (current && current.sseRes === res) {
      room.peers.delete(peerId);
      broadcastRoom(room, "peer_left", { peerId });
      if (room.peers.size === 0 && room.chat.length === 0) {
        rooms.delete(tokenData.classId);
      }
    }
  });
}
function relayRoomSignal(params) {
  const room = rooms.get(params.classId);
  if (!room) return false;
  const sender = room.peers.get(params.fromPeerId);
  const target = room.peers.get(params.toPeerId);
  if (!sender || !target) return false;
  writeSse(target.sseRes, "signal", {
    fromPeerId: params.fromPeerId,
    fromRole: sender.role,
    fromName: sender.displayName,
    signal: params.signal
  });
  return true;
}
function updatePeerMediaState(params) {
  const room = rooms.get(params.classId);
  if (!room) return null;
  const peer = room.peers.get(params.peerId);
  if (!peer) return null;
  if (typeof params.camOn === "boolean") peer.camOn = params.camOn;
  if (typeof params.micOn === "boolean") peer.micOn = params.micOn;
  if (typeof params.screenSharing === "boolean") peer.screenSharing = params.screenSharing;
  if (typeof params.handRaised === "boolean") peer.handRaised = params.handRaised;
  const pub = toPublicPeer(peer);
  broadcastRoom(room, "media_state", { peer: pub });
  return pub;
}
function postRoomChatMessage(params) {
  const room = getOrCreateRoom(params.tokenData.classId);
  const peer = room.peers.get(params.peerId);
  const msg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    senderPeerId: params.peerId,
    senderName: peer?.displayName || params.tokenData.displayName,
    role: params.tokenData.role,
    text: params.text.trim().slice(0, 1e3),
    timestamp: Date.now()
  };
  room.chat.push(msg);
  if (room.chat.length > 100) {
    room.chat = room.chat.slice(-100);
  }
  broadcastRoom(room, "chat_message", { message: msg });
  return msg;
}
function leaveRoomPeer(classId, peerId) {
  const room = rooms.get(classId);
  if (!room) return;
  const peer = room.peers.get(peerId);
  if (!peer) return;
  room.peers.delete(peerId);
  try {
    peer.sseRes.end();
  } catch {
  }
  broadcastRoom(room, "peer_left", { peerId });
}
function endLiveRoom(classId, endedByName) {
  const room = getOrCreateRoom(classId);
  room.ended = true;
  broadcastRoom(room, "room_ended", {
    endedBy: endedByName,
    endedAt: Date.now()
  });
}

// server/liveClassRoutes.ts
function normalizeProvider(raw, fallback = "zoom") {
  const val = String(raw || "").trim();
  if (val === "builtin" || val === "google_meet" || val === "manual" || val === "zoom") return val;
  return fallback;
}
function extractGoogleMeetToken(req) {
  const headerVal = String(req.headers["x-google-meet-token"] || "").trim();
  if (headerVal) {
    return headerVal.startsWith("Bearer ") ? headerVal.slice(7).trim() : headerVal;
  }
  return String(req.body?.googleMeetAccessToken || "").trim();
}
function sanitizeId(raw) {
  return String(raw || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}
function maskMeetingId(meetingId) {
  if (!meetingId) return "";
  const str = String(meetingId);
  if (str.length <= 4) return "****";
  return `${str.slice(0, 3)}\u2022\u2022\u2022\u2022${str.slice(-3)}`;
}
function formatClassDateTime(ms) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(new Date(ms)) + " NPT";
  } catch {
    return new Date(ms).toISOString();
  }
}
function computeEffectiveStatus(cls, now = Date.now()) {
  if (cls.status === "cancelled" || cls.status === "draft") return cls.status;
  const start = Number(cls.scheduledStartAt || 0);
  const durationMs = Number(cls.durationMinutes || 40) * 6e4;
  const end = Number(cls.scheduledEndAt || start + durationMs);
  const joinBeforeMs = Number(cls.joinWindowMinutesBefore ?? 15) * 6e4;
  if (now > end + 10 * 6e4) return "completed";
  if (now >= start - joinBeforeMs && now <= end + 10 * 6e4) return "live";
  return "published";
}
async function dispatchLiveClassNotifications(params) {
  const { db, messaging, classData, reminderType, customTitle, customBody } = params;
  const classId = String(classData.id);
  const deliveryKey = reminderType === "manual" ? `${classId}__manual_${Date.now()}` : `${classId}__${reminderType}`;
  if (reminderType !== "manual") {
    const lockRef = db.collection("notificationDeliveries").doc(deliveryKey);
    const acquired = await db.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (snap.exists) return false;
      tx.set(lockRef, {
        deliveryKey,
        liveClassId: classId,
        courseId: classData.courseId,
        reminderType,
        createdAt: Date.now()
      });
      return true;
    });
    if (!acquired) {
      return { sent: false, skippedDuplicate: true, tokenCount: 0, deliveredCount: 0 };
    }
  }
  const whenStr = formatClassDateTime(Number(classData.scheduledStartAt));
  let title = customTitle?.trim() || "";
  let body = customBody?.trim() || "";
  let badge = "LIVE CLASS";
  if (!title) {
    if (reminderType === "published") {
      title = `\u{1F534} New Live Class: ${classData.title}`;
      badge = "LIVE CLASS";
    } else if (reminderType === "30m") {
      title = `\u23F0 Starts in 30 mins: ${classData.title}`;
      badge = "30M REMINDER";
    } else if (reminderType === "5m") {
      title = `\u{1F6A8} Starting in 5 mins: ${classData.title}`;
      badge = "JOIN SOON";
    } else {
      title = `\u{1F4E2} Live Class Update: ${classData.title}`;
      badge = "LIVE UPDATE";
    }
  }
  if (!body) {
    body = `${classData.courseTitle || "Course"} \u2022 ${whenStr} (${classData.durationMinutes || 40} min). Tap to open Live Class.`;
  }
  const targetUrl = `/?tab=live&classId=${encodeURIComponent(classId)}`;
  const notifRef = db.collection("notifications").doc();
  const now = Date.now();
  await notifRef.set({
    id: notifRef.id,
    title,
    body,
    type: reminderType === "30m" || reminderType === "5m" ? "live_reminder" : "live_class",
    badge,
    url: targetUrl,
    target: "course_enrolled",
    courseId: classData.courseId,
    courseTitle: classData.courseTitle || "",
    liveClassId: classId,
    deliveryKey,
    reminderType,
    author: classData.instructorName || "HamroLms",
    createdAt: now
  });
  if (reminderType === "30m") {
    await db.collection("liveClasses").doc(classId).set({ reminder30mSent: true }, { merge: true }).catch(() => {
    });
  } else if (reminderType === "5m") {
    await db.collection("liveClasses").doc(classId).set({ reminder5mSent: true }, { merge: true }).catch(() => {
    });
  }
  let tokenCount = 0;
  let deliveredCount = 0;
  if (messaging) {
    try {
      const targetCourseId = String(classData.courseId || "").trim();
      const filterCourses = targetCourseId && targetCourseId !== "course-all" ? [targetCourseId, "course-all"] : ["course-all"];
      const fcmSnap = await db.collection("fcmTokens").where("enrolledCourseIds", "array-contains-any", filterCourses).limit(1e3).get();
      const targetTokens = [];
      for (const docSnap of fcmSnap.docs) {
        const d = docSnap.data();
        const token = typeof d.token === "string" ? d.token.trim() : "";
        if (!token) continue;
        targetTokens.push({ docId: docSnap.id, token });
      }
      tokenCount = targetTokens.length;
      if (targetTokens.length > 0) {
        for (let i = 0; i < targetTokens.length; i += 500) {
          const chunk = targetTokens.slice(i, i + 500);
          const response = await messaging.sendEachForMulticast({
            tokens: chunk.map((t) => t.token),
            notification: {
              title,
              body
            },
            data: {
              url: targetUrl,
              liveClassId: classId,
              courseId: String(classData.courseId || ""),
              courseTitle: String(classData.courseTitle || ""),
              deliveryKey,
              reminderType,
              title,
              body
            },
            webpush: {
              notification: {
                title,
                body,
                icon: "/pwa-192x192.png",
                badge: "/pwa-192x192.png",
                tag: deliveryKey,
                requireInteraction: reminderType === "5m"
              },
              fcmOptions: {
                link: targetUrl
              }
            }
          });
          deliveredCount += response.successCount;
          const invalidDeletes = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const code = resp.error?.code || "";
              if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
                invalidDeletes.push(
                  db.collection("fcmTokens").doc(chunk[idx].docId).delete().catch(() => {
                  })
                );
              }
            }
          });
          if (invalidDeletes.length > 0) await Promise.all(invalidDeletes);
        }
      }
    } catch (fcmErr) {
      console.warn("[FCM] Multicast send warning:", fcmErr);
    }
  }
  return { sent: true, skippedDuplicate: false, tokenCount, deliveredCount };
}
function createLiveClassRouter(deps = {}) {
  const router = express.Router();
  const resolveDb = deps.getDb || getAdminDb;
  const resolveAuth = deps.getAuth || getAdminAuth;
  const resolveMessaging = deps.getMessaging || getAdminMessaging;
  const zoomApi = deps.zoomApi || {
    isConfigured: isZoomConfigured,
    createMeeting: createZoomMeeting,
    updateMeeting: updateZoomMeeting,
    deleteMeeting: deleteZoomMeeting,
    verifyConnection: verifyZoomConnection
  };
  const createMeetSpaceFn = deps.createGoogleMeetSpace || createGoogleMeetSpace;
  const joinLimiter = createRateLimiter({ windowMs: 6e4, maxRequests: 25, keyPrefix: "join" });
  const adminMutationLimiter = createRateLimiter({ windowMs: 6e4, maxRequests: 30, keyPrefix: "admin" });
  router.get("/health", (_req, res) => {
    const db = resolveDb();
    const messaging = resolveMessaging();
    res.json({
      zoomConfigured: zoomApi.isConfigured(),
      googleMeetSupported: true,
      firebaseAdminConfigured: Boolean(db),
      restFallbackActive: !db,
      fcmConfigured: Boolean(messaging),
      cronConfigured: Boolean(process.env.CRON_SECRET),
      databaseId: getConfiguredDatabaseId(),
      initError: db ? null : getFirebaseAdminInitError()
    });
  });
  router.post("/verify-zoom", adminMutationLimiter, async (req, res) => {
    try {
      const db = getRequestDb(req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) {
        return res.status(403).json({ error: "Only verified Admin or Sub-Admin can test Zoom credentials." });
      }
      const verifyFn = zoomApi.verifyConnection || verifyZoomConnection;
      await verifyFn();
      return res.json({
        ok: true,
        message: "Zoom Server-to-Server OAuth credentials are active and verified."
      });
    } catch (err) {
      return res.json({
        ok: false,
        code: err instanceof ZoomApiError ? err.code : "ZOOM_OAUTH_ERROR",
        error: err?.message || "Zoom verification failed."
      });
    }
  });
  function getRequestDb(req) {
    const adminDb = resolveDb();
    if (adminDb) return adminDb;
    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    return createRestFirestore(idToken);
  }
  function handleRouteError(res, fallbackMsg, err) {
    const msg = String(err?.message || "");
    if (msg.includes("PERMISSION_DENIED") || msg.includes("Missing or insufficient permissions") || err?.code === 7) {
      const initReason = getFirebaseAdminInitError();
      const detail = initReason ? ` (${initReason})` : "";
      return res.status(403).json({
        error: `Firestore permission denied in REST mode. Update FIREBASE_SERVICE_ACCOUNT_JSON to match the configured Firebase project or sign in with your Admin Email account.${detail}`,
        code: "FIRESTORE_PERMISSION_DENIED"
      });
    }
    return res.status(500).json({ error: msg || fallbackMsg });
  }
  function requireDb(_res, req) {
    if (req) return getRequestDb(req);
    const adminDb = resolveDb();
    return adminDb || createRestFirestore();
  }
  router.post("/fcm-token", async (req, res) => {
    try {
      const db = getRequestDb(req);
      const token = String(req.body?.token || "").trim();
      if (!token || token.length < 20 || token.length > 4096) {
        return res.status(400).json({ error: "Valid FCM device token is required." });
      }
      const adminAuth = resolveAuth();
      const studentCtx = await verifyStudentEnrollment(req, db, adminAuth);
      const tokenDocId = crypto4.createHash("sha256").update(token).digest("hex").slice(0, 40);
      try {
        await db.collection("fcmTokens").doc(tokenDocId).set(
          {
            token,
            userId: studentCtx.userId || String(req.headers["x-student-uid"] || req.headers["x-device-id"] || "anonymous"),
            enrolledCourseIds: studentCtx.enrolledCourseIds || [],
            activationCode: studentCtx.activationCode || "",
            platform: String(req.body?.platform || "web").slice(0, 40),
            isPwa: Boolean(req.body?.isPwa),
            updatedAt: Date.now()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("[FCM] Backend token write skipped/denied:", err?.message || err);
      }
      res.json({
        success: true,
        enrolledCourseIds: studentCtx.enrolledCourseIds
      });
    } catch (err) {
      return handleRouteError(res, "Failed to register FCM token.", err);
    }
  });
  router.get("/", async (req, res) => {
    let db = getRequestDb(req);
    try {
      const adminAuth = resolveAuth();
      const adminCtx = await verifyAdminIdentity(req, db, adminAuth);
      const studentCtx = adminCtx ? null : await verifyStudentEnrollment(req, db, adminAuth);
      const isRestDb = Boolean(db.isRestFallback);
      let rawDocs = [];
      try {
        if (isRestDb && !adminCtx) {
          const publicRestDb = createRestFirestore();
          const snap = await publicRestDb.collection("liveClasses").where("status", "!=", "draft").get();
          rawDocs = snap.docs;
        } else {
          const snap = await db.collection("liveClasses").orderBy("scheduledStartAt", "asc").get();
          rawDocs = snap.docs;
        }
      } catch (queryErr) {
        const msg = String(queryErr?.message || "");
        if (!isRestDb && (msg.includes("PERMISSION_DENIED") || queryErr?.code === 7)) {
          markAdminSdkUnusable(msg);
          const authHeader = String(req.headers.authorization || "");
          const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
          db = createRestFirestore(adminCtx?.email ? idToken : void 0);
          const fallbackSnap = adminCtx ? await db.collection("liveClasses").orderBy("scheduledStartAt", "asc").get() : await db.collection("liveClasses").where("status", "!=", "draft").get();
          rawDocs = fallbackSnap.docs;
        } else {
          throw queryErr;
        }
      }
      rawDocs.sort(
        (a, b) => Number(a.data()?.scheduledStartAt || 0) - Number(b.data()?.scheduledStartAt || 0)
      );
      const now = Date.now();
      const items = [];
      for (const docSnap of rawDocs) {
        const data = docSnap.data();
        if (adminCtx?.role === "sub_admin" && adminCtx.assignedCourseId && data.courseId !== adminCtx.assignedCourseId) {
          continue;
        }
        if (!adminCtx && data.status === "draft") {
          continue;
        }
        const effectiveStatus = computeEffectiveStatus(data, now);
        const safeItem = {
          id: docSnap.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          title: data.title,
          description: data.description || "",
          instructorName: data.instructorName || "HamroLms",
          provider: normalizeProvider(data.provider, "zoom"),
          scheduledStartAt: Number(data.scheduledStartAt),
          durationMinutes: Number(data.durationMinutes || 40),
          scheduledEndAt: Number(data.scheduledEndAt || Number(data.scheduledStartAt) + Number(data.durationMinutes || 40) * 6e4),
          maxCapacity: Number(data.maxCapacity || 80),
          registeredCount: Number(data.registeredCount || 0),
          status: effectiveStatus,
          joinWindowMinutesBefore: Number(data.joinWindowMinutesBefore ?? 15),
          zoomCreated: Boolean(data.zoomCreated),
          zoomMeetingStatus: data.zoomMeetingStatus || (data.zoomCreated ? "created" : "pending"),
          zoomMeetingIdMasked: data.zoomMeetingIdMasked || "",
          zoomError: adminCtx ? data.zoomError || "" : void 0,
          sendReminder30m: Boolean(data.sendReminder30m),
          sendReminder5m: Boolean(data.sendReminder5m),
          reminder30mSent: Boolean(data.reminder30mSent),
          reminder5mSent: Boolean(data.reminder5mSent),
          publishedAt: data.publishedAt || null,
          createdAt: Number(data.createdAt || 0),
          updatedAt: Number(data.updatedAt || 0)
        };
        if (adminCtx && data.zoomCreated) {
          try {
            const secSnap = await db.collection("liveClassSecrets").doc(docSnap.id).get();
            if (secSnap.exists) {
              const sec = secSnap.data();
              safeItem.zoomMeetingId = sec.zoomMeetingId || "";
              safeItem.zoomPasscode = sec.zoomPasscode || "";
              safeItem.zoomStartUrl = sec.zoomStartUrl || "";
            }
          } catch {
          }
        }
        if (studentCtx?.authorized && studentCtx.userId) {
          try {
            const regSnap = await db.collection("liveClasses").doc(docSnap.id).collection("registrations").doc(sanitizeId(studentCtx.userId)).get();
            safeItem.isRegistered = regSnap.exists;
          } catch {
            safeItem.isRegistered = false;
          }
        }
        items.push(safeItem);
      }
      res.json({
        classes: items,
        role: adminCtx?.role || (studentCtx?.authorized ? "student" : "guest")
      });
    } catch (err) {
      console.error("[LiveClasses] List error:", err);
      return handleRouteError(res, "Failed to load live classes.", err);
    }
  });
  router.post("/", adminMutationLimiter, async (req, res) => {
    const db = requireDb(res, req);
    const adminAuth = resolveAuth();
    const adminCtx = await verifyAdminIdentity(req, db, adminAuth);
    if (!adminCtx) {
      return res.status(403).json({ error: "Unauthorized: Admin verification required." });
    }
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const courseId = String(req.body?.courseId || "").trim();
    const instructorName = String(req.body?.instructorName || adminCtx.name || "HamroLms").trim();
    const scheduledStartAt = Number(req.body?.scheduledStartAt || 0);
    const durationMinutes = Math.min(Math.max(Number(req.body?.durationMinutes || 40), 10), 300);
    const maxCapacity = Math.min(Math.max(Number(req.body?.maxCapacity || 80), 1), 1e3);
    const joinWindowMinutesBefore = Math.min(Math.max(Number(req.body?.joinWindowMinutesBefore ?? 15), 0), 120);
    const sendReminder30m = req.body?.sendReminder30m !== false;
    const sendReminder5m = req.body?.sendReminder5m !== false;
    const publishNow = Boolean(req.body?.publishNow ?? req.body?.publishImmediately);
    const idempotencyKey = String(req.body?.idempotencyKey || "").trim().slice(0, 128);
    const provider = normalizeProvider(req.body?.provider, "zoom");
    const manualMeetingUrl = String(req.body?.manualMeetingUrl || "").trim();
    const manualMeetingId = String(req.body?.manualMeetingId || "").trim();
    const manualPasscode = String(req.body?.manualPasscode || "").trim();
    if (!title || title.length < 3 || title.length > 200) {
      return res.status(400).json({ error: "Class title must be between 3 and 200 characters." });
    }
    if (!courseId) {
      return res.status(400).json({ error: "Please select an existing course." });
    }
    if (!scheduledStartAt || Number.isNaN(scheduledStartAt)) {
      return res.status(400).json({ error: "Valid class date and start time are required." });
    }
    if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId && adminCtx.assignedCourseId !== courseId) {
      return res.status(403).json({ error: "Sub-Admin can only create live classes for their assigned course." });
    }
    if (provider === "manual" && !/^https?:\/\/\S+/i.test(manualMeetingUrl)) {
      return res.status(400).json({
        error: "Please enter a valid live meeting URL starting with https:// or http://.",
        code: "MANUAL_URL_REQUIRED"
      });
    }
    try {
      if (idempotencyKey) {
        try {
          const dupSnap = await db.collection("liveClasses").where("idempotencyKey", "==", idempotencyKey).limit(1).get();
          if (!dupSnap.empty) {
            const existingDoc = dupSnap.docs[0];
            const existingData = existingDoc.data();
            const secSnap = await db.collection("liveClassSecrets").doc(existingDoc.id).get().catch(() => null);
            const sec = secSnap?.exists ? secSnap.data() : {};
            return res.status(200).json({
              deduplicated: true,
              liveClass: {
                id: existingDoc.id,
                ...existingData,
                provider: normalizeProvider(existingData?.provider, "zoom"),
                zoomMeetingId: sec?.zoomMeetingId || "",
                zoomPasscode: sec?.zoomPasscode || "",
                zoomStartUrl: sec?.zoomStartUrl || ""
              }
            });
          }
        } catch {
        }
      }
      const courseSnap = await db.collection("courses").doc(courseId).get();
      if (adminCtx.role === "sub_admin" && courseSnap.exists && !courseSnap.data()?.hasLiveSessions) {
        return res.status(403).json({
          error: "Live Classes are not enabled for this course by Main Admin.",
          code: "LIVE_NOT_ENABLED_BY_ADMIN"
        });
      }
      const courseTitle = courseSnap.exists ? String(courseSnap.data()?.title || req.body?.courseTitle || courseId) : String(req.body?.courseTitle || courseId);
      const classRef = db.collection("liveClasses").doc();
      const classId = classRef.id;
      let meetingResult = null;
      let providerError = "";
      if (provider === "builtin") {
        const roomUrl = `/?tab=live&classId=${encodeURIComponent(classId)}`;
        meetingResult = {
          meetingId: `ROOM-${classId.slice(0, 8).toUpperCase()}`,
          joinUrl: roomUrl,
          startUrl: roomUrl,
          password: "",
          hostEmail: adminCtx.email || ""
        };
      } else if (provider === "google_meet") {
        try {
          const accessToken = extractGoogleMeetToken(req);
          const space = await createMeetSpaceFn(accessToken);
          meetingResult = {
            meetingId: space.meetingCode,
            joinUrl: space.meetingUri,
            startUrl: space.meetingUri,
            password: "",
            hostEmail: adminCtx.email || "",
            meetSpaceName: space.spaceName
          };
        } catch (mErr) {
          providerError = mErr?.message || "Google Meet space creation failed.";
          console.warn("[GoogleMeet] Create space warning:", providerError);
          if (publishNow) {
            return res.status(mErr instanceof GoogleMeetApiError ? mErr.statusCode : 502).json({
              error: providerError,
              code: mErr instanceof GoogleMeetApiError ? mErr.code : "GOOGLE_MEET_ERROR"
            });
          }
        }
      } else if (provider === "manual") {
        meetingResult = {
          meetingId: manualMeetingId || "Direct Link",
          joinUrl: manualMeetingUrl,
          startUrl: manualMeetingUrl,
          password: manualPasscode,
          hostEmail: adminCtx.email || ""
        };
      } else {
        try {
          const z = await zoomApi.createMeeting({
            topic: `${title} \u2014 ${courseTitle}`,
            agenda: description || `Live Class for ${courseTitle}`,
            startTimeMs: scheduledStartAt,
            durationMinutes
          });
          meetingResult = {
            meetingId: z.meetingId,
            joinUrl: z.joinUrl,
            startUrl: z.startUrl,
            password: z.password,
            hostEmail: z.hostEmail || ""
          };
        } catch (zErr) {
          providerError = zErr?.message || "Zoom meeting creation failed.";
          console.warn("[Zoom] Create meeting warning:", providerError);
          if (publishNow) {
            return res.status(zErr instanceof ZoomApiError ? zErr.statusCode : 502).json({
              error: `Zoom API Error: ${providerError}`,
              code: zErr instanceof ZoomApiError ? zErr.code : "ZOOM_ERROR"
            });
          }
        }
      }
      const now = Date.now();
      const scheduledEndAt = scheduledStartAt + durationMinutes * 6e4;
      const initialStatus = publishNow && meetingResult ? "published" : "draft";
      const classDoc = {
        id: classId,
        courseId,
        courseTitle,
        title,
        description,
        instructorName,
        provider,
        scheduledStartAt,
        durationMinutes,
        scheduledEndAt,
        maxCapacity,
        registeredCount: 0,
        status: initialStatus,
        joinWindowMinutesBefore,
        zoomCreated: Boolean(meetingResult),
        zoomMeetingStatus: meetingResult ? "created" : "failed",
        zoomMeetingIdMasked: meetingResult ? maskMeetingId(meetingResult.meetingId) : "",
        zoomError: providerError || "",
        idempotencyKey: idempotencyKey || classId,
        sendReminder30m,
        sendReminder5m,
        reminder30mSent: false,
        reminder5mSent: false,
        publishedAt: initialStatus === "published" ? now : null,
        createdBy: adminCtx.uid,
        createdByRole: adminCtx.role,
        createdAt: now,
        updatedAt: now
      };
      await classRef.set(classDoc);
      if (meetingResult) {
        await db.collection("liveClassSecrets").doc(classId).set({
          liveClassId: classId,
          provider,
          zoomMeetingId: meetingResult.meetingId,
          zoomJoinUrl: meetingResult.joinUrl,
          zoomStartUrl: meetingResult.startUrl,
          zoomPasscode: meetingResult.password,
          hostEmail: meetingResult.hostEmail || "",
          ...meetingResult.meetSpaceName ? { meetSpaceName: meetingResult.meetSpaceName } : {},
          createdAt: now,
          updatedAt: now
        });
      }
      let notificationResult = null;
      if (initialStatus === "published") {
        notificationResult = await dispatchLiveClassNotifications({
          db,
          messaging: resolveMessaging(),
          classData: classDoc,
          reminderType: "published"
        });
      }
      res.status(201).json({
        success: true,
        liveClass: {
          ...classDoc,
          zoomMeetingId: meetingResult?.meetingId || "",
          zoomPasscode: meetingResult?.password || "",
          zoomStartUrl: meetingResult?.startUrl || ""
        },
        notificationResult,
        zoomWarning: providerError || void 0
      });
    } catch (err) {
      console.error("[LiveClasses] Create error:", err);
      return handleRouteError(res, "Failed to create live class.", err);
    }
  });
  router.post("/:id/retry-zoom", adminMutationLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const data = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      const secSnap = await db.collection("liveClassSecrets").doc(classId).get();
      if (secSnap.exists && secSnap.data()?.zoomMeetingId) {
        const sec = secSnap.data();
        return res.json({
          success: true,
          deduplicated: true,
          provider: normalizeProvider(sec.provider || data.provider, "zoom"),
          zoomMeetingId: sec.zoomMeetingId,
          zoomPasscode: sec.zoomPasscode,
          zoomStartUrl: sec.zoomStartUrl
        });
      }
      const targetProvider = normalizeProvider(req.body?.provider, normalizeProvider(data.provider, "zoom"));
      try {
        let meetingResult;
        if (targetProvider === "builtin") {
          const roomUrl = `/?tab=live&classId=${encodeURIComponent(classId)}`;
          meetingResult = {
            meetingId: `ROOM-${classId.slice(0, 8).toUpperCase()}`,
            joinUrl: roomUrl,
            startUrl: roomUrl,
            password: "",
            hostEmail: adminCtx.email || ""
          };
        } else if (targetProvider === "google_meet") {
          const accessToken = extractGoogleMeetToken(req);
          const space = await createMeetSpaceFn(accessToken);
          meetingResult = {
            meetingId: space.meetingCode,
            joinUrl: space.meetingUri,
            startUrl: space.meetingUri,
            password: "",
            hostEmail: adminCtx.email || "",
            meetSpaceName: space.spaceName
          };
        } else if (targetProvider === "manual") {
          const manualMeetingUrl = String(req.body?.manualMeetingUrl || "").trim();
          if (!/^https?:\/\/\S+/i.test(manualMeetingUrl)) {
            return res.status(400).json({
              error: "Please enter a valid live meeting URL starting with https:// or http://.",
              code: "MANUAL_URL_REQUIRED"
            });
          }
          meetingResult = {
            meetingId: String(req.body?.manualMeetingId || "").trim() || "Direct Link",
            joinUrl: manualMeetingUrl,
            startUrl: manualMeetingUrl,
            password: String(req.body?.manualPasscode || "").trim(),
            hostEmail: adminCtx.email || ""
          };
        } else {
          const z = await zoomApi.createMeeting({
            topic: `${data.title} \u2014 ${data.courseTitle || data.courseId}`,
            agenda: data.description || "",
            startTimeMs: Number(data.scheduledStartAt),
            durationMinutes: Number(data.durationMinutes || 40)
          });
          meetingResult = {
            meetingId: z.meetingId,
            joinUrl: z.joinUrl,
            startUrl: z.startUrl,
            password: z.password,
            hostEmail: z.hostEmail || ""
          };
        }
        const now = Date.now();
        await db.collection("liveClassSecrets").doc(classId).set({
          liveClassId: classId,
          provider: targetProvider,
          zoomMeetingId: meetingResult.meetingId,
          zoomJoinUrl: meetingResult.joinUrl,
          zoomStartUrl: meetingResult.startUrl,
          zoomPasscode: meetingResult.password,
          hostEmail: meetingResult.hostEmail || "",
          ...meetingResult.meetSpaceName ? { meetSpaceName: meetingResult.meetSpaceName } : {},
          createdAt: now,
          updatedAt: now
        });
        await classRef.set(
          {
            provider: targetProvider,
            zoomCreated: true,
            zoomMeetingStatus: "created",
            zoomMeetingIdMasked: maskMeetingId(meetingResult.meetingId),
            zoomError: "",
            updatedAt: now
          },
          { merge: true }
        );
        res.json({
          success: true,
          provider: targetProvider,
          zoomMeetingId: meetingResult.meetingId,
          zoomPasscode: meetingResult.password,
          zoomStartUrl: meetingResult.startUrl
        });
      } catch (pErr) {
        const errMsg = pErr?.message || "Meeting sync failed.";
        await classRef.set(
          {
            provider: targetProvider,
            zoomCreated: false,
            zoomMeetingStatus: "failed",
            zoomError: errMsg,
            updatedAt: Date.now()
          },
          { merge: true }
        ).catch(() => {
        });
        const statusCode = pErr instanceof GoogleMeetApiError ? pErr.statusCode : pErr instanceof ZoomApiError ? pErr.statusCode : 502;
        const code = pErr instanceof GoogleMeetApiError ? pErr.code : pErr instanceof ZoomApiError ? pErr.code : "MEETING_SYNC_FAILED";
        res.status(statusCode).json({ error: errMsg, code });
      }
    } catch (err) {
      console.error("[LiveClasses] Retry meeting sync error:", err);
      return handleRouteError(res, "Failed to retry meeting sync.", err);
    }
  });
  router.patch("/:id", adminMutationLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const existing = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== existing.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      const title = req.body?.title !== void 0 ? String(req.body.title).trim() : existing.title;
      const description = req.body?.description !== void 0 ? String(req.body.description).trim() : existing.description;
      const courseId = req.body?.courseId !== void 0 ? String(req.body.courseId).trim() : existing.courseId;
      const instructorName = req.body?.instructorName !== void 0 ? String(req.body.instructorName).trim() : existing.instructorName;
      const scheduledStartAt = req.body?.scheduledStartAt !== void 0 ? Number(req.body.scheduledStartAt) : Number(existing.scheduledStartAt);
      const durationMinutes = req.body?.durationMinutes !== void 0 ? Math.min(Math.max(Number(req.body.durationMinutes), 10), 300) : Number(existing.durationMinutes || 40);
      const maxCapacity = req.body?.maxCapacity !== void 0 ? Math.min(Math.max(Number(req.body.maxCapacity), Math.max(1, Number(existing.registeredCount || 0))), 1e3) : Number(existing.maxCapacity || 80);
      const joinWindowMinutesBefore = req.body?.joinWindowMinutesBefore !== void 0 ? Math.min(Math.max(Number(req.body.joinWindowMinutesBefore), 0), 120) : Number(existing.joinWindowMinutesBefore ?? 15);
      let courseTitle = existing.courseTitle;
      if (courseId !== existing.courseId || req.body?.courseTitle) {
        const courseSnap = await db.collection("courses").doc(courseId).get();
        courseTitle = courseSnap.exists ? String(courseSnap.data()?.title || req.body?.courseTitle || courseId) : String(req.body?.courseTitle || courseTitle);
      }
      const secSnap = await db.collection("liveClassSecrets").doc(classId).get();
      if (normalizeProvider(existing.provider, "zoom") === "zoom" && secSnap.exists && secSnap.data()?.zoomMeetingId) {
        try {
          await zoomApi.updateMeeting(secSnap.data().zoomMeetingId, {
            topic: `${title} \u2014 ${courseTitle}`,
            agenda: description,
            startTimeMs: scheduledStartAt,
            durationMinutes
          });
        } catch (zErr) {
          console.warn("[Zoom] Update meeting warning:", zErr?.message);
        }
      }
      const now = Date.now();
      const updates = {
        title,
        description,
        courseId,
        courseTitle,
        instructorName,
        scheduledStartAt,
        durationMinutes,
        scheduledEndAt: scheduledStartAt + durationMinutes * 6e4,
        maxCapacity,
        joinWindowMinutesBefore,
        sendReminder30m: req.body?.sendReminder30m !== void 0 ? Boolean(req.body.sendReminder30m) : Boolean(existing.sendReminder30m),
        sendReminder5m: req.body?.sendReminder5m !== void 0 ? Boolean(req.body.sendReminder5m) : Boolean(existing.sendReminder5m),
        updatedAt: now
      };
      await classRef.set(updates, { merge: true });
      res.json({ success: true, liveClass: { ...existing, ...updates, id: classId } });
    } catch (err) {
      console.error("[LiveClasses] Update error:", err);
      return handleRouteError(res, "Failed to update live class.", err);
    }
  });
  router.post("/:id/publish", adminMutationLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const data = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      if (!data.zoomCreated) {
        return res.status(400).json({
          error: "Cannot publish before a meeting link is created. Sync or retry first."
        });
      }
      const now = Date.now();
      await classRef.set(
        {
          status: "published",
          publishedAt: data.publishedAt || now,
          updatedAt: now
        },
        { merge: true }
      );
      const notificationResult = await dispatchLiveClassNotifications({
        db,
        messaging: resolveMessaging(),
        classData: { ...data, id: classId, status: "published" },
        reminderType: "published"
      });
      res.json({
        success: true,
        status: "published",
        notificationResult
      });
    } catch (err) {
      console.error("[LiveClasses] Publish error:", err);
      return handleRouteError(res, "Failed to publish live class.", err);
    }
  });
  router.post("/:id/notify", adminMutationLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classSnap = await db.collection("liveClasses").doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const data = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      const reminderType = ["published", "30m", "5m", "manual"].includes(req.body?.reminderType) ? req.body.reminderType : "manual";
      const result = await dispatchLiveClassNotifications({
        db,
        messaging: resolveMessaging(),
        classData: { ...data, id: classId },
        reminderType,
        customTitle: req.body?.title,
        customBody: req.body?.body
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("[LiveClasses] Notify error:", err);
      return handleRouteError(res, "Failed to send notifications.", err);
    }
  });
  router.post("/:id/cancel", adminMutationLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const data = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      await classRef.set({ status: "cancelled", updatedAt: Date.now() }, { merge: true });
      const secSnap = await db.collection("liveClassSecrets").doc(classId).get();
      if (normalizeProvider(data.provider, "zoom") === "zoom" && secSnap.exists && secSnap.data()?.zoomMeetingId) {
        await zoomApi.deleteMeeting(secSnap.data().zoomMeetingId).catch(() => {
        });
      }
      if (req.body?.notifyStudents !== false && data.status === "published") {
        const reasonSuffix = req.body?.reason ? ` Reason: ${String(req.body.reason).trim()}` : "";
        await dispatchLiveClassNotifications({
          db,
          messaging: resolveMessaging(),
          classData: { ...data, id: classId },
          reminderType: "manual",
          customTitle: `\u274C Live Class Cancelled: ${data.title}`,
          customBody: `${data.courseTitle || "Course"} live class scheduled for ${formatClassDateTime(Number(data.scheduledStartAt))} has been cancelled.${reasonSuffix}`
        });
      }
      res.json({ success: true, status: "cancelled" });
    } catch (err) {
      console.error("[LiveClasses] Cancel error:", err);
      return handleRouteError(res, "Failed to cancel live class.", err);
    }
  });
  router.delete("/:id", adminMutationLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const data = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      const secRef = db.collection("liveClassSecrets").doc(classId);
      const secSnap = await secRef.get();
      if (normalizeProvider(data.provider, "zoom") === "zoom" && secSnap.exists && secSnap.data()?.zoomMeetingId) {
        await zoomApi.deleteMeeting(secSnap.data().zoomMeetingId).catch(() => {
        });
      }
      const regSnap = await classRef.collection("registrations").get();
      await Promise.all(regSnap.docs.map((d) => d.ref.delete()));
      await secRef.delete().catch(() => {
      });
      await classRef.delete();
      res.json({ success: true });
    } catch (err) {
      console.error("[LiveClasses] Delete error:", err);
      return handleRouteError(res, "Failed to delete live class.", err);
    }
  });
  router.get("/:id/participants", async (req, res) => {
    try {
      const db = requireDb(res, req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: "Admin verification required." });
      const classId = sanitizeId(req.params.id);
      const classSnap = await db.collection("liveClasses").doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const classData = classSnap.data();
      if (adminCtx.role === "sub_admin" && adminCtx.assignedCourseId !== classData.courseId) {
        return res.status(403).json({ error: "Unauthorized for this course." });
      }
      const regSnap = await db.collection("liveClasses").doc(classId).collection("registrations").orderBy("registeredAt", "desc").get();
      const registrations = regSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const keysSnap = await db.collection("activation_keys").where("status", "==", "used").get();
      const now = Date.now();
      const enrolledStudents = [];
      const seenStudents = /* @__PURE__ */ new Set();
      keysSnap.forEach((docSnap) => {
        const k = docSnap.data();
        if (isActivationKeyExpiredServer(k, now)) return;
        if (k.courseId !== classData.courseId && k.courseId !== "course-all") return;
        const key = String(k.claimedByUid || docSnap.id);
        if (seenStudents.has(key)) return;
        seenStudents.add(key);
        enrolledStudents.push({
          code: docSnap.id,
          studentName: k.studentName || k.claimedByName || "Enrolled Student",
          studentEmail: k.claimedByEmail || "",
          courseTitle: k.courseTitle || classData.courseTitle,
          claimedAt: k.claimedAt || null,
          expiresAt: k.expiresAt || null
        });
      });
      res.json({
        liveClassId: classId,
        registeredCount: Number(classData.registeredCount || registrations.length),
        maxCapacity: Number(classData.maxCapacity || 80),
        participants: registrations,
        registrations,
        enrolledStudents
      });
    } catch (err) {
      console.error("[LiveClasses] Participants error:", err);
      return handleRouteError(res, "Failed to fetch participants.", err);
    }
  });
  router.post("/:id/register", joinLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const classData = classSnap.data();
      const adminAuth = resolveAuth();
      const studentCtx = await verifyStudentEnrollment(req, db, adminAuth, classData.courseId);
      if (!studentCtx.authorized) {
        return res.status(403).json({
          error: studentCtx.reason || "Access denied: Verified course enrollment is required.",
          code: "ENROLLMENT_REQUIRED"
        });
      }
      const effectiveStatus = computeEffectiveStatus(classData);
      if (effectiveStatus === "cancelled" || effectiveStatus === "completed" || effectiveStatus === "draft") {
        return res.status(400).json({ error: `Cannot register: Class is currently ${effectiveStatus}.` });
      }
      const regDocId = sanitizeId(studentCtx.userId);
      const regRef = classRef.collection("registrations").doc(regDocId);
      try {
        const txResult = await db.runTransaction(async (tx) => {
          const freshClass = await tx.get(classRef);
          if (!freshClass.exists) throw new Error("CLASS_NOT_FOUND");
          const cData = freshClass.data();
          const existingReg = await tx.get(regRef);
          if (existingReg.exists) {
            return {
              alreadyRegistered: true,
              registeredCount: Number(cData.registeredCount || 0),
              maxCapacity: Number(cData.maxCapacity || 80)
            };
          }
          const currentCount = Number(cData.registeredCount || 0);
          const maxCap = Number(cData.maxCapacity || 80);
          if (currentCount >= maxCap) {
            const capErr = new Error(`Class capacity is full (${maxCap}/${maxCap} students).`);
            capErr.code = "CAPACITY_FULL";
            throw capErr;
          }
          const nextCount = currentCount + 1;
          tx.set(regRef, {
            id: regDocId,
            liveClassId: classId,
            userId: studentCtx.userId,
            studentName: studentCtx.studentName,
            studentEmail: studentCtx.studentEmail || "",
            activationCode: studentCtx.activationCode || "",
            courseId: classData.courseId,
            status: "registered",
            registeredAt: Date.now()
          });
          tx.update(classRef, {
            registeredCount: nextCount,
            updatedAt: Date.now()
          });
          return {
            alreadyRegistered: false,
            registeredCount: nextCount,
            maxCapacity: maxCap
          };
        });
        res.json({ success: true, ...txResult });
      } catch (err) {
        if (err?.code === "CAPACITY_FULL") {
          return res.status(409).json({ error: err.message, code: "CAPACITY_FULL" });
        }
        return handleRouteError(res, "Registration failed.", err);
      }
    } catch (err) {
      console.error("[LiveClasses] Register error:", err);
      return handleRouteError(res, "Registration failed.", err);
    }
  });
  router.post("/:id/join", joinLimiter, async (req, res) => {
    try {
      const db = requireDb(res, req);
      const classId = sanitizeId(req.params.id);
      const classRef = db.collection("liveClasses").doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: "Live class not found." });
      const classData = classSnap.data();
      const adminAuth = resolveAuth();
      const studentCtx = await verifyStudentEnrollment(req, db, adminAuth, classData.courseId);
      if (!studentCtx.authorized) {
        return res.status(403).json({
          error: studentCtx.reason || "Access denied: Only enrolled students can join this live class.",
          code: "ENROLLMENT_REQUIRED"
        });
      }
      const now = Date.now();
      const effectiveStatus = computeEffectiveStatus(classData, now);
      if (effectiveStatus === "cancelled") {
        return res.status(400).json({ error: "This live class has been cancelled." });
      }
      if (!studentCtx.isAdminBypass) {
        if (effectiveStatus === "draft") {
          return res.status(403).json({ error: "This live class is not published yet." });
        }
        if (effectiveStatus === "completed") {
          return res.status(400).json({ error: "This live class has already ended." });
        }
        const joinOpenAt = Number(classData.scheduledStartAt) - Number(classData.joinWindowMinutesBefore ?? 15) * 6e4;
        if (now < joinOpenAt) {
          return res.status(403).json({
            error: `Joining opens ${classData.joinWindowMinutesBefore ?? 15} minutes before class start.`,
            code: "JOIN_WINDOW_NOT_OPEN"
          });
        }
      }
      const secSnap = await db.collection("liveClassSecrets").doc(classId).get();
      if (!secSnap.exists || !secSnap.data()?.zoomJoinUrl) {
        return res.status(404).json({ error: "Meeting link is not available for this class yet." });
      }
      const sec = secSnap.data();
      let finalCount = Number(classData.registeredCount || 0);
      const maxCap = Number(classData.maxCapacity || 80);
      if (!studentCtx.isAdminBypass) {
        const regDocId = sanitizeId(studentCtx.userId);
        const regRef = classRef.collection("registrations").doc(regDocId);
        try {
          finalCount = await db.runTransaction(async (tx) => {
            const freshClass = await tx.get(classRef);
            const cData = freshClass.data();
            const currentCount = Number(cData.registeredCount || 0);
            const cap = Number(cData.maxCapacity || 80);
            const existingReg = await tx.get(regRef);
            if (existingReg.exists) {
              tx.update(regRef, { status: "joined", joinedAt: now });
              return currentCount;
            }
            if (currentCount >= cap) {
              const capErr = new Error(`Class capacity reached (${cap}/${cap} students).`);
              capErr.code = "CAPACITY_FULL";
              throw capErr;
            }
            const nextCount = currentCount + 1;
            tx.set(regRef, {
              id: regDocId,
              liveClassId: classId,
              userId: studentCtx.userId,
              studentName: studentCtx.studentName,
              studentEmail: studentCtx.studentEmail || "",
              activationCode: studentCtx.activationCode || "",
              courseId: classData.courseId,
              status: "joined",
              registeredAt: now,
              joinedAt: now
            });
            tx.update(classRef, { registeredCount: nextCount, updatedAt: now });
            return nextCount;
          });
        } catch (err) {
          if (err?.code === "CAPACITY_FULL") {
            return res.status(409).json({ error: err.message, code: "CAPACITY_FULL" });
          }
          throw err;
        }
      }
      const resolvedProvider = normalizeProvider(classData.provider, "zoom");
      const participantRole = studentCtx.isAdminBypass ? "mentor" : "student";
      const customName = String(req.body?.displayName || "").trim().slice(0, 60);
      const participantName = customName || (participantRole === "mentor" ? String(classData.instructorName || studentCtx.studentName || "Mentor") : String(studentCtx.studentName || "Student"));
      const scheduledEndAt = Number(
        classData.scheduledEndAt || Number(classData.scheduledStartAt) + Number(classData.durationMinutes || 40) * 6e4
      );
      const roomToken = resolvedProvider === "builtin" ? mintRoomToken({
        classId,
        userId: studentCtx.userId,
        displayName: participantName,
        role: participantRole,
        exp: Date.now() + 6 * 60 * 6e4
      }) : void 0;
      res.json({
        success: true,
        liveClassId: classId,
        provider: resolvedProvider,
        title: classData.title,
        courseTitle: classData.courseTitle,
        joinUrl: sec.zoomJoinUrl,
        startUrl: studentCtx.isAdminBypass ? sec.zoomStartUrl : void 0,
        meetingId: sec.zoomMeetingId,
        passcode: sec.zoomPasscode || "",
        scheduledStartAt: Number(classData.scheduledStartAt),
        scheduledEndAt,
        durationMinutes: Number(classData.durationMinutes || 40),
        registeredCount: finalCount,
        maxCapacity: maxCap,
        roomToken,
        participantName,
        participantRole,
        instructorName: classData.instructorName || "HamroLms Mentor"
      });
    } catch (err) {
      console.error("[LiveClasses] Join error:", err);
      return handleRouteError(res, "Failed to join live class.", err);
    }
  });
  router.get("/:id/room/events", (req, res) => {
    const classId = sanitizeId(req.params.id);
    const token = String(req.query?.roomToken || "").trim();
    const tokenData = verifyRoomToken(token, classId);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired live room session." });
    }
    const peerId = sanitizeId(String(req.query?.peerId || `${tokenData.role}_${tokenData.userId}`)).slice(0, 80);
    const camOn = String(req.query?.camOn || "") === "1";
    const micOn = String(req.query?.micOn || "") === "1";
    subscribeRoomSse({
      tokenData,
      peerId,
      camOn,
      micOn,
      res
    });
  });
  router.post("/:id/room/signal", (req, res) => {
    const classId = sanitizeId(req.params.id);
    const tokenData = verifyRoomToken(String(req.body?.roomToken || ""), classId);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired live room session." });
    }
    const fromPeerId = sanitizeId(String(req.body?.peerId || "")).slice(0, 80);
    const toPeerId = sanitizeId(String(req.body?.toPeerId || "")).slice(0, 80);
    const signal = req.body?.signal;
    if (!fromPeerId || !toPeerId || !signal || typeof signal !== "object") {
      return res.status(400).json({ error: "Valid peerId, toPeerId, and signal are required." });
    }
    const delivered = relayRoomSignal({ classId, fromPeerId, toPeerId, signal });
    res.json({ success: true, delivered });
  });
  router.post("/:id/room/media", (req, res) => {
    const classId = sanitizeId(req.params.id);
    const tokenData = verifyRoomToken(String(req.body?.roomToken || ""), classId);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired live room session." });
    }
    const peerId = sanitizeId(String(req.body?.peerId || "")).slice(0, 80);
    if (!peerId) {
      return res.status(400).json({ error: "peerId is required." });
    }
    const updated = updatePeerMediaState({
      classId,
      peerId,
      camOn: typeof req.body?.camOn === "boolean" ? req.body.camOn : void 0,
      micOn: typeof req.body?.micOn === "boolean" ? req.body.micOn : void 0,
      screenSharing: typeof req.body?.screenSharing === "boolean" ? req.body.screenSharing : void 0,
      handRaised: typeof req.body?.handRaised === "boolean" ? req.body.handRaised : void 0
    });
    res.json({ success: true, peer: updated });
  });
  router.post("/:id/room/chat", (req, res) => {
    const classId = sanitizeId(req.params.id);
    const tokenData = verifyRoomToken(String(req.body?.roomToken || ""), classId);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired live room session." });
    }
    const peerId = sanitizeId(String(req.body?.peerId || "")).slice(0, 80);
    const text = String(req.body?.text || "").trim();
    if (!peerId || !text) {
      return res.status(400).json({ error: "Message text is required." });
    }
    const message = postRoomChatMessage({ tokenData, peerId, text });
    res.json({ success: true, message });
  });
  router.post("/:id/room/leave", (req, res) => {
    const classId = sanitizeId(req.params.id);
    const tokenData = verifyRoomToken(String(req.body?.roomToken || ""), classId);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired live room session." });
    }
    const peerId = sanitizeId(String(req.body?.peerId || "")).slice(0, 80);
    if (peerId) {
      leaveRoomPeer(classId, peerId);
    }
    res.json({ success: true });
  });
  router.post("/:id/room/end", async (req, res) => {
    const classId = sanitizeId(req.params.id);
    const tokenData = verifyRoomToken(String(req.body?.roomToken || ""), classId);
    if (!tokenData) {
      return res.status(401).json({ error: "Invalid or expired live room session." });
    }
    if (tokenData.role !== "mentor") {
      return res.status(403).json({ error: "Only the Mentor or Admin can end the live room." });
    }
    endLiveRoom(classId, tokenData.displayName);
    const db = getRequestDb(req);
    await db.collection("liveClasses").doc(classId).set({ status: "completed", updatedAt: Date.now() }, { merge: true }).catch(() => {
    });
    res.json({ success: true, ended: true });
  });
  async function handleReminderSweep(req, res) {
    try {
      const db = requireDb(res, req);
      const cronSecret = process.env.CRON_SECRET?.trim();
      const providedSecret = String(req.headers["x-cron-secret"] || "").trim() || (String(req.headers.authorization || "").startsWith("Bearer ") ? String(req.headers.authorization).slice(7).trim() : "");
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      const cronAuthorized = Boolean(cronSecret && providedSecret && providedSecret === cronSecret);
      if (!cronAuthorized && !adminCtx) {
        return res.status(403).json({ error: "Unauthorized reminder trigger." });
      }
      const now = Date.now();
      const snap = await db.collection("liveClasses").where("status", "==", "published").get();
      const messaging = resolveMessaging();
      const triggered = [];
      for (const docSnap of snap.docs) {
        const cls = docSnap.data();
        const startAt = Number(cls.scheduledStartAt || 0);
        const minsUntilStart = (startAt - now) / 6e4;
        if (cls.sendReminder30m !== false && !cls.reminder30mSent && minsUntilStart > 10 && minsUntilStart <= 35) {
          const res30 = await dispatchLiveClassNotifications({
            db,
            messaging,
            classData: { ...cls, id: docSnap.id },
            reminderType: "30m"
          });
          triggered.push({ classId: docSnap.id, reminder: "30m", ...res30 });
        }
        if (cls.sendReminder5m !== false && !cls.reminder5mSent && minsUntilStart >= -1 && minsUntilStart <= 10) {
          const res5 = await dispatchLiveClassNotifications({
            db,
            messaging,
            classData: { ...cls, id: docSnap.id },
            reminderType: "5m"
          });
          triggered.push({ classId: docSnap.id, reminder: "5m", ...res5 });
        }
      }
      res.json({
        success: true,
        checked: snap.size,
        checkedCount: snap.size,
        triggered,
        results: triggered
      });
    } catch (err) {
      console.error("[LiveClasses] Reminder sweep error:", err);
      return handleRouteError(res, "Failed to process class reminders.", err);
    }
  }
  router.get("/cron/reminders", handleReminderSweep);
  router.post("/cron/reminders", handleReminderSweep);
  return router;
}

// server/seoCatalog.js
var DEFAULT_PUBLIC_ORIGIN = "https://hamrolms.vercel.app";
var SUPPORTED_LOCALES = ["en"];
var FIREBASE_PROJECT_ID = typeof process !== "undefined" && process.env?.FIREBASE_PROJECT_ID?.trim() || "gen-lang-client-0360487518";
var RAW_DB_ID = typeof process !== "undefined" ? process.env?.FIREBASE_DATABASE_ID?.trim() : "";
var FIREBASE_DATABASE_ID = RAW_DB_ID && !/^https?:\/\//i.test(RAW_DB_ID) && !RAW_DB_ID.includes("/") ? RAW_DB_ID : "ai-studio-aiclipzonenepal-13e41d9c-1db8-4842-a387-8c950c1f5b2a";
var SEED_COURSES = [
  {
    id: "Ai master class course by Ai clipzone",
    slug: "ai-master-class-course-by-hamrolms",
    title: "AI Master Class Course by Hamro LMS",
    seoTitle: "AI Master Class Course in Nepal \u2013 AI Training | Hamro LMS",
    seoDescription: "Join the AI Master Class Course on Hamro LMS Nepal. Learn 30+ AI tools for video creation, image generation, AI music, presentations, and web design.",
    overview: "A practical AI training course in Nepal covering 30+ generative AI tools for AI video creation, image generation, AI song production, presentation design, and website building.",
    category: "AI Training Nepal",
    level: "All Levels",
    price: "Rs. 449",
    amount: 449,
    isFree: false,
    order: 0,
    language: "English",
    instructorSlug: "rajababu-mehta",
    instructorName: "Rajababu Mehta",
    includeCertificate: true,
    includeLive: false,
    learn: [
      "30+ AI Tools Mastery",
      "AI Video & Image Generation",
      "AI Songs Creation",
      "Presentation & Website Design"
    ],
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMBjnyDK0lXwuSXOriM05OQPKeCOWsX3jnnrZUrQMK-RlYRTM91s3c-tpEwRCOzGlyUUS3c3fpqMmQRtMiVweJRI2x1W7IW_7rwTv5D5cDK4h_jHUKOG2chJQEMkJA2rEoH60zX9vsZZqJlB53bn7n9DYa2_cdL67FbtC3qjzbH1EQEbjJdaigkzFgL2Zn/s1685/37585.png",
    updatedAt: "2026-11-20"
  },
  {
    id: "youtube-blueprint-course-by-al-clipzone",
    slug: "youtube-blueprint-course-by-hamrolms",
    title: "YouTube Blueprint Course by Hamro LMS",
    seoTitle: "YouTube Blueprint Course in Nepal \u2013 Creator Training | Hamro LMS",
    seoDescription: "Learn YouTube channel setup, storytelling scripts, video editing, thumbnail design, and AI content workflows on Hamro LMS online learning platform in Nepal.",
    overview: "Step-by-step creator training covering YouTube niche selection, script storytelling, high-retention editing, thumbnail strategy, growth systems, and AI-assisted content workflows.",
    category: "Creator Growth",
    level: "All Levels",
    price: "Rs. 849",
    amount: 849,
    isFree: false,
    order: 1,
    language: "English",
    instructorSlug: "rajababu-mehta",
    instructorName: "Rajababu Mehta",
    includeCertificate: true,
    includeLive: false,
    learn: [
      "Channel setup & niche selection",
      "Finding winning video ideas",
      "Script writing & storytelling",
      "Shooting & presentation",
      "Editing skills",
      "Thumbnail & title strategy",
      "YouTube growth strategy",
      "Monetization & earning methods",
      "Creating content with AI tools"
    ],
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0HHAMfJvAn3a08BTUd1ayj-Jo1A0C8abgyeft2SGJw_Q-AeiLwxD0DY6Ho8IcmU62EXVnzDtHJ4bZErIVuFi8vGipXH9AxO6vRwesLUcHIVLLbozUyVwq4mZFEixr2vEduC-RxIQ5q13R-tngJPDFgCA0oJr9EbVuivCA6VCTz1BLb3Y9DcZJQtcroANa/s1672/37587.png",
    updatedAt: "2026-11-20"
  }
];
var CORE_INSTRUCTORS = [
  {
    slug: "rajababu-mehta",
    name: "Rajababu Mehta",
    role: "Founder & Lead AI Instructor",
    headline: "AI Website Developer, AI Educator & Digital Skills Trainer in Nepal",
    bio: "Rajababu Mehta is the Founder of Hamro LMS and an AI Website Developer from Nepal specializing in practical generative AI workflows, educational explainer production, web development, and creator growth strategies.",
    expertise: [
      "Generative AI Tools",
      "Prompt Engineering",
      "AI Website Development",
      "Visual Storytelling & Explainers",
      "Digital Product Architecture"
    ],
    avatarUrl: "/institute-logo.png",
    location: "Birgunj, Nepal",
    languages: ["English"],
    courseIds: [
      "Ai master class course by Ai clipzone",
      "youtube-blueprint-course-by-al-clipzone"
    ],
    isFounder: true,
    socialLinks: {
      website: "https://rajababumehta.com.np",
      facebook: "https://www.facebook.com/profile.php?id=61583901232576"
    }
  }
];
var SEED_BLOG_POSTS = [
  {
    slug: "mastering-prompt-engineering-for-practical-ai-workflows",
    title: "Mastering Prompt Engineering for Practical AI Workflows",
    seoTitle: "Prompt Engineering Guide for Practical AI Workflows | Hamro LMS",
    seoDescription: "Learn structured prompt engineering frameworks for writing, visual generation, coding, and productivity using modern AI tools on Hamro LMS Nepal.",
    excerpt: "Move beyond basic one-line prompts with a repeatable framework covering role framing, context blocks, constraints, and iterative refinement.",
    category: "AI & Automation",
    tags: ["Prompt Engineering", "AI Tools", "Productivity", "ChatGPT"],
    authorSlug: "rajababu-mehta",
    authorName: "Rajababu Mehta",
    coverImage: "/institute-logo.png",
    coverAlt: "Hamro LMS guide on structured prompt engineering workflows",
    publishedAt: "2026-09-18",
    updatedAt: "2026-11-15"
  },
  {
    slug: "high-retention-video-editing-workflow-for-creators",
    title: "High-Retention Video Editing Workflow for Digital Creators",
    seoTitle: "High-Retention Video Editing Workflow Guide | Hamro LMS",
    seoDescription: "Step-by-step guide to pacing, hooks, sound design, and visual storytelling that keep viewers watching educational and creator videos.",
    excerpt: "Discover how structured hooks, clean audio layering, and intentional visual pacing turn raw footage into engaging educational stories.",
    category: "Video Editing",
    tags: ["Video Editing", "Storytelling", "CapCut", "YouTube"],
    authorSlug: "rajababu-mehta",
    authorName: "Rajababu Mehta",
    coverImage: "/institute-logo.png",
    coverAlt: "High-retention video editing and visual storytelling workflow",
    publishedAt: "2026-10-04",
    updatedAt: "2026-11-18"
  },
  {
    slug: "building-a-sustainable-youtube-education-channel",
    title: "Building a Sustainable YouTube Education Channel from Scratch",
    seoTitle: "How to Build a YouTube Education Channel | Hamro LMS",
    seoDescription: "Learn practical niche positioning, topic research, packaging, and ethical monetization workflows for educational YouTube creators.",
    excerpt: "A realistic blueprint for selecting an educational niche, planning searchable topics, designing clear thumbnails, and building long-term audience trust.",
    category: "Creator Growth",
    tags: ["YouTube Growth", "Thumbnails", "Content Strategy", "Creator Economy"],
    authorSlug: "rajababu-mehta",
    authorName: "Rajababu Mehta",
    coverImage: "/institute-logo.png",
    coverAlt: "YouTube educational channel strategy and packaging workflow",
    publishedAt: "2026-10-22",
    updatedAt: "2026-11-19"
  },
  {
    slug: "ai-assisted-web-development-best-practices-for-beginners",
    title: "AI-Assisted Web Development Best Practices for Beginners",
    seoTitle: "AI-Assisted Web Development Best Practices | Hamro LMS",
    seoDescription: "Understand how to combine HTML, CSS, React, and AI coding assistants responsibly to build fast, accessible, production-ready web apps.",
    excerpt: "Learn how modern developers pair foundational web architecture with AI-assisted coding without sacrificing security, performance, or accessibility.",
    category: "Career & Skills",
    tags: ["Web Development", "React", "Frontend", "AI Coding"],
    authorSlug: "rajababu-mehta",
    authorName: "Rajababu Mehta",
    coverImage: "/institute-logo.png",
    coverAlt: "Modern web development architecture and best practices guide",
    publishedAt: "2026-11-05",
    updatedAt: "2026-11-20"
  }
];
function escapeXml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function slugifyText(input) {
  const raw = String(input || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return raw || "item";
}
function normalizeLegacyBrandText(val) {
  if (!val || typeof val !== "string") return "";
  return val.replace(/AI\s*CLIPZONE\s*NEPAL/g, "Hamro LMS").replace(/AI\s*CLIPZONE/g, "Hamro LMS").replace(/a[il]\s*clipzone\s*nepal/gi, "Hamro LMS").replace(/a[il]\s*clipzone/gi, "Hamro LMS").replace(/clipzone\s*nepal/gi, "Hamro LMS").replace(/clipzone/gi, "Hamro LMS").replace(/\bHamroLms\b/g, "Hamro LMS");
}
function getCourseSlug(course) {
  if (course?.slug && String(course.slug).trim()) {
    return slugifyText(course.slug);
  }
  const normalizedTitle = normalizeLegacyBrandText(course?.title || course?.id || "course");
  return slugifyText(normalizedTitle || "course");
}
function buildLocalizedPath(cleanPath, locale = "en") {
  const normalized = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const trimmed = normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
  if (locale === "en") {
    return trimmed;
  }
  return trimmed === "/" ? `/${locale}` : `/${locale}${trimmed}`;
}
function resolvePublicOrigin(req) {
  if (!req || !req.headers) return DEFAULT_PUBLIC_ORIGIN;
  const rawHost = req.headers["x-forwarded-host"] || req.headers.host || "";
  const host = String(Array.isArray(rawHost) ? rawHost[0] : rawHost).split(",")[0].trim();
  if (!host || host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0") || host.includes("aiclipzone.vercel.app")) {
    return DEFAULT_PUBLIC_ORIGIN;
  }
  const rawProto = req.headers["x-forwarded-proto"] || "https";
  const proto = String(Array.isArray(rawProto) ? rawProto[0] : rawProto).split(",")[0].trim() || "https";
  return `${proto === "http" ? "https" : proto}://${host}`;
}
function toIsoDateStr(val, fallback) {
  const safeFallback = /^\d{4}-\d{2}-\d{2}$/.test(String(fallback || "")) ? String(fallback) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (val === void 0 || val === null || val === "") return safeFallback;
  if (typeof val === "number" && Number.isFinite(val)) {
    const ms = val < 1e12 ? val * 1e3 : val;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    const ms = num < 1e12 ? num * 1e3 : num;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return safeFallback;
}
function fromFirestoreValue2(v) {
  if (!v || typeof v !== "object") return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return Boolean(v.booleanValue);
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("stringValue" in v) return String(v.stringValue);
  if ("timestampValue" in v) return String(v.timestampValue);
  if ("arrayValue" in v) {
    const vals = Array.isArray(v.arrayValue?.values) ? v.arrayValue.values : [];
    return vals.map(fromFirestoreValue2);
  }
  if ("mapValue" in v) {
    const out = {};
    const fields = v.mapValue?.fields || {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fromFirestoreValue2(fv);
    }
    return out;
  }
  return null;
}
function fromFirestoreDoc2(docJson) {
  const out = {};
  const fields = docJson?.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue2(v);
  }
  return out;
}
function expandServerCourseIdAliases(cid) {
  if (cid === "al-master-class-course-by-al-clipzone") {
    return [cid, "Ai master class course by Ai clipzone"];
  }
  if (cid === "Ai master class course by Ai clipzone") {
    return [cid, "al-master-class-course-by-al-clipzone"];
  }
  return [cid];
}
function normServerTitle(val) {
  return String(val || "").replace(/\s+/g, " ").trim().toLowerCase();
}
function resolveServerCourseInstructor(course, instructors) {
  const safeList = Array.isArray(instructors) && instructors.length > 0 ? instructors : CORE_INSTRUCTORS;
  const aliases = expandServerCourseIdAliases(course.id);
  const hasCourse = (inst) => Array.isArray(inst?.courseIds) && aliases.some((id) => inst.courseIds.includes(id));
  const byAssignedSubAdmin = safeList.find((i) => !i.isFounder && hasCourse(i));
  if (byAssignedSubAdmin) return byAssignedSubAdmin;
  const byExplicitSlug = course.instructorSlug ? safeList.find((i) => i.slug === slugifyText(course.instructorSlug)) : void 0;
  if (byExplicitSlug) return byExplicitSlug;
  const byCourseId = safeList.find(hasCourse);
  if (byCourseId) return byCourseId;
  return safeList[0] || CORE_INSTRUCTORS[0];
}
function mergePublicInstructors(courses, subAdmins) {
  const bySlug = /* @__PURE__ */ new Map();
  const BRAND_ALIAS_SLUGS = /* @__PURE__ */ new Set([
    "ai-clipzone",
    "ai-clipzone-nepal",
    "al-clipzone",
    "hamro-lms",
    "hamrolms",
    "hamro-lms-nepal"
  ]);
  const subAdminOwnedCourseIds = /* @__PURE__ */ new Set();
  const resolvedSubEntries = [];
  for (const sub of subAdmins) {
    if (!sub || sub.status !== "active" || !sub.name) continue;
    const cleanName = String(sub.name).trim();
    const rawSlug = slugifyText(cleanName);
    if (!rawSlug || rawSlug === "item") continue;
    const isBrandAlias = BRAND_ALIAS_SLUGS.has(rawSlug) || rawSlug === "rajababu-mehta";
    const slug = isBrandAlias ? "rajababu-mehta" : rawSlug;
    const rawIds = Array.from(
      /* @__PURE__ */ new Set([
        ...Array.isArray(sub.courseIds) ? sub.courseIds.map(String).filter(Boolean) : [],
        ...sub.courseId ? [String(sub.courseId)] : []
      ])
    );
    const expandedIds = new Set(rawIds.flatMap(expandServerCourseIdAliases));
    const rawTitles = new Set(
      [
        ...Array.isArray(sub.courseTitles) ? sub.courseTitles : [],
        ...sub.courseTitle ? [sub.courseTitle] : []
      ].map(normServerTitle).filter(Boolean)
    );
    const assignedCourses = courses.filter(
      (c) => expandedIds.has(c.id) || rawTitles.size > 0 && rawTitles.has(normServerTitle(c.title))
    );
    const resolvedIds = Array.from(
      new Set(courses.length > 0 ? assignedCourses.map((c) => c.id) : rawIds)
    );
    if (!isBrandAlias) {
      for (const cid of resolvedIds) {
        for (const aliasId of expandServerCourseIdAliases(cid)) {
          subAdminOwnedCourseIds.add(aliasId);
        }
      }
    }
    resolvedSubEntries.push({
      sub,
      slug,
      cleanName,
      assignedCourses,
      courseIds: resolvedIds
    });
  }
  for (const inst of CORE_INSTRUCTORS) {
    const matchedIds = courses.length > 0 ? courses.filter(
      (c) => !subAdminOwnedCourseIds.has(c.id) && (c.instructorSlug === inst.slug || inst.courseIds.some((id) => expandServerCourseIdAliases(id).includes(c.id)))
    ).map((c) => c.id) : inst.courseIds.filter((id) => !subAdminOwnedCourseIds.has(id));
    bySlug.set(inst.slug, {
      ...inst,
      courseIds: Array.from(new Set(matchedIds))
    });
  }
  for (const { sub, slug, cleanName, assignedCourses, courseIds } of resolvedSubEntries) {
    const existing = bySlug.get(slug);
    if (existing) {
      for (const cid of courseIds) {
        if (!existing.courseIds.includes(cid)) {
          existing.courseIds.push(cid);
        }
      }
      continue;
    }
    const primaryCourse = assignedCourses[0];
    const combinedLearn = Array.from(
      new Set(
        assignedCourses.flatMap((c) => Array.isArray(c.learn) ? c.learn : []).map((item) => String(item).trim()).filter(Boolean)
      )
    ).slice(0, 6);
    bySlug.set(slug, {
      slug,
      name: cleanName,
      role: "Course Instructor & Mentor",
      headline: assignedCourses.length > 1 ? `Course Instructor for ${assignedCourses.length} Courses on Hamro LMS Nepal` : primaryCourse ? `Course Instructor for ${primaryCourse.title}` : sub.courseTitle ? `Course Instructor for ${sub.courseTitle}` : "Verified Course Instructor on Hamro LMS Nepal",
      bio: assignedCourses.length > 1 ? `${cleanName} is the Course Instructor for ${assignedCourses.length} courses on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.` : primaryCourse ? `${cleanName} is the Course Instructor for ${primaryCourse.title} on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.` : `${cleanName} teaches practical lessons and mentors students on Hamro LMS Nepal.`,
      avatarUrl: sub.avatarUrl || "/institute-logo.png",
      languages: ["English"],
      courseIds,
      expertise: combinedLearn.length > 0 ? combinedLearn : ["Online Education", "Digital Skills"],
      isFounder: false
    });
  }
  for (const c of courses) {
    if (subAdminOwnedCourseIds.has(c.id)) continue;
    if (c.instructorName && c.instructorSlug) {
      const slug = slugifyText(c.instructorSlug);
      const existing = bySlug.get(slug);
      if (existing) {
        if (!existing.courseIds.includes(c.id)) existing.courseIds.push(c.id);
      } else {
        bySlug.set(slug, {
          slug,
          name: String(c.instructorName).trim(),
          role: "Course Instructor",
          headline: `Instructor for ${c.title}`,
          bio: `${String(c.instructorName).trim()} teaches ${c.title} on Hamro LMS.`,
          avatarUrl: "/institute-logo.png",
          languages: c.language && !/nepali|hindi/i.test(c.language) ? [c.language] : ["English"],
          courseIds: [c.id],
          expertise: Array.isArray(c.learn) ? c.learn.slice(0, 4) : ["Online Education"],
          isFounder: false
        });
      }
    }
  }
  return Array.from(bySlug.values());
}
async function fetchJsonWithTimeout(url, init = {}, timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function fetchPublicCatalogSnapshot() {
  let deletedIds = [];
  let courses = [...SEED_COURSES];
  const subAdmins = [];
  let coursesSeeded = false;
  let siteSettings = null;
  let paymentQr = null;
  let liveFetched = false;
  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents`;
    const [configJson, coursesJson, subAdminsJson, siteSettingsJson, paymentQrJson] = await Promise.all([
      fetchJsonWithTimeout(`${baseUrl}/system/config`),
      fetchJsonWithTimeout(`${baseUrl}/courses?pageSize=100`),
      fetchJsonWithTimeout(`${baseUrl}:runQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "sub_admins" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "status" },
                op: "EQUAL",
                value: { stringValue: "active" }
              }
            }
          }
        })
      }),
      fetchJsonWithTimeout(`${baseUrl}/system/site_settings`),
      fetchJsonWithTimeout(`${baseUrl}/system/payment_qr`)
    ]);
    if (configJson?.fields) {
      liveFetched = true;
      const cfg = fromFirestoreDoc2(configJson);
      coursesSeeded = Boolean(cfg.courses_seeded === true);
      if (Array.isArray(cfg.deletedCourseIds)) {
        deletedIds = cfg.deletedCourseIds.map(String);
      }
    }
    if (siteSettingsJson?.fields) {
      siteSettings = fromFirestoreDoc2(siteSettingsJson);
    }
    if (paymentQrJson?.fields) {
      paymentQr = fromFirestoreDoc2(paymentQrJson);
    }
    if (coursesJson && typeof coursesJson === "object") {
      liveFetched = true;
      const docList = Array.isArray(coursesJson.documents) ? coursesJson.documents : [];
      if (docList.length > 0) {
        const liveCourses = [];
        for (const docItem of docList) {
          const d = fromFirestoreDoc2(docItem);
          const docId = String(docItem?.name?.split("/").pop() || d.id || "");
          if (!docId || deletedIds.includes(docId) || d.isHidden === true) continue;
          const normalizedTitle = normalizeLegacyBrandText(String(d.title || "Course")).replace(/\s+/g, " ").trim();
          liveCourses.push({
            id: docId,
            slug: d.slug ? slugifyText(d.slug) : void 0,
            title: normalizedTitle || "Course",
            seoTitle: d.seoTitle ? String(d.seoTitle) : void 0,
            seoDescription: d.seoDescription ? String(d.seoDescription) : void 0,
            overview: d.overview ? String(d.overview) : void 0,
            message: d.message ? normalizeLegacyBrandText(String(d.message)) : void 0,
            category: d.category ? String(d.category) : "Online Course",
            level: d.level ? String(d.level) : "All Levels",
            price: String(d.price || "FREE"),
            amount: typeof d.amount === "number" ? d.amount : 0,
            isFree: Boolean(d.isFree),
            isPopular: Boolean(d.isPopular),
            popularText: d.popularText ? String(d.popularText) : void 0,
            order: typeof d.order === "number" ? d.order : 0,
            language: d.language && !/nepali|hindi/i.test(String(d.language)) ? String(d.language) : "English",
            instructorSlug: d.instructorSlug ? String(d.instructorSlug) : void 0,
            instructorName: d.instructorName ? String(d.instructorName) : void 0,
            includeCertificate: d.includeCertificate !== false,
            includeLive: Boolean(d.includeLive),
            learn: Array.isArray(d.learn) ? d.learn.map(String) : [],
            image: d.image ? String(d.image) : "/institute-logo.png",
            updatedAt: d.updatedAt || docItem.updateTime || void 0
          });
        }
        courses = liveCourses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      } else if (coursesSeeded) {
        courses = [];
      } else if (deletedIds.length > 0) {
        courses = courses.filter((c) => !deletedIds.includes(c.id));
      }
    } else if (deletedIds.length > 0) {
      courses = courses.filter((c) => !deletedIds.includes(c.id));
    }
    if (Array.isArray(subAdminsJson)) {
      for (const row of subAdminsJson) {
        if (!row?.document?.fields) continue;
        const d = fromFirestoreDoc2(row.document);
        if (d.status !== "active" || !d.name) continue;
        subAdmins.push({
          id: String(row.document.name?.split("/").pop() || ""),
          name: String(d.name),
          courseId: String(d.courseId || ""),
          courseTitle: String(d.courseTitle || ""),
          courseIds: Array.isArray(d.courseIds) ? d.courseIds.map(String).filter(Boolean) : [],
          courseTitles: Array.isArray(d.courseTitles) ? d.courseTitles.map(String).filter(Boolean) : [],
          avatarUrl: d.avatarUrl ? String(d.avatarUrl) : void 0,
          status: "active"
        });
      }
    }
  } catch {
  }
  const instructors = mergePublicInstructors(courses, subAdmins);
  return {
    courses,
    instructors,
    subAdmins,
    deletedCourseIds: deletedIds,
    coursesSeeded,
    siteSettings,
    paymentQr,
    liveFetched
  };
}
function buildSitemapXmlFromCatalog(origin, courses, instructors) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const specs = [
    { cleanPath: "/", lastmod: today, changefreq: "daily", priority: "1.0" },
    { cleanPath: "/courses", lastmod: today, changefreq: "daily", priority: "0.95" },
    { cleanPath: "/about-us", lastmod: today, changefreq: "monthly", priority: "0.85" },
    { cleanPath: "/learn", lastmod: today, changefreq: "monthly", priority: "0.85" },
    { cleanPath: "/instructors", lastmod: today, changefreq: "weekly", priority: "0.85" },
    { cleanPath: "/blog", lastmod: today, changefreq: "weekly", priority: "0.85" }
  ];
  const seenCourseSlugs = /* @__PURE__ */ new Set();
  for (const course of courses || []) {
    const slug = getCourseSlug(course);
    if (!slug || seenCourseSlugs.has(slug)) continue;
    seenCourseSlugs.add(slug);
    specs.push({
      cleanPath: `/courses/${slug}`,
      lastmod: toIsoDateStr(course.updatedAt, today),
      changefreq: "weekly",
      priority: "0.9"
    });
  }
  const seenInstructorSlugs = /* @__PURE__ */ new Set();
  for (const inst of instructors || []) {
    if (!inst?.slug || seenInstructorSlugs.has(inst.slug)) continue;
    seenInstructorSlugs.add(inst.slug);
    specs.push({
      cleanPath: `/instructors/${inst.slug}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.75"
    });
  }
  const seenCategorySlugs = /* @__PURE__ */ new Set();
  for (const post of SEED_BLOG_POSTS) {
    const catSlug = slugifyText(post.category);
    if (!catSlug || seenCategorySlugs.has(catSlug)) continue;
    seenCategorySlugs.add(catSlug);
    specs.push({
      cleanPath: `/blog/category/${catSlug}`,
      lastmod: toIsoDateStr(post.updatedAt || post.publishedAt, today),
      changefreq: "weekly",
      priority: "0.7"
    });
  }
  for (const post of SEED_BLOG_POSTS) {
    specs.push({
      cleanPath: `/blog/${post.slug}`,
      lastmod: toIsoDateStr(post.updatedAt || post.publishedAt, today),
      changefreq: "monthly",
      priority: "0.8"
    });
  }
  specs.push(
    { cleanPath: "/privacy-policy", lastmod: "2026-01-01", changefreq: "yearly", priority: "0.7" },
    { cleanPath: "/terms", lastmod: "2026-01-01", changefreq: "yearly", priority: "0.5" }
  );
  const urlNodes = [];
  for (const spec of specs) {
    const alternatesXml = [
      ...SUPPORTED_LOCALES.map((loc) => {
        const href = `${origin}${buildLocalizedPath(spec.cleanPath, loc)}`;
        return `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(href)}" />`;
      }),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
        `${origin}${buildLocalizedPath(spec.cleanPath, "en")}`
      )}" />`
    ].join("\n");
    const matchedCourse = spec.cleanPath.startsWith("/courses/") ? (courses || []).find((c) => `/courses/${getCourseSlug(c)}` === spec.cleanPath) : null;
    const imageXml = matchedCourse?.image ? `
    <image:image>
      <image:loc>${escapeXml(resolveAbsImg(matchedCourse.image, origin))}</image:loc>
      <image:title>${escapeXml(matchedCourse.title)}</image:title>
    </image:image>` : spec.cleanPath === "/" ? `
    <image:image>
      <image:loc>${escapeXml(`${origin}/institute-logo.png`)}</image:loc>
      <image:title>HamroLms \u2013 Online Learning &amp; Digital Skill Courses</image:title>
    </image:image>` : "";
    for (const loc of SUPPORTED_LOCALES) {
      const fullLoc = `${origin}${buildLocalizedPath(spec.cleanPath, loc)}`;
      urlNodes.push(
        `  <url>
    <loc>${escapeXml(fullLoc)}</loc>
    <lastmod>${escapeXml(spec.lastmod)}</lastmod>
    <changefreq>${spec.changefreq}</changefreq>
    <priority>${loc === "en" ? spec.priority : (Number(spec.priority) * 0.9).toFixed(2)}</priority>
${alternatesXml}${imageXml}
  </url>`
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlNodes.join("\n")}
</urlset>
`;
}
async function generateSitemapXml(origin = DEFAULT_PUBLIC_ORIGIN) {
  try {
    const { courses, instructors } = await fetchPublicCatalogSnapshot();
    return buildSitemapXmlFromCatalog(origin, courses, instructors);
  } catch {
    return buildSitemapXmlFromCatalog(origin, SEED_COURSES, CORE_INSTRUCTORS);
  }
}
function generateRobotsTxt(origin = DEFAULT_PUBLIC_ORIGIN) {
  const safeOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, "");
  const privateDisallows = [
    "Disallow: /api/",
    "Disallow: /admin",
    "Disallow: /classroom",
    "Disallow: /account",
    "Disallow: /enroll",
    "Disallow: /live",
    "Disallow: /ask",
    "Disallow: /delete-account"
  ];
  const aiCrawlers = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "PerplexityBot",
    "ClaudeBot",
    "anthropic-ai",
    "Google-Extended",
    "Applebot-Extended"
  ];
  return [
    "User-agent: *",
    "Allow: /",
    ...privateDisallows,
    "",
    ...aiCrawlers.flatMap((bot) => [
      `User-agent: ${bot}`,
      "Allow: /",
      "Allow: /llms.txt",
      "Allow: /llms-full.txt",
      ...privateDisallows,
      ""
    ]),
    `Sitemap: ${safeOrigin}/sitemap.xml`,
    `# LLMs Context: ${safeOrigin}/llms.txt`,
    `# Full LLMs Context: ${safeOrigin}/llms-full.txt`,
    ""
  ].join("\n");
}
function buildLlmsTxtFromCatalog(origin, courses, instructors, isFull = false) {
  const safeOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, "");
  const safeCourses = Array.isArray(courses) && courses.length > 0 ? courses : SEED_COURSES;
  const safeInstructors = Array.isArray(instructors) && instructors.length > 0 ? instructors : CORE_INSTRUCTORS;
  const lines = [
    "# HamroLms",
    "",
    "> HamroLms (also known as Hamro LMS) is an online learning management system in Nepal offering practical digital skill courses in AI tools, prompt engineering, video editing, graphic design, YouTube growth, and web development, taught in English by verified instructors with structured video modules, downloadable PDF notes, and certificates.",
    "",
    "## Platform Facts",
    `- Official Website: ${safeOrigin}/`,
    `- Course Catalog: ${safeOrigin}/courses`,
    `- Instructors Directory: ${safeOrigin}/instructors`,
    `- Learning Blog & Tutorials: ${safeOrigin}/blog`,
    `- About Us: ${safeOrigin}/about-us`,
    `- Learning Pathway: ${safeOrigin}/learn`,
    `- Privacy Policy: ${safeOrigin}/privacy-policy`,
    `- Terms of Use: ${safeOrigin}/terms`,
    "- Primary Language: English",
    "- Support Email: support.hamrolms@gmail.com",
    "- Region Served: Nepal and global online learners",
    "- Format: Self-paced HD video chapters, downloadable PDF notes, live workshops (course-dependent), and digital certificates of completion",
    "",
    "## Online Courses"
  ];
  for (const c of safeCourses) {
    const cUrl = `${safeOrigin}/courses/${getCourseSlug(c)}`;
    const priceLabel = c.isFree || c.amount === 0 ? "Free" : c.price || "Paid";
    const resolvedInst = resolveServerCourseInstructor(c, safeInstructors);
    const instName = resolvedInst?.name || c.instructorName;
    const instLabel = instName ? ` | Instructor: ${instName}` : "";
    const desc = c.overview || c.seoDescription || `Structured online course covering ${c.category || "digital skills"}.`;
    lines.push(`- [${c.title}](${cUrl}) (${priceLabel}${instLabel}): ${desc}`);
    if (isFull && Array.isArray(c.learn) && c.learn.length > 0) {
      lines.push(`  - Key Skills Covered: ${c.learn.join("; ")}`);
    }
  }
  lines.push("", "## Verified Instructors");
  for (const inst of safeInstructors) {
    const instUrl = `${safeOrigin}/instructors/${inst.slug}`;
    lines.push(`- [${inst.name}](${instUrl}) \u2013 ${inst.role}: ${inst.bio}`);
    if (isFull && Array.isArray(inst.expertise) && inst.expertise.length > 0) {
      lines.push(`  - Expertise: ${inst.expertise.join(", ")}`);
    }
  }
  lines.push("", "## Learning Guides & Blog Articles");
  for (const post of SEED_BLOG_POSTS) {
    const postUrl = `${safeOrigin}/blog/${post.slug}`;
    lines.push(`- [${post.title}](${postUrl}) (${post.category}): ${post.excerpt}`);
    if (isFull && post.seoDescription) {
      lines.push(`  - Summary: ${post.seoDescription}`);
    }
  }
  if (isFull) {
    lines.push(
      "",
      "## Frequently Asked Questions",
      "- What is HamroLms? HamroLms is an online learning platform in Nepal designed for students, creators, and professionals seeking practical digital skills in AI tools, video production, and web development.",
      "- How do students enroll in HamroLms courses? Students choose a course from the catalog, complete enrollment (free or via QR/eSewa payment), and activate their access key in the student portal to unlock HD video lessons and study notes.",
      "- Do HamroLms courses include certificates? Eligible self-paced courses include a verifiable Certificate of Completion once enrolled."
    );
  }
  lines.push("", `Sitemap: ${safeOrigin}/sitemap.xml`, "");
  return lines.join("\n");
}
async function generateLlmsDocument(origin = DEFAULT_PUBLIC_ORIGIN, isFull = false) {
  try {
    const { courses, instructors } = await fetchPublicCatalogSnapshot();
    return buildLlmsTxtFromCatalog(origin, courses, instructors, isFull);
  } catch {
    return buildLlmsTxtFromCatalog(origin, SEED_COURSES, CORE_INSTRUCTORS, isFull);
  }
}
function resolveAbsImg(img, origin) {
  const cleanOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, "");
  const raw = String(img || "").trim();
  if (!raw) return `${cleanOrigin}/institute-logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${cleanOrigin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

// server/seoRoutes.ts
function resolvePublicOrigin2(req) {
  return resolvePublicOrigin(req);
}
async function generateSitemapXml2(origin) {
  return generateSitemapXml(origin);
}
function generateRobotsTxt2(origin) {
  return generateRobotsTxt(origin);
}
function mountSeoRoutes(app2) {
  app2.get("/sitemap.xml", async (req, res) => {
    try {
      const origin = resolvePublicOrigin2(req);
      const xml = await generateSitemapXml2(origin);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400");
      res.status(200).send(xml);
    } catch {
      const fallbackOrigin = resolvePublicOrigin2(req);
      const xml = await generateSitemapXml2(fallbackOrigin);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.status(200).send(xml);
    }
  });
  app2.get("/robots.txt", (req, res) => {
    const origin = resolvePublicOrigin2(req);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(generateRobotsTxt2(origin));
  });
  app2.get(["/llms.txt", "/llms-full.txt"], async (req, res) => {
    const origin = resolvePublicOrigin2(req);
    const isFull = req.path.includes("llms-full.txt");
    const txt = await generateLlmsDocument(origin, isFull);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(txt);
  });
}

// server/coreApiRoutes.ts
function getServerFirestoreForReq(req) {
  const adminDb = getAdminDb();
  if (adminDb) return adminDb;
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  return createRestFirestore(idToken || void 0);
}
function mountSharedApiMiddlewareAndRoutes(app2) {
  app2.use(securityHeadersMiddleware);
  mountSeoRoutes(app2);
  app2.use(express2.json({ limit: "150kb" }));
  const liveEncryptLimiter = createRateLimiter({
    windowMs: 6e4,
    maxRequests: 30,
    keyPrefix: "live-encrypt"
  });
  const liveJoinLimiter = createRateLimiter({
    windowMs: 6e4,
    maxRequests: 45,
    keyPrefix: "live-join"
  });
  const chatLimiter = createRateLimiter({
    windowMs: 6e4,
    maxRequests: 25,
    keyPrefix: "ai-chat"
  });
  app2.get(["/api", "/api/health"], (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  app2.post("/api/live-encrypt", liveEncryptLimiter, async (req, res) => {
    try {
      const { zoomLink } = req.body || {};
      const adminSessionId = String(req.headers["x-admin-session-id"] || "").trim();
      const subAdminCode = String(req.headers["x-subadmin-code"] || "").trim();
      const hasBearer = Boolean(req.headers.authorization?.startsWith("Bearer "));
      if (!adminSessionId && !subAdminCode && !hasBearer) {
        return res.status(401).json({ error: "Unauthorized: instructor credentials required." });
      }
      if (adminSessionId || subAdminCode || hasBearer) {
        try {
          const db = getServerFirestoreForReq(req);
          const verifiedAdmin = await verifyAdminIdentity(req, db, getAdminAuth());
          if (!verifiedAdmin && hasBearer && !adminSessionId && !subAdminCode) {
            return res.status(403).json({ error: "Forbidden: admin or sub-admin required." });
          }
        } catch {
        }
      }
      const encryptedZoomLink = encryptZoomUrl(String(zoomLink || ""));
      if (!encryptedZoomLink) {
        return res.status(400).json({ error: "Invalid meeting URL. Must be a valid https:// URL." });
      }
      res.setHeader("Cache-Control", "no-store");
      res.json({ encryptedZoomLink });
    } catch {
      res.status(500).json({ error: "Unable to encrypt meeting URL" });
    }
  });
  app2.post("/api/live-decrypt-admin", liveEncryptLimiter, async (req, res) => {
    try {
      const { encryptedZoomLink } = req.body || {};
      const db = getServerFirestoreForReq(req);
      const adminCtx = await verifyAdminIdentity(req, db, getAdminAuth());
      if (!adminCtx) {
        return res.status(403).json({ error: "Forbidden: verified instructor session required." });
      }
      const zoomLink = decryptZoomUrl(String(encryptedZoomLink || ""));
      if (!zoomLink) {
        return res.status(400).json({ error: "Invalid or unreadable encrypted meeting URL." });
      }
      res.setHeader("Cache-Control", "no-store");
      res.json({ zoomLink });
    } catch {
      res.status(500).json({ error: "Unable to decrypt meeting URL" });
    }
  });
  app2.post("/api/live-join-token", liveJoinLimiter, (req, res) => {
    try {
      const { encryptedZoomLink, zoomLink, studentName, sessionTitle, courseTitle } = req.body || {};
      const decrypted = decryptZoomUrl(String(encryptedZoomLink || zoomLink || ""));
      if (!decrypted) {
        return res.status(400).json({ error: "Invalid meeting URL" });
      }
      const urls = buildZoomUrls(decrypted, String(studentName || "Student"));
      if (!urls) {
        return res.status(400).json({ error: "Invalid meeting URL" });
      }
      const token = encryptLivePayload({
        w: urls.webUrl,
        e: urls.embedUrl,
        s: String(studentName || "Student").slice(0, 60),
        t: String(sessionTitle || "Live Class Session").slice(0, 100),
        c: String(courseTitle || "HamroLms Live").slice(0, 100),
        exp: Date.now() + 15 * 60 * 1e3
      });
      const encoded = encodeURIComponent(token);
      res.setHeader("Cache-Control", "no-store");
      res.json({
        embedUrl: `/api/live-embed?t=${encoded}`,
        launchUrl: `/api/live-launch?t=${encoded}`
      });
    } catch {
      res.status(500).json({ error: "Unable to create live session pass" });
    }
  });
  app2.get("/api/live-embed", (req, res) => {
    const token = String(req.query.t || "");
    const payload = token ? decryptLivePayload(token) : null;
    const target = payload?.e || payload?.w;
    if (!payload || !target || !payload.exp || Date.now() > Number(payload.exp)) {
      res.status(410).type("html").send(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:380px;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px}h1{font-size:16px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0}</style></head><body><div class="card"><h1>Live Session Pass Expired</h1><p>Please click Leave Class and click Join again.</p></div></body></html>`
      );
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.redirect(302, String(target));
  });
  app2.get("/api/live-launch", (req, res) => {
    const token = String(req.query.t || "");
    const payload = token ? decryptLivePayload(token) : null;
    const target = payload?.e || payload?.w;
    if (!payload || !target || !payload.exp || Date.now() > Number(payload.exp)) {
      res.status(410).type("html").send(
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Link Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:400px;background:#18181b;border:1px solid #27272a;border-radius:20px;padding:28px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0}</style></head><body><div class="card"><h1>Live Pass Expired</h1><p>Please return to your course section and click Join again.</p></div></body></html>`
      );
      return;
    }
    const safeTitle = escapeHtml(payload.t || "Live Class Session");
    const embedSrc = `/api/live-embed?t=${encodeURIComponent(token)}`;
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:0;background:#000;overflow:hidden}</style>
</head>
<body>
  <iframe src="${embedSrc}" allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; fullscreen *" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body>
</html>`);
  });
  app2.use("/api/live-classes", createLiveClassRouter());
  let ai = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  app2.post("/api/chat", chatLimiter, async (req, res) => {
    try {
      const rawMessage = req.body?.message;
      const history = req.body?.history;
      const message = typeof rawMessage === "string" ? rawMessage.trim().slice(0, 1500) : "";
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const currentApiKey = process.env.GEMINI_API_KEY;
      if (!ai && currentApiKey) {
        ai = new GoogleGenAI({
          apiKey: currentApiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
      }
      if (!ai) {
        return res.json({
          reply: "Hello! Welcome to HamroLms. For information about our premium courses (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Keys, or eSewa payments, please contact our official WhatsApp at 976-3323268."
        });
      }
      const contents = [];
      if (Array.isArray(history)) {
        for (const turn of history.slice(-10)) {
          const text = typeof turn?.text === "string" ? turn.text.trim().slice(0, 1500) : "";
          if (!text) continue;
          contents.push({
            role: turn.sender === "user" ? "user" : "model",
            parts: [{ text }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
      const systemInstruction = `You are "HamroLms Assistant" \u{1F916}, a helpful, smart, and friendly customer support representative for "HamroLms", Nepal's premier online AI & Digital Skills Academy.

Our Course Catalog:
1. "AI Master Class by HamroLms" \u2014 Rs. 449
2. "AI Video, Image & Song Creation" \u2014 Rs. 350
3. "AI Song Creation Course" \u2014 Rs. 299
4. "AI Presentation Making Course" \u2014 Rs. 199
5. "YouTube Blueprint Course" \u2014 Rs. 549

Payment & Activation Flow:
- Payment Modes: eSewa (9763323268 - Ayush Chaurasiya), Khalti, IME Pay, Bank Transfer.
- Activation: Send payment screenshot to official WhatsApp 976-3323268 to receive instant course activation code.
- Live Classes are available inside the website classroom for live-enabled courses; recorded courses include completion certificates.

Respond concisely and politely in English.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 800
        }
      });
      const replyText = response.text || "For further information, please contact our official WhatsApp number at 976-3323268.";
      res.json({ reply: replyText });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.json({
        reply: "Hello! Welcome to HamroLms. For information about our premium courses (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Keys, or eSewa payments, please contact our official WhatsApp at 976-3323268."
      });
    }
  });
}

// server/vercelApp.ts
dotenv.config();
var app = express3();
app.disable("x-powered-by");
mountSharedApiMiddlewareAndRoutes(app);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});
var vercelApp_default = app;
export {
  vercelApp_default as default
};
