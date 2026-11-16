import express, { type Request, type Response, type Router } from 'express';
import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { Messaging } from 'firebase-admin/messaging';
import {
  getAdminDb,
  getAdminAuth,
  getAdminMessaging,
  getConfiguredDatabaseId,
  getFirebaseAdminInitError,
  markAdminSdkUnusable,
} from './firebaseAdmin.ts';
import { createRestFirestore } from './firestoreRest.ts';
import {
  createZoomMeeting,
  updateZoomMeeting,
  deleteZoomMeeting,
  isZoomConfigured,
  verifyZoomConnection,
  ZoomApiError,
} from './zoomService.ts';
import {
  createGoogleMeetSpace,
  GoogleMeetApiError,
} from './googleMeetService.ts';
import {
  createRateLimiter,
  verifyAdminIdentity,
  verifyStudentEnrollment,
  isActivationKeyExpiredServer,
} from './authAndEnrollment.ts';

export interface LiveClassRouterDeps {
  getDb?: () => Firestore | null;
  getAuth?: () => Auth | null;
  getMessaging?: () => Messaging | null;
  zoomApi?: {
    isConfigured: typeof isZoomConfigured;
    createMeeting: typeof createZoomMeeting;
    updateMeeting: typeof updateZoomMeeting;
    deleteMeeting: typeof deleteZoomMeeting;
    verifyConnection?: typeof verifyZoomConnection;
  };
  createGoogleMeetSpace?: typeof createGoogleMeetSpace;
}

type ResolvedProvider = 'google_meet' | 'manual' | 'zoom';

function normalizeProvider(raw: unknown, fallback: ResolvedProvider = 'zoom'): ResolvedProvider {
  const val = String(raw || '').trim();
  if (val === 'google_meet' || val === 'manual' || val === 'zoom') return val;
  return fallback;
}

function extractGoogleMeetToken(req: Request): string {
  const headerVal = String(req.headers['x-google-meet-token'] || '').trim();
  if (headerVal) {
    return headerVal.startsWith('Bearer ') ? headerVal.slice(7).trim() : headerVal;
  }
  return String(req.body?.googleMeetAccessToken || '').trim();
}

function sanitizeId(raw: string): string {
  return String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function maskMeetingId(meetingId?: string): string {
  if (!meetingId) return '';
  const str = String(meetingId);
  if (str.length <= 4) return '****';
  return `${str.slice(0, 3)}••••${str.slice(-3)}`;
}

function formatClassDateTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kathmandu',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(ms)) + ' NPT';
  } catch {
    return new Date(ms).toISOString();
  }
}

export function computeEffectiveStatus(cls: Record<string, any>, now = Date.now()): string {
  if (cls.status === 'cancelled' || cls.status === 'draft') return cls.status;
  const start = Number(cls.scheduledStartAt || 0);
  const durationMs = Number(cls.durationMinutes || 40) * 60_000;
  const end = Number(cls.scheduledEndAt || start + durationMs);
  const joinBeforeMs = Number(cls.joinWindowMinutesBefore ?? 15) * 60_000;

  if (now > end + 10 * 60_000) return 'completed';
  if (now >= start - joinBeforeMs && now <= end + 10 * 60_000) return 'live';
  return 'published';
}

export async function dispatchLiveClassNotifications(params: {
  db: Firestore;
  messaging: Messaging | null;
  classData: Record<string, any>;
  reminderType: 'published' | '30m' | '5m' | 'manual';
  customTitle?: string;
  customBody?: string;
}): Promise<{ sent: boolean; skippedDuplicate: boolean; tokenCount: number; deliveredCount: number }> {
  const { db, messaging, classData, reminderType, customTitle, customBody } = params;
  const classId = String(classData.id);
  const deliveryKey =
    reminderType === 'manual'
      ? `${classId}__manual_${Date.now()}`
      : `${classId}__${reminderType}`;

  // Deduplication lock for automated/publish notifications
  if (reminderType !== 'manual') {
    const lockRef = db.collection('notificationDeliveries').doc(deliveryKey);
    const acquired = await db.runTransaction(async (tx) => {
      const snap = await tx.get(lockRef);
      if (snap.exists) return false;
      tx.set(lockRef, {
        deliveryKey,
        liveClassId: classId,
        courseId: classData.courseId,
        reminderType,
        createdAt: Date.now(),
      });
      return true;
    });

    if (!acquired) {
      return { sent: false, skippedDuplicate: true, tokenCount: 0, deliveredCount: 0 };
    }
  }

  const whenStr = formatClassDateTime(Number(classData.scheduledStartAt));
  let title = customTitle?.trim() || '';
  let body = customBody?.trim() || '';
  let badge = 'LIVE CLASS';

  if (!title) {
    if (reminderType === 'published') {
      title = `🔴 New Live Class: ${classData.title}`;
      badge = 'LIVE CLASS';
    } else if (reminderType === '30m') {
      title = `⏰ Starts in 30 mins: ${classData.title}`;
      badge = '30M REMINDER';
    } else if (reminderType === '5m') {
      title = `🚨 Starting in 5 mins: ${classData.title}`;
      badge = 'JOIN SOON';
    } else {
      title = `📢 Live Class Update: ${classData.title}`;
      badge = 'LIVE UPDATE';
    }
  }

  if (!body) {
    body = `${classData.courseTitle || 'Course'} • ${whenStr} (${classData.durationMinutes || 40} min). Tap to open Live Class.`;
  }

  const targetUrl = `/?tab=live&classId=${encodeURIComponent(classId)}`;
  const notifRef = db.collection('notifications').doc();
  const now = Date.now();

  await notifRef.set({
    id: notifRef.id,
    title,
    body,
    type: reminderType === '30m' || reminderType === '5m' ? 'live_reminder' : 'live_class',
    badge,
    url: targetUrl,
    target: 'course_enrolled',
    courseId: classData.courseId,
    courseTitle: classData.courseTitle || '',
    liveClassId: classId,
    deliveryKey,
    reminderType,
    author: classData.instructorName || 'AI Clipzone',
    createdAt: now,
  });

  // Mark reminder flags on liveClass doc
  if (reminderType === '30m') {
    await db.collection('liveClasses').doc(classId).set({ reminder30mSent: true }, { merge: true }).catch(() => {});
  } else if (reminderType === '5m') {
    await db.collection('liveClasses').doc(classId).set({ reminder5mSent: true }, { merge: true }).catch(() => {});
  }

  // Collect FCM tokens ONLY for students enrolled in classData.courseId (or course-all)
  let tokenCount = 0;
  let deliveredCount = 0;

  if (messaging) {
    try {
      const fcmSnap = await db.collection('fcmTokens').get();
      const targetTokens: { docId: string; token: string }[] = [];

      for (const docSnap of fcmSnap.docs) {
        const d = docSnap.data() as Record<string, any>;
        const token = typeof d.token === 'string' ? d.token.trim() : '';
        if (!token) continue;

        const enrolledCourses: string[] = Array.isArray(d.enrolledCourseIds) ? d.enrolledCourseIds : [];
        const hasCourse =
          enrolledCourses.includes('course-all') ||
          enrolledCourses.includes(String(classData.courseId));

        if (hasCourse) {
          targetTokens.push({ docId: docSnap.id, token });
        }
      }

      tokenCount = targetTokens.length;
      if (targetTokens.length > 0) {
        // Send in batches of 500 (FCM multicast limit)
        for (let i = 0; i < targetTokens.length; i += 500) {
          const chunk = targetTokens.slice(i, i + 500);
          const response = await messaging.sendEachForMulticast({
            tokens: chunk.map((t) => t.token),
            notification: {
              title,
              body,
            },
            data: {
              url: targetUrl,
              liveClassId: classId,
              courseId: String(classData.courseId || ''),
              courseTitle: String(classData.courseTitle || ''),
              deliveryKey,
              reminderType,
              title,
              body,
            },
            webpush: {
              notification: {
                title,
                body,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: deliveryKey,
                requireInteraction: reminderType === '5m',
              },
              fcmOptions: {
                link: targetUrl,
              },
            },
          });

          deliveredCount += response.successCount;

          // Clean up invalid/unregistered FCM tokens automatically
          const invalidDeletes: Promise<any>[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const code = resp.error?.code || '';
              if (
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token'
              ) {
                invalidDeletes.push(
                  db.collection('fcmTokens').doc(chunk[idx].docId).delete().catch(() => {})
                );
              }
            }
          });
          if (invalidDeletes.length > 0) await Promise.all(invalidDeletes);
        }
      }
    } catch (fcmErr) {
      console.warn('[FCM] Multicast send warning:', fcmErr);
    }
  }

  return { sent: true, skippedDuplicate: false, tokenCount, deliveredCount };
}

export function createLiveClassRouter(deps: LiveClassRouterDeps = {}): Router {
  const router = express.Router();
  const resolveDb = deps.getDb || getAdminDb;
  const resolveAuth = deps.getAuth || getAdminAuth;
  const resolveMessaging = deps.getMessaging || getAdminMessaging;
  const zoomApi = deps.zoomApi || {
    isConfigured: isZoomConfigured,
    createMeeting: createZoomMeeting,
    updateMeeting: updateZoomMeeting,
    deleteMeeting: deleteZoomMeeting,
    verifyConnection: verifyZoomConnection,
  };
  const createMeetSpaceFn = deps.createGoogleMeetSpace || createGoogleMeetSpace;

  const joinLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 25, keyPrefix: 'join' });
  const adminMutationLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, keyPrefix: 'admin' });

  // Health & Readiness Status (safe booleans only, no secrets)
  router.get('/health', (_req: Request, res: Response) => {
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
      initError: db ? null : getFirebaseAdminInitError(),
    });
  });

  // Admin-only live verification of Zoom Server-to-Server OAuth credentials
  router.post('/verify-zoom', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = getRequestDb(req);
      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) {
        return res.status(403).json({ error: 'Only verified Admin or Sub-Admin can test Zoom credentials.' });
      }
      const verifyFn = zoomApi.verifyConnection || verifyZoomConnection;
      await verifyFn();
      return res.json({
        ok: true,
        message: 'Zoom Server-to-Server OAuth credentials are active and verified.',
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        code: err instanceof ZoomApiError ? err.code : 'ZOOM_OAUTH_ERROR',
        error: err?.message || 'Zoom verification failed.',
      });
    }
  });

  // Helper to resolve Firebase Admin DB or seamless Firestore REST adapter forwarding caller ID token
  function getRequestDb(req: Request): Firestore {
    const adminDb = resolveDb();
    if (adminDb) return adminDb;
    const authHeader = String(req.headers.authorization || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    return createRestFirestore(idToken) as unknown as Firestore;
  }

  function handleRouteError(res: Response, fallbackMsg: string, err: any) {
    const msg = String(err?.message || '');
    if (
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('Missing or insufficient permissions') ||
      err?.code === 7
    ) {
      const initReason = getFirebaseAdminInitError();
      const detail = initReason ? ` (${initReason})` : '';
      return res.status(403).json({
        error: `Firestore permission denied in REST mode. Update FIREBASE_SERVICE_ACCOUNT_JSON to match the configured Firebase project or sign in with your Admin Email account.${detail}`,
        code: 'FIRESTORE_PERMISSION_DENIED',
      });
    }
    return res.status(500).json({ error: msg || fallbackMsg });
  }

  // Legacy alias kept compatible with all existing route handlers
  function requireDb(_res: Response, req?: Request): Firestore {
    if (req) return getRequestDb(req);
    const adminDb = resolveDb();
    return (adminDb || createRestFirestore()) as unknown as Firestore;
  }

  // Register / Update Student FCM Push Token (verifies enrolled courses on backend)
  router.post('/fcm-token', async (req: Request, res: Response) => {
    try {
      const db = getRequestDb(req);

      const token = String(req.body?.token || '').trim();
      if (!token || token.length < 20 || token.length > 4096) {
        return res.status(400).json({ error: 'Valid FCM device token is required.' });
      }

      const adminAuth = resolveAuth();
      const studentCtx = await verifyStudentEnrollment(req, db, adminAuth);
      const tokenDocId = crypto.createHash('sha256').update(token).digest('hex').slice(0, 40);

      try {
        await db.collection('fcmTokens').doc(tokenDocId).set(
          {
            token,
            userId: studentCtx.userId || String(req.headers['x-student-uid'] || req.headers['x-device-id'] || 'anonymous'),
            enrolledCourseIds: studentCtx.enrolledCourseIds || [],
            activationCode: studentCtx.activationCode || '',
            platform: String(req.body?.platform || 'web').slice(0, 40),
            isPwa: Boolean(req.body?.isPwa),
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      } catch (err: any) {
        // Non-fatal in REST fallback mode for non-admin tokens
        console.warn('[FCM] Backend token write skipped/denied:', err?.message || err);
      }

      res.json({
        success: true,
        enrolledCourseIds: studentCtx.enrolledCourseIds,
      });
    } catch (err: any) {
      return handleRouteError(res, 'Failed to register FCM token.', err);
    }
  });

  // List Live Classes (Student-safe: NEVER returns password, joinUrl, or startUrl)
  router.get('/', async (req: Request, res: Response) => {
    let db = getRequestDb(req);

    try {
      const adminAuth = resolveAuth();
      const adminCtx = await verifyAdminIdentity(req, db, adminAuth);
      const studentCtx = adminCtx ? null : await verifyStudentEnrollment(req, db, adminAuth);
      const hasAdminJwt = Boolean(adminCtx?.email);
      const isRestDb = Boolean((db as any).isRestFallback);

      let rawDocs: any[] = [];
      try {
        // When using Firestore REST without a verified Firebase Admin JWT, query status != 'draft'
        // via public REST query so expired/non-admin client tokens never trigger 7 PERMISSION_DENIED.
        if (isRestDb && !hasAdminJwt) {
          const publicRestDb = createRestFirestore();
          const snap = await publicRestDb.collection('liveClasses').where('status', '!=', 'draft').get();
          rawDocs = snap.docs;
        } else {
          const snap = await db.collection('liveClasses').orderBy('scheduledStartAt', 'asc').get();
          rawDocs = snap.docs;
        }
      } catch (queryErr: any) {
        const msg = String(queryErr?.message || '');
        if (!isRestDb && (msg.includes('PERMISSION_DENIED') || queryErr?.code === 7)) {
          // If an environment ADC credential failed with PERMISSION_DENIED, transparently downgrade to REST
          markAdminSdkUnusable(msg);
          const authHeader = String(req.headers.authorization || '');
          const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
          db = createRestFirestore(hasAdminJwt ? idToken : undefined) as unknown as Firestore;
          const fallbackSnap = hasAdminJwt
            ? await db.collection('liveClasses').orderBy('scheduledStartAt', 'asc').get()
            : await db.collection('liveClasses').where('status', '!=', 'draft').get();
          rawDocs = fallbackSnap.docs;
        } else {
          throw queryErr;
        }
      }

      rawDocs.sort(
        (a, b) => Number(a.data()?.scheduledStartAt || 0) - Number(b.data()?.scheduledStartAt || 0)
      );

      const now = Date.now();
      const items: any[] = [];

      for (const docSnap of rawDocs) {
        const data = docSnap.data() as Record<string, any>;
        if (adminCtx?.role === 'sub_admin' && adminCtx.assignedCourseId && data.courseId !== adminCtx.assignedCourseId) {
          continue;
        }
        if (!adminCtx && data.status === 'draft') {
          continue;
        }

        const effectiveStatus = computeEffectiveStatus(data, now);
        const safeItem: Record<string, any> = {
          id: docSnap.id,
          courseId: data.courseId,
          courseTitle: data.courseTitle,
          title: data.title,
          description: data.description || '',
          instructorName: data.instructorName || 'AI Clipzone',
          provider: normalizeProvider(data.provider, 'zoom'),
          scheduledStartAt: Number(data.scheduledStartAt),
          durationMinutes: Number(data.durationMinutes || 40),
          scheduledEndAt: Number(data.scheduledEndAt || Number(data.scheduledStartAt) + Number(data.durationMinutes || 40) * 60_000),
          maxCapacity: Number(data.maxCapacity || 80),
          registeredCount: Number(data.registeredCount || 0),
          status: effectiveStatus,
          joinWindowMinutesBefore: Number(data.joinWindowMinutesBefore ?? 15),
          zoomCreated: Boolean(data.zoomCreated),
          zoomMeetingStatus: data.zoomMeetingStatus || (data.zoomCreated ? 'created' : 'pending'),
          zoomMeetingIdMasked: data.zoomMeetingIdMasked || '',
          zoomError: adminCtx ? data.zoomError || '' : undefined,
          sendReminder30m: Boolean(data.sendReminder30m),
          sendReminder5m: Boolean(data.sendReminder5m),
          reminder30mSent: Boolean(data.reminder30mSent),
          reminder5mSent: Boolean(data.reminder5mSent),
          publishedAt: data.publishedAt || null,
          createdAt: Number(data.createdAt || 0),
          updatedAt: Number(data.updatedAt || 0),
        };

        // Only hydrate Zoom secret details for verified Admins
        if (adminCtx && data.zoomCreated) {
          try {
            const secSnap = await db.collection('liveClassSecrets').doc(docSnap.id).get();
            if (secSnap.exists) {
              const sec = secSnap.data() as Record<string, any>;
              safeItem.zoomMeetingId = sec.zoomMeetingId || '';
              safeItem.zoomPasscode = sec.zoomPasscode || '';
              safeItem.zoomStartUrl = sec.zoomStartUrl || '';
            }
          } catch {
            // In REST fallback mode without Firebase Admin email JWT, skip secret hydration safely
          }
        }

        // Hydrate student's own registration state if authorized
        if (studentCtx?.authorized && studentCtx.userId) {
          try {
            const regSnap = await db
              .collection('liveClasses')
              .doc(docSnap.id)
              .collection('registrations')
              .doc(sanitizeId(studentCtx.userId))
              .get();
            safeItem.isRegistered = regSnap.exists;
          } catch {
            safeItem.isRegistered = false;
          }
        }

        items.push(safeItem);
      }

      res.json({
        classes: items,
        role: adminCtx?.role || (studentCtx?.authorized ? 'student' : 'guest'),
      });
    } catch (err: any) {
      console.error('[LiveClasses] List error:', err);
      return handleRouteError(res, 'Failed to load live classes.', err);
    }
  });

  // Create a new Live Class + Automatic Zoom Meeting Creation (Admin / Sub-Admin)
  router.post('/', adminMutationLimiter, async (req: Request, res: Response) => {
    const db = requireDb(res, req);

    const adminAuth = resolveAuth();
    const adminCtx = await verifyAdminIdentity(req, db, adminAuth);
    if (!adminCtx) {
      return res.status(403).json({ error: 'Unauthorized: Admin verification required.' });
    }

    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const courseId = String(req.body?.courseId || '').trim();
    const instructorName = String(req.body?.instructorName || adminCtx.name || 'AI Clipzone').trim();
    const scheduledStartAt = Number(req.body?.scheduledStartAt || 0);
    const durationMinutes = Math.min(Math.max(Number(req.body?.durationMinutes || 40), 10), 300);
    const maxCapacity = Math.min(Math.max(Number(req.body?.maxCapacity || 80), 1), 1000);
    const joinWindowMinutesBefore = Math.min(Math.max(Number(req.body?.joinWindowMinutesBefore ?? 15), 0), 120);
    const sendReminder30m = req.body?.sendReminder30m !== false;
    const sendReminder5m = req.body?.sendReminder5m !== false;
    const publishNow = Boolean(req.body?.publishNow ?? req.body?.publishImmediately);
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim().slice(0, 128);
    const provider = normalizeProvider(req.body?.provider, 'zoom');
    const manualMeetingUrl = String(req.body?.manualMeetingUrl || '').trim();
    const manualMeetingId = String(req.body?.manualMeetingId || '').trim();
    const manualPasscode = String(req.body?.manualPasscode || '').trim();

    if (!title || title.length < 3 || title.length > 200) {
      return res.status(400).json({ error: 'Class title must be between 3 and 200 characters.' });
    }
    if (!courseId) {
      return res.status(400).json({ error: 'Please select an existing course.' });
    }
    if (!scheduledStartAt || Number.isNaN(scheduledStartAt)) {
      return res.status(400).json({ error: 'Valid class date and start time are required.' });
    }
    if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId && adminCtx.assignedCourseId !== courseId) {
      return res.status(403).json({ error: 'Sub-Admin can only create live classes for their assigned course.' });
    }
    if (provider === 'manual' && !/^https?:\/\/\S+/i.test(manualMeetingUrl)) {
      return res.status(400).json({
        error: 'Please enter a valid live meeting URL starting with https:// or http://.',
        code: 'MANUAL_URL_REQUIRED',
      });
    }

    try {
      // 1. Prevent duplicate meeting creation on retry using idempotencyKey
      if (idempotencyKey) {
        try {
          const dupSnap = await db
            .collection('liveClasses')
            .where('idempotencyKey', '==', idempotencyKey)
            .limit(1)
            .get();
          if (!dupSnap.empty) {
            const existingDoc = dupSnap.docs[0];
            const existingData = existingDoc.data();
            const secSnap = await db.collection('liveClassSecrets').doc(existingDoc.id).get().catch(() => null);
            const sec = secSnap?.exists ? secSnap.data() : {};
            return res.status(200).json({
              deduplicated: true,
              liveClass: {
                id: existingDoc.id,
                ...existingData,
                provider: normalizeProvider(existingData?.provider, 'zoom'),
                zoomMeetingId: sec?.zoomMeetingId || '',
                zoomPasscode: sec?.zoomPasscode || '',
                zoomStartUrl: sec?.zoomStartUrl || '',
              },
            });
          }
        } catch {
          // Skip idempotency pre-check if running in REST mode without Admin JWT
        }
      }

      // 2. Verify course exists in Firestore `courses` (or accept provided title if fallback)
      const courseSnap = await db.collection('courses').doc(courseId).get();
      if (adminCtx.role === 'sub_admin' && courseSnap.exists && !courseSnap.data()?.hasLiveSessions) {
        return res.status(403).json({
          error: 'Live Classes are not enabled for this course by Main Admin.',
          code: 'LIVE_NOT_ENABLED_BY_ADMIN',
        });
      }
      const courseTitle = courseSnap.exists
        ? String(courseSnap.data()?.title || req.body?.courseTitle || courseId)
        : String(req.body?.courseTitle || courseId);

      // 3. Create meeting via selected provider (Google Meet, Manual Link, or Zoom S2S OAuth)
      let meetingResult: {
        meetingId: string;
        joinUrl: string;
        startUrl: string;
        password: string;
        hostEmail?: string;
        meetSpaceName?: string;
      } | null = null;
      let providerError = '';

      if (provider === 'google_meet') {
        try {
          const accessToken = extractGoogleMeetToken(req);
          const space = await createMeetSpaceFn(accessToken);
          meetingResult = {
            meetingId: space.meetingCode,
            joinUrl: space.meetingUri,
            startUrl: space.meetingUri,
            password: '',
            hostEmail: adminCtx.email || '',
            meetSpaceName: space.spaceName,
          };
        } catch (mErr: any) {
          providerError = mErr?.message || 'Google Meet space creation failed.';
          console.error('[GoogleMeet] Create space failed:', providerError);
          if (publishNow) {
            return res.status(mErr instanceof GoogleMeetApiError ? mErr.statusCode : 502).json({
              error: providerError,
              code: mErr instanceof GoogleMeetApiError ? mErr.code : 'GOOGLE_MEET_ERROR',
            });
          }
        }
      } else if (provider === 'manual') {
        meetingResult = {
          meetingId: manualMeetingId || 'Direct Link',
          joinUrl: manualMeetingUrl,
          startUrl: manualMeetingUrl,
          password: manualPasscode,
          hostEmail: adminCtx.email || '',
        };
      } else {
        try {
          const z = await zoomApi.createMeeting({
            topic: `${title} — ${courseTitle}`,
            agenda: description || `Live Class for ${courseTitle}`,
            startTimeMs: scheduledStartAt,
            durationMinutes,
          });
          meetingResult = {
            meetingId: z.meetingId,
            joinUrl: z.joinUrl,
            startUrl: z.startUrl,
            password: z.password,
            hostEmail: z.hostEmail || '',
          };
        } catch (zErr: any) {
          providerError = zErr?.message || 'Zoom meeting creation failed.';
          console.error('[Zoom] Create meeting failed:', providerError);
          if (publishNow) {
            return res.status(zErr instanceof ZoomApiError ? zErr.statusCode : 502).json({
              error: `Zoom API Error: ${providerError}`,
              code: zErr instanceof ZoomApiError ? zErr.code : 'ZOOM_ERROR',
            });
          }
        }
      }

      const now = Date.now();
      const classRef = db.collection('liveClasses').doc();
      const classId = classRef.id;
      const scheduledEndAt = scheduledStartAt + durationMinutes * 60_000;
      const initialStatus = publishNow && meetingResult ? 'published' : 'draft';

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
        zoomMeetingStatus: meetingResult ? 'created' : 'failed',
        zoomMeetingIdMasked: meetingResult ? maskMeetingId(meetingResult.meetingId) : '',
        zoomError: providerError || '',
        idempotencyKey: idempotencyKey || classId,
        sendReminder30m,
        sendReminder5m,
        reminder30mSent: false,
        reminder5mSent: false,
        publishedAt: initialStatus === 'published' ? now : null,
        createdBy: adminCtx.uid,
        createdByRole: adminCtx.role,
        createdAt: now,
        updatedAt: now,
      };

      await classRef.set(classDoc);

      if (meetingResult) {
        await db.collection('liveClassSecrets').doc(classId).set({
          liveClassId: classId,
          provider,
          zoomMeetingId: meetingResult.meetingId,
          zoomJoinUrl: meetingResult.joinUrl,
          zoomStartUrl: meetingResult.startUrl,
          zoomPasscode: meetingResult.password,
          hostEmail: meetingResult.hostEmail || '',
          ...(meetingResult.meetSpaceName ? { meetSpaceName: meetingResult.meetSpaceName } : {}),
          createdAt: now,
          updatedAt: now,
        });
      }

      let notificationResult = null;
      if (initialStatus === 'published') {
        notificationResult = await dispatchLiveClassNotifications({
          db,
          messaging: resolveMessaging(),
          classData: classDoc,
          reminderType: 'published',
        });
      }

      res.status(201).json({
        success: true,
        liveClass: {
          ...classDoc,
          zoomMeetingId: meetingResult?.meetingId || '',
          zoomPasscode: meetingResult?.password || '',
          zoomStartUrl: meetingResult?.startUrl || '',
        },
        notificationResult,
        zoomWarning: providerError || undefined,
      });
    } catch (err: any) {
      console.error('[LiveClasses] Create error:', err);
      return handleRouteError(res, 'Failed to create live class.', err);
    }
  });

  // Retry or switch provider sync cleanly without duplicating existing meetings
  router.post('/:id/retry-zoom', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

      const classId = sanitizeId(req.params.id);
      const classRef = db.collection('liveClasses').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const data = classSnap.data() as Record<string, any>;
      if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: 'Unauthorized for this course.' });
      }

      const secSnap = await db.collection('liveClassSecrets').doc(classId).get();
      if (secSnap.exists && secSnap.data()?.zoomMeetingId) {
        const sec = secSnap.data()!;
        return res.json({
          success: true,
          deduplicated: true,
          provider: normalizeProvider(sec.provider || data.provider, 'zoom'),
          zoomMeetingId: sec.zoomMeetingId,
          zoomPasscode: sec.zoomPasscode,
          zoomStartUrl: sec.zoomStartUrl,
        });
      }

      const targetProvider = normalizeProvider(req.body?.provider, normalizeProvider(data.provider, 'zoom'));

      try {
        let meetingResult: {
          meetingId: string;
          joinUrl: string;
          startUrl: string;
          password: string;
          hostEmail?: string;
          meetSpaceName?: string;
        };

        if (targetProvider === 'google_meet') {
          const accessToken = extractGoogleMeetToken(req);
          const space = await createMeetSpaceFn(accessToken);
          meetingResult = {
            meetingId: space.meetingCode,
            joinUrl: space.meetingUri,
            startUrl: space.meetingUri,
            password: '',
            hostEmail: adminCtx.email || '',
            meetSpaceName: space.spaceName,
          };
        } else if (targetProvider === 'manual') {
          const manualMeetingUrl = String(req.body?.manualMeetingUrl || '').trim();
          if (!/^https?:\/\/\S+/i.test(manualMeetingUrl)) {
            return res.status(400).json({
              error: 'Please enter a valid live meeting URL starting with https:// or http://.',
              code: 'MANUAL_URL_REQUIRED',
            });
          }
          meetingResult = {
            meetingId: String(req.body?.manualMeetingId || '').trim() || 'Direct Link',
            joinUrl: manualMeetingUrl,
            startUrl: manualMeetingUrl,
            password: String(req.body?.manualPasscode || '').trim(),
            hostEmail: adminCtx.email || '',
          };
        } else {
          const z = await zoomApi.createMeeting({
            topic: `${data.title} — ${data.courseTitle || data.courseId}`,
            agenda: data.description || '',
            startTimeMs: Number(data.scheduledStartAt),
            durationMinutes: Number(data.durationMinutes || 40),
          });
          meetingResult = {
            meetingId: z.meetingId,
            joinUrl: z.joinUrl,
            startUrl: z.startUrl,
            password: z.password,
            hostEmail: z.hostEmail || '',
          };
        }

        const now = Date.now();
        await db.collection('liveClassSecrets').doc(classId).set({
          liveClassId: classId,
          provider: targetProvider,
          zoomMeetingId: meetingResult.meetingId,
          zoomJoinUrl: meetingResult.joinUrl,
          zoomStartUrl: meetingResult.startUrl,
          zoomPasscode: meetingResult.password,
          hostEmail: meetingResult.hostEmail || '',
          ...(meetingResult.meetSpaceName ? { meetSpaceName: meetingResult.meetSpaceName } : {}),
          createdAt: now,
          updatedAt: now,
        });

        await classRef.set(
          {
            provider: targetProvider,
            zoomCreated: true,
            zoomMeetingStatus: 'created',
            zoomMeetingIdMasked: maskMeetingId(meetingResult.meetingId),
            zoomError: '',
            updatedAt: now,
          },
          { merge: true }
        );

        res.json({
          success: true,
          provider: targetProvider,
          zoomMeetingId: meetingResult.meetingId,
          zoomPasscode: meetingResult.password,
          zoomStartUrl: meetingResult.startUrl,
        });
      } catch (pErr: any) {
        const errMsg = pErr?.message || 'Meeting sync failed.';
        await classRef.set(
          {
            provider: targetProvider,
            zoomCreated: false,
            zoomMeetingStatus: 'failed',
            zoomError: errMsg,
            updatedAt: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
        const statusCode =
          pErr instanceof GoogleMeetApiError
            ? pErr.statusCode
            : pErr instanceof ZoomApiError
            ? pErr.statusCode
            : 502;
        const code =
          pErr instanceof GoogleMeetApiError
            ? pErr.code
            : pErr instanceof ZoomApiError
            ? pErr.code
            : 'MEETING_SYNC_FAILED';
        res.status(statusCode).json({ error: errMsg, code });
      }
    } catch (err: any) {
      console.error('[LiveClasses] Retry meeting sync error:', err);
      return handleRouteError(res, 'Failed to retry meeting sync.', err);
    }
  });

  // Update Live Class Details & Sync to Zoom
  router.patch('/:id', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

    const classId = sanitizeId(req.params.id);
    const classRef = db.collection('liveClasses').doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

    const existing = classSnap.data() as Record<string, any>;
    if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== existing.courseId) {
      return res.status(403).json({ error: 'Unauthorized for this course.' });
    }

    const title = req.body?.title !== undefined ? String(req.body.title).trim() : existing.title;
    const description = req.body?.description !== undefined ? String(req.body.description).trim() : existing.description;
    const courseId = req.body?.courseId !== undefined ? String(req.body.courseId).trim() : existing.courseId;
    const instructorName =
      req.body?.instructorName !== undefined ? String(req.body.instructorName).trim() : existing.instructorName;
    const scheduledStartAt =
      req.body?.scheduledStartAt !== undefined ? Number(req.body.scheduledStartAt) : Number(existing.scheduledStartAt);
    const durationMinutes =
      req.body?.durationMinutes !== undefined
        ? Math.min(Math.max(Number(req.body.durationMinutes), 10), 300)
        : Number(existing.durationMinutes || 40);
    const maxCapacity =
      req.body?.maxCapacity !== undefined
        ? Math.min(Math.max(Number(req.body.maxCapacity), Math.max(1, Number(existing.registeredCount || 0))), 1000)
        : Number(existing.maxCapacity || 80);
    const joinWindowMinutesBefore =
      req.body?.joinWindowMinutesBefore !== undefined
        ? Math.min(Math.max(Number(req.body.joinWindowMinutesBefore), 0), 120)
        : Number(existing.joinWindowMinutesBefore ?? 15);

    let courseTitle = existing.courseTitle;
    if (courseId !== existing.courseId || req.body?.courseTitle) {
      const courseSnap = await db.collection('courses').doc(courseId).get();
      courseTitle = courseSnap.exists
        ? String(courseSnap.data()?.title || req.body?.courseTitle || courseId)
        : String(req.body?.courseTitle || courseTitle);
    }

    const secSnap = await db.collection('liveClassSecrets').doc(classId).get();
    if (normalizeProvider(existing.provider, 'zoom') === 'zoom' && secSnap.exists && secSnap.data()?.zoomMeetingId) {
      try {
        await zoomApi.updateMeeting(secSnap.data()!.zoomMeetingId, {
          topic: `${title} — ${courseTitle}`,
          agenda: description,
          startTimeMs: scheduledStartAt,
          durationMinutes,
        });
      } catch (zErr: any) {
        console.warn('[Zoom] Update meeting warning:', zErr?.message);
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
      scheduledEndAt: scheduledStartAt + durationMinutes * 60_000,
      maxCapacity,
      joinWindowMinutesBefore,
      sendReminder30m: req.body?.sendReminder30m !== undefined ? Boolean(req.body.sendReminder30m) : Boolean(existing.sendReminder30m),
      sendReminder5m: req.body?.sendReminder5m !== undefined ? Boolean(req.body.sendReminder5m) : Boolean(existing.sendReminder5m),
      updatedAt: now,
    };

    await classRef.set(updates, { merge: true });
    res.json({ success: true, liveClass: { ...existing, ...updates, id: classId } });
    } catch (err: any) {
      console.error('[LiveClasses] Update error:', err);
      return handleRouteError(res, 'Failed to update live class.', err);
    }
  });

  // Publish Live Class & Automatically Notify Enrolled Students
  router.post('/:id/publish', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

      const classId = sanitizeId(req.params.id);
      const classRef = db.collection('liveClasses').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const data = classSnap.data() as Record<string, any>;
      if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: 'Unauthorized for this course.' });
      }
      if (!data.zoomCreated) {
        return res.status(400).json({
          error: 'Cannot publish before a meeting link is created. Sync or retry first.',
        });
      }

      const now = Date.now();
      await classRef.set(
        {
          status: 'published',
          publishedAt: data.publishedAt || now,
          updatedAt: now,
        },
        { merge: true }
      );

      const notificationResult = await dispatchLiveClassNotifications({
        db,
        messaging: resolveMessaging(),
        classData: { ...data, id: classId, status: 'published' },
        reminderType: 'published',
      });

      res.json({
        success: true,
        status: 'published',
        notificationResult,
      });
    } catch (err: any) {
      console.error('[LiveClasses] Publish error:', err);
      return handleRouteError(res, 'Failed to publish live class.', err);
    }
  });

  // Send Manual Notification / Reminder to Enrolled Students Only
  router.post('/:id/notify', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

      const classId = sanitizeId(req.params.id);
      const classSnap = await db.collection('liveClasses').doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const data = classSnap.data() as Record<string, any>;
      if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: 'Unauthorized for this course.' });
      }

      const reminderType = (['published', '30m', '5m', 'manual'].includes(req.body?.reminderType)
        ? req.body.reminderType
        : 'manual') as 'published' | '30m' | '5m' | 'manual';

      const result = await dispatchLiveClassNotifications({
        db,
        messaging: resolveMessaging(),
        classData: { ...data, id: classId },
        reminderType,
        customTitle: req.body?.title,
        customBody: req.body?.body,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[LiveClasses] Notify error:', err);
      return handleRouteError(res, 'Failed to send notifications.', err);
    }
  });

  // Cancel Live Class
  router.post('/:id/cancel', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

      const classId = sanitizeId(req.params.id);
      const classRef = db.collection('liveClasses').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const data = classSnap.data() as Record<string, any>;
      if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: 'Unauthorized for this course.' });
      }

      await classRef.set({ status: 'cancelled', updatedAt: Date.now() }, { merge: true });

      const secSnap = await db.collection('liveClassSecrets').doc(classId).get();
      if (normalizeProvider(data.provider, 'zoom') === 'zoom' && secSnap.exists && secSnap.data()?.zoomMeetingId) {
        await zoomApi.deleteMeeting(secSnap.data()!.zoomMeetingId).catch(() => {});
      }

      if ((req.body?.notifyStudents !== false) && data.status === 'published') {
        const reasonSuffix = req.body?.reason ? ` Reason: ${String(req.body.reason).trim()}` : '';
        await dispatchLiveClassNotifications({
          db,
          messaging: resolveMessaging(),
          classData: { ...data, id: classId },
          reminderType: 'manual',
          customTitle: `❌ Live Class Cancelled: ${data.title}`,
          customBody: `${data.courseTitle || 'Course'} live class scheduled for ${formatClassDateTime(Number(data.scheduledStartAt))} has been cancelled.${reasonSuffix}`,
        });
      }

      res.json({ success: true, status: 'cancelled' });
    } catch (err: any) {
      console.error('[LiveClasses] Cancel error:', err);
      return handleRouteError(res, 'Failed to cancel live class.', err);
    }
  });

  // Delete Live Class + Zoom Meeting + Secrets
  router.delete('/:id', adminMutationLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

      const classId = sanitizeId(req.params.id);
      const classRef = db.collection('liveClasses').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const data = classSnap.data() as Record<string, any>;
      if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== data.courseId) {
        return res.status(403).json({ error: 'Unauthorized for this course.' });
      }

      const secRef = db.collection('liveClassSecrets').doc(classId);
      const secSnap = await secRef.get();
      if (normalizeProvider(data.provider, 'zoom') === 'zoom' && secSnap.exists && secSnap.data()?.zoomMeetingId) {
        await zoomApi.deleteMeeting(secSnap.data()!.zoomMeetingId).catch(() => {});
      }

      // Delete registrations subcollection
      const regSnap = await classRef.collection('registrations').get();
      await Promise.all(regSnap.docs.map((d) => d.ref.delete()));
      await secRef.delete().catch(() => {});
      await classRef.delete();

      res.json({ success: true });
    } catch (err: any) {
      console.error('[LiveClasses] Delete error:', err);
      return handleRouteError(res, 'Failed to delete live class.', err);
    }
  });

  // Admin: View Registered Participants & Course-Enrolled Students
  router.get('/:id/participants', async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      if (!adminCtx) return res.status(403).json({ error: 'Admin verification required.' });

      const classId = sanitizeId(req.params.id);
      const classSnap = await db.collection('liveClasses').doc(classId).get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const classData = classSnap.data() as Record<string, any>;
      if (adminCtx.role === 'sub_admin' && adminCtx.assignedCourseId !== classData.courseId) {
        return res.status(403).json({ error: 'Unauthorized for this course.' });
      }

      const regSnap = await db
        .collection('liveClasses')
        .doc(classId)
        .collection('registrations')
        .orderBy('registeredAt', 'desc')
        .get();
      const registrations = regSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch all enrolled students for this course from activation_keys
      const keysSnap = await db.collection('activation_keys').where('status', '==', 'used').get();
      const now = Date.now();
      const enrolledStudents: any[] = [];
      const seenStudents = new Set<string>();

      keysSnap.forEach((docSnap) => {
        const k = docSnap.data() as Record<string, any>;
        if (isActivationKeyExpiredServer(k, now)) return;
        if (k.courseId !== classData.courseId && k.courseId !== 'course-all') return;
        const key = String(k.claimedByUid || docSnap.id);
        if (seenStudents.has(key)) return;
        seenStudents.add(key);
        enrolledStudents.push({
          code: docSnap.id,
          studentName: k.studentName || k.claimedByName || 'Enrolled Student',
          studentEmail: k.claimedByEmail || '',
          courseTitle: k.courseTitle || classData.courseTitle,
          claimedAt: k.claimedAt || null,
          expiresAt: k.expiresAt || null,
        });
      });

      res.json({
        liveClassId: classId,
        registeredCount: Number(classData.registeredCount || registrations.length),
        maxCapacity: Number(classData.maxCapacity || 80),
        participants: registrations,
        registrations,
        enrolledStudents,
      });
    } catch (err: any) {
      console.error('[LiveClasses] Participants error:', err);
      return handleRouteError(res, 'Failed to fetch participants.', err);
    }
  });

  // Student: Atomic Seat Registration (Max 80 capacity enforced via Firestore Transaction)
  router.post('/:id/register', joinLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const classId = sanitizeId(req.params.id);
      const classRef = db.collection('liveClasses').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

      const classData = classSnap.data() as Record<string, any>;
      const adminAuth = resolveAuth();
      const studentCtx = await verifyStudentEnrollment(req, db, adminAuth, classData.courseId);

      if (!studentCtx.authorized) {
        return res.status(403).json({
          error: studentCtx.reason || 'Access denied: Verified course enrollment is required.',
          code: 'ENROLLMENT_REQUIRED',
        });
      }

      const effectiveStatus = computeEffectiveStatus(classData);
      if (effectiveStatus === 'cancelled' || effectiveStatus === 'completed' || effectiveStatus === 'draft') {
        return res.status(400).json({ error: `Cannot register: Class is currently ${effectiveStatus}.` });
      }

      const regDocId = sanitizeId(studentCtx.userId);
      const regRef = classRef.collection('registrations').doc(regDocId);

      try {
        const txResult = await db.runTransaction(async (tx) => {
          const freshClass = await tx.get(classRef);
          if (!freshClass.exists) throw new Error('CLASS_NOT_FOUND');
          const cData = freshClass.data() as Record<string, any>;

          const existingReg = await tx.get(regRef);
          if (existingReg.exists) {
            return {
              alreadyRegistered: true,
              registeredCount: Number(cData.registeredCount || 0),
              maxCapacity: Number(cData.maxCapacity || 80),
            };
          }

          const currentCount = Number(cData.registeredCount || 0);
          const maxCap = Number(cData.maxCapacity || 80);
          if (currentCount >= maxCap) {
            const capErr: any = new Error(`Class capacity is full (${maxCap}/${maxCap} students).`);
            capErr.code = 'CAPACITY_FULL';
            throw capErr;
          }

          const nextCount = currentCount + 1;
          tx.set(regRef, {
            id: regDocId,
            liveClassId: classId,
            userId: studentCtx.userId,
            studentName: studentCtx.studentName,
            studentEmail: studentCtx.studentEmail || '',
            activationCode: studentCtx.activationCode || '',
            courseId: classData.courseId,
            status: 'registered',
            registeredAt: Date.now(),
          });
          tx.update(classRef, {
            registeredCount: nextCount,
            updatedAt: Date.now(),
          });

          return {
            alreadyRegistered: false,
            registeredCount: nextCount,
            maxCapacity: maxCap,
          };
        });

        res.json({ success: true, ...txResult });
      } catch (err: any) {
        if (err?.code === 'CAPACITY_FULL') {
          return res.status(409).json({ error: err.message, code: 'CAPACITY_FULL' });
        }
        return handleRouteError(res, 'Registration failed.', err);
      }
    } catch (err: any) {
      console.error('[LiveClasses] Register error:', err);
      return handleRouteError(res, 'Registration failed.', err);
    }
  });

  // Student / Admin: Secure Backend Verification & Zoom Join Link Retrieval
  router.post('/:id/join', joinLimiter, async (req: Request, res: Response) => {
    try {
      const db = requireDb(res, req);

      const classId = sanitizeId(req.params.id);
      const classRef = db.collection('liveClasses').doc(classId);
      const classSnap = await classRef.get();
      if (!classSnap.exists) return res.status(404).json({ error: 'Live class not found.' });

    const classData = classSnap.data() as Record<string, any>;
    const adminAuth = resolveAuth();
    const studentCtx = await verifyStudentEnrollment(req, db, adminAuth, classData.courseId);

    if (!studentCtx.authorized) {
      return res.status(403).json({
        error: studentCtx.reason || 'Access denied: Only enrolled students can join this live class.',
        code: 'ENROLLMENT_REQUIRED',
      });
    }

    const now = Date.now();
    const effectiveStatus = computeEffectiveStatus(classData, now);
    if (effectiveStatus === 'cancelled') {
      return res.status(400).json({ error: 'This live class has been cancelled.' });
    }
    if (!studentCtx.isAdminBypass) {
      if (effectiveStatus === 'draft') {
        return res.status(403).json({ error: 'This live class is not published yet.' });
      }
      if (effectiveStatus === 'completed') {
        return res.status(400).json({ error: 'This live class has already ended.' });
      }
      const joinOpenAt =
        Number(classData.scheduledStartAt) - Number(classData.joinWindowMinutesBefore ?? 15) * 60_000;
      if (now < joinOpenAt) {
        return res.status(403).json({
          error: `Joining opens ${classData.joinWindowMinutesBefore ?? 15} minutes before class start.`,
          code: 'JOIN_WINDOW_NOT_OPEN',
        });
      }
    }

    const secSnap = await db.collection('liveClassSecrets').doc(classId).get();
    if (!secSnap.exists || !secSnap.data()?.zoomJoinUrl) {
      return res.status(404).json({ error: 'Meeting link is not available for this class yet.' });
    }
    const sec = secSnap.data()!;

    // Atomic capacity check & mark joined for students
    let finalCount = Number(classData.registeredCount || 0);
    const maxCap = Number(classData.maxCapacity || 80);

    if (!studentCtx.isAdminBypass) {
      const regDocId = sanitizeId(studentCtx.userId);
      const regRef = classRef.collection('registrations').doc(regDocId);

      try {
        finalCount = await db.runTransaction(async (tx) => {
          const freshClass = await tx.get(classRef);
          const cData = freshClass.data() as Record<string, any>;
          const currentCount = Number(cData.registeredCount || 0);
          const cap = Number(cData.maxCapacity || 80);

          const existingReg = await tx.get(regRef);
          if (existingReg.exists) {
            tx.update(regRef, { status: 'joined', joinedAt: now });
            return currentCount;
          }

          if (currentCount >= cap) {
            const capErr: any = new Error(`Class capacity reached (${cap}/${cap} students).`);
            capErr.code = 'CAPACITY_FULL';
            throw capErr;
          }

          const nextCount = currentCount + 1;
          tx.set(regRef, {
            id: regDocId,
            liveClassId: classId,
            userId: studentCtx.userId,
            studentName: studentCtx.studentName,
            studentEmail: studentCtx.studentEmail || '',
            activationCode: studentCtx.activationCode || '',
            courseId: classData.courseId,
            status: 'joined',
            registeredAt: now,
            joinedAt: now,
          });
          tx.update(classRef, { registeredCount: nextCount, updatedAt: now });
          return nextCount;
        });
      } catch (err: any) {
        if (err?.code === 'CAPACITY_FULL') {
          return res.status(409).json({ error: err.message, code: 'CAPACITY_FULL' });
        }
        throw err;
      }
    }

    res.json({
      success: true,
      liveClassId: classId,
      provider: normalizeProvider(classData.provider, 'zoom'),
      title: classData.title,
      courseTitle: classData.courseTitle,
      joinUrl: sec.zoomJoinUrl,
      startUrl: studentCtx.isAdminBypass ? sec.zoomStartUrl : undefined,
      meetingId: sec.zoomMeetingId,
      passcode: sec.zoomPasscode || '',
      scheduledStartAt: Number(classData.scheduledStartAt),
      durationMinutes: Number(classData.durationMinutes || 40),
      registeredCount: finalCount,
      maxCapacity: maxCap,
    });
    } catch (err: any) {
      console.error('[LiveClasses] Join error:', err);
      return handleRouteError(res, 'Failed to join live class.', err);
    }
  });

  // Automated Reminder Sweep (30m & 5m before class) for Vercel Cron / External Cron / Admin Trigger
  async function handleReminderSweep(req: Request, res: Response) {
    try {
      const db = requireDb(res, req);

      const cronSecret = process.env.CRON_SECRET?.trim();
      const providedSecret =
        String(req.headers['x-cron-secret'] || '').trim() ||
        (String(req.headers.authorization || '').startsWith('Bearer ')
          ? String(req.headers.authorization).slice(7).trim()
          : '');

      const adminCtx = await verifyAdminIdentity(req, db, resolveAuth());
      const cronAuthorized = Boolean(cronSecret && providedSecret && providedSecret === cronSecret);

      if (!cronAuthorized && !adminCtx) {
        return res.status(403).json({ error: 'Unauthorized reminder trigger.' });
      }

      const now = Date.now();
      const snap = await db.collection('liveClasses').where('status', '==', 'published').get();
      const messaging = resolveMessaging();
      const triggered: any[] = [];

      for (const docSnap of snap.docs) {
        const cls = docSnap.data() as Record<string, any>;
        const startAt = Number(cls.scheduledStartAt || 0);
        const minsUntilStart = (startAt - now) / 60_000;

        // 30-minute reminder window (20 to 35 minutes before start)
        if (cls.sendReminder30m !== false && !cls.reminder30mSent && minsUntilStart > 10 && minsUntilStart <= 35) {
          const res30 = await dispatchLiveClassNotifications({
            db,
            messaging,
            classData: { ...cls, id: docSnap.id },
            reminderType: '30m',
          });
          triggered.push({ classId: docSnap.id, reminder: '30m', ...res30 });
        }

        // 5-minute reminder window (0 to 10 minutes before start)
        if (cls.sendReminder5m !== false && !cls.reminder5mSent && minsUntilStart >= -1 && minsUntilStart <= 10) {
          const res5 = await dispatchLiveClassNotifications({
            db,
            messaging,
            classData: { ...cls, id: docSnap.id },
            reminderType: '5m',
          });
          triggered.push({ classId: docSnap.id, reminder: '5m', ...res5 });
        }
      }

      res.json({
        success: true,
        checked: snap.size,
        checkedCount: snap.size,
        triggered,
        results: triggered,
      });
    } catch (err: any) {
      console.error('[LiveClasses] Reminder sweep error:', err);
      return handleRouteError(res, 'Failed to process class reminders.', err);
    }
  }

  router.get('/cron/reminders', handleReminderSweep);
  router.post('/cron/reminders', handleReminderSweep);

  return router;
}
