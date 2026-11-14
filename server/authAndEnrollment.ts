import type { Request, Response, NextFunction } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { verifyFirebaseIdTokenViaRest } from './firestoreRest.js';

const ADMIN_EMAILS = new Set([
  'ai.clipzone.edu@gmail.com',
  'rajababum426@gmail.com',
]);

export function isEmailMainAdmin(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return ADMIN_EMAILS.has(lower) || lower.startsWith('admin');
}

export interface VerifiedAdminContext {
  isAdmin: true;
  role: 'main_admin' | 'sub_admin';
  uid: string;
  name: string;
  email?: string;
  subAdminCode?: string;
  assignedCourseId?: string;
}

export interface VerifiedStudentContext {
  authorized: boolean;
  userId: string;
  studentName: string;
  studentEmail?: string;
  activationCode?: string;
  enrolledCourseIds: string[];
  isAdminBypass?: boolean;
  reason?: string;
}

// Simple sliding-window in-memory rate limiter for API protection
export function createRateLimiter(options: { windowMs: number; maxRequests: number; keyPrefix: string }) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const userHint =
      (req.headers['x-student-uid'] as string) ||
      (req.headers['x-device-id'] as string) ||
      '';
    const key = `${options.keyPrefix}:${ip}:${userHint}`;

    const timestamps = (hits.get(key) || []).filter((ts) => now - ts < options.windowMs);
    if (timestamps.length >= options.maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      });
    }

    timestamps.push(now);
    hits.set(key, timestamps);

    // Periodic prune to avoid unbounded memory growth
    if (hits.size > 5000) {
      for (const [k, list] of hits.entries()) {
        if (list.length === 0 || now - list[list.length - 1] >= options.windowMs) {
          hits.delete(k);
        }
      }
    }

    next();
  };
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function parseActivationCodesHeader(req: Request): string[] {
  const raw =
    (req.headers['x-activation-codes'] as string) ||
    (req.body && Array.isArray(req.body.activationCodes) ? req.body.activationCodes.join(',') : '') ||
    (req.body && typeof req.body.activationCode === 'string' ? req.body.activationCode : '') ||
    '';

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length >= 4 && c.length <= 64)
    )
  );
}

export function isActivationKeyExpiredServer(keyData: Record<string, any>, now = Date.now()): boolean {
  if (!keyData) return true;
  if (keyData.status === 'expired' || keyData.status === 'deleted') return true;
  const durationMs =
    keyData.duration === '1day'
      ? 24 * 60 * 60 * 1000
      : keyData.duration === '1month'
      ? 30 * 24 * 60 * 60 * 1000
      : 365 * 24 * 60 * 60 * 1000;
  const expiresAt = Number(keyData.expiresAt || (keyData.claimedAt ? Number(keyData.claimedAt) + durationMs : 0));
  if (expiresAt > 0 && now > expiresAt) return true;
  return false;
}

export async function verifyAdminIdentity(
  req: Request,
  db: Firestore,
  adminAuth: Auth | null
): Promise<VerifiedAdminContext | null> {
  // 1. Check Firebase Auth ID token if supplied
  const idToken = getBearerToken(req);
  if (idToken) {
    try {
      const decoded = adminAuth
        ? await adminAuth.verifyIdToken(idToken)
        : await verifyFirebaseIdTokenViaRest(idToken);
      if (decoded?.email && isEmailMainAdmin(decoded.email)) {
        return {
          isAdmin: true,
          role: 'main_admin',
          uid: decoded.uid,
          name: decoded.name || 'Main Admin',
          email: decoded.email,
        };
      }
      if (decoded?.uid) {
        // Also check /admins/{uid} collection if present
        const adminDoc = await db.collection('admins').doc(decoded.uid).get().catch(() => null);
        if (adminDoc?.exists) {
          return {
            isAdmin: true,
            role: 'main_admin',
            uid: decoded.uid,
            name: decoded.name || 'Main Admin',
            email: decoded.email,
          };
        }
      }
    } catch {
      // Fall through to session/sub-admin verification
    }
  }

  // 2. Check Main Admin active session ID stored in Firestore system/admin_session
  const adminSessionId = String(req.headers['x-admin-session-id'] || '').trim();
  const deviceId = String(req.headers['x-device-id'] || '').trim();
  if (adminSessionId) {
    try {
      const sessSnap = await db.collection('system').doc('admin_session').get();
      if (sessSnap.exists) {
        const sessData = sessSnap.data();
        if (
          sessData?.activeSessionId &&
          sessData.activeSessionId === adminSessionId &&
          (!sessData.deviceId || !deviceId || sessData.deviceId === deviceId)
        ) {
          return {
            isAdmin: true,
            role: 'main_admin',
            uid: `admin_${adminSessionId.slice(0, 16)}`,
            name: 'Main Admin',
          };
        }
      }
    } catch (err) {
      console.warn('[Auth] Admin session verification failed:', err);
    }
  }

  // 3. Check Course-Scoped Sub-Admin session against Firestore sub_admins/{code}
  const subAdminCode = String(req.headers['x-subadmin-code'] || '').trim().toUpperCase();
  if (subAdminCode) {
    try {
      const subSnap = await db.collection('sub_admins').doc(subAdminCode).get();
      if (subSnap.exists) {
        const subData = subSnap.data() as Record<string, any>;
        if (
          subData?.status === 'active' &&
          (!subData.activeDeviceId || !deviceId || subData.activeDeviceId === deviceId)
        ) {
          return {
            isAdmin: true,
            role: 'sub_admin',
            uid: subAdminCode,
            name: subData.name || 'Sub-Admin',
            subAdminCode,
            assignedCourseId: subData.courseId,
          };
        }
      }
    } catch (err) {
      console.warn('[Auth] Sub-admin verification failed:', err);
    }
  }

  return null;
}

export async function verifyStudentEnrollment(
  req: Request,
  db: Firestore,
  adminAuth: Auth | null,
  requiredCourseId?: string
): Promise<VerifiedStudentContext> {
  // Check if requester is a verified Admin first (Admins may inspect or host)
  const adminCtx = await verifyAdminIdentity(req, db, adminAuth);
  if (adminCtx) {
    const adminAllowedCourseIds =
      adminCtx.role === 'main_admin'
        ? ['course-all']
        : adminCtx.assignedCourseId
        ? [adminCtx.assignedCourseId]
        : [];
    const authorized =
      !requiredCourseId ||
      adminCtx.role === 'main_admin' ||
      adminCtx.assignedCourseId === requiredCourseId;
    return {
      authorized,
      userId: adminCtx.uid,
      studentName: adminCtx.name,
      studentEmail: adminCtx.email,
      enrolledCourseIds: adminAllowedCourseIds,
      isAdminBypass: true,
      reason: authorized ? undefined : 'Sub-Admin is only authorized for their assigned course.',
    };
  }

  let verifiedUid = '';
  let verifiedEmail = '';
  let verifiedName = '';

  const idToken = getBearerToken(req);
  if (idToken) {
    try {
      const decoded = adminAuth
        ? await adminAuth.verifyIdToken(idToken)
        : await verifyFirebaseIdTokenViaRest(idToken);
      if (decoded) {
        verifiedUid = decoded.uid;
        verifiedEmail = decoded.email || '';
        verifiedName = decoded.name || '';
      }
    } catch {
      // Token invalid/expired; fall back to verified activation key checks
    }
  }

  const headerStudentUid = String(req.headers['x-student-uid'] || '').trim();
  const deviceId = String(req.headers['x-device-id'] || '').trim();
  const candidateCodes = parseActivationCodesHeader(req);
  const now = Date.now();

  const enrolledCourseIds = new Set<string>();
  let matchedCode = '';
  let resolvedName = verifiedName;
  let resolvedEmail = verifiedEmail;
  let resolvedUid = verifiedUid;

  // 1. Verify activation keys directly from Firestore (Authoritative purchase/access ledger)
  for (const code of candidateCodes) {
    try {
      const keySnap = await db.collection('activation_keys').doc(code).get();
      if (!keySnap.exists) continue;
      const keyData = keySnap.data() as Record<string, any>;
      if (keyData.status !== 'used') continue;
      if (isActivationKeyExpiredServer(keyData, now)) continue;

      // Single-device / ownership check: either device matches or verified UID matches owner
      const deviceMatches = !keyData.activeDeviceId || !deviceId || keyData.activeDeviceId === deviceId;
      const uidMatches =
        (verifiedUid && keyData.claimedByUid === verifiedUid) ||
        (headerStudentUid && keyData.claimedByUid === headerStudentUid);

      if (!deviceMatches && !uidMatches) continue;

      if (keyData.courseId) {
        enrolledCourseIds.add(String(keyData.courseId));
      }
      if (!matchedCode || keyData.courseId === requiredCourseId || keyData.courseId === 'course-all') {
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
      console.warn('[Enrollment] Key check error:', err);
    }
  }

  // 2. Check activation_keys claimed by verified Firebase UID
  if (verifiedUid) {
    try {
      const claimedSnap = await db
        .collection('activation_keys')
        .where('claimedByUid', '==', verifiedUid)
        .get();
      claimedSnap.forEach((docSnap) => {
        const keyData = docSnap.data() as Record<string, any>;
        if (keyData.status === 'used' && !isActivationKeyExpiredServer(keyData, now)) {
          if (keyData.courseId) enrolledCourseIds.add(String(keyData.courseId));
          if (!matchedCode) matchedCode = docSnap.id;
          if (!resolvedName && (keyData.studentName || keyData.claimedByName)) {
            resolvedName = String(keyData.studentName || keyData.claimedByName);
          }
        }
      });
    } catch (err) {
      console.warn('[Enrollment] UID key lookup error:', err);
    }

    // 3. Check `enrollments` collection for verified UID
    try {
      const enrollSnap = await db
        .collection('enrollments')
        .where('userId', '==', verifiedUid)
        .where('status', '==', 'active')
        .get();
      enrollSnap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, any>;
        if (!d.expiresAt || Number(d.expiresAt) > now) {
          if (d.courseId) enrolledCourseIds.add(String(d.courseId));
        }
      });
    } catch (err) {
      console.warn('[Enrollment] Enrollments lookup error:', err);
    }

    // 4. Check approved `course_requests` for verified UID
    try {
      const reqSnap = await db
        .collection('course_requests')
        .where('userId', '==', verifiedUid)
        .where('status', '==', 'accepted')
        .get();
      reqSnap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, any>;
        if (!d.expiresAt || Number(d.expiresAt) > now) {
          if (d.courseId) enrolledCourseIds.add(String(d.courseId));
        }
      });
    } catch (err) {
      console.warn('[Enrollment] course_requests lookup error:', err);
    }
  }

  const courseList = Array.from(enrolledCourseIds);
  const effectiveUserId = resolvedUid || (matchedCode ? `key_${matchedCode}` : headerStudentUid || '');

  if (courseList.length === 0 || !effectiveUserId) {
    return {
      authorized: false,
      userId: effectiveUserId,
      studentName: resolvedName || 'Guest',
      studentEmail: resolvedEmail,
      enrolledCourseIds: [],
      reason: 'No active verified course enrollment found for this account.',
    };
  }

  const hasCourseAccess =
    !requiredCourseId ||
    courseList.includes('course-all') ||
    courseList.includes(requiredCourseId);

  return {
    authorized: hasCourseAccess,
    userId: effectiveUserId,
    studentName: resolvedName || 'Enrolled Student',
    studentEmail: resolvedEmail || undefined,
    activationCode: matchedCode || undefined,
    enrolledCourseIds: courseList,
    reason: hasCourseAccess
      ? undefined
      : 'You must purchase and activate this course before accessing its live class.',
  };
}
