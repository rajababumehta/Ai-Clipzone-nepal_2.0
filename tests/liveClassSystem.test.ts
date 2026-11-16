import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createLiveClassRouter } from '../server/liveClassRoutes.ts';
import {
  createZoomMeeting,
  resetZoomTokenCacheForTests,
  verifyZoomConnection,
  ZoomApiError,
} from '../server/zoomService.ts';
import {
  createGoogleMeetSpace,
  GoogleMeetApiError,
} from '../server/googleMeetService.ts';
import { resetRoomHubForTests } from '../server/liveRoomHub.ts';

// ============================================================================
// In-Memory Transactional Firestore Test Double matching Admin SDK API
// ============================================================================
function createInMemoryFirestore() {
  const store = new Map<string, Record<string, any>>();
  let autoIdSeq = 1;

  function clone<T>(val: T): T {
    return val === undefined ? val : JSON.parse(JSON.stringify(val));
  }

  function matchesPathPrefix(path: string, prefix: string): boolean {
    if (!path.startsWith(prefix + '/')) return false;
    const rest = path.slice(prefix.length + 1);
    return !rest.includes('/');
  }

  function makeDocSnapshot(path: string) {
    const data = store.get(path);
    const id = path.split('/').pop() || '';
    return {
      id,
      exists: data !== undefined,
      ref: makeDocRef(path),
      data: () => (data !== undefined ? clone(data) : undefined),
    };
  }

  function makeDocRef(path: string): any {
    const id = path.split('/').pop() || '';
    return {
      id,
      path,
      collection: (sub: string) => makeCollectionRef(`${path}/${sub}`),
      get: async () => makeDocSnapshot(path),
      set: async (data: Record<string, any>, opts?: { merge?: boolean }) => {
        if (opts?.merge && store.has(path)) {
          store.set(path, { ...store.get(path)!, ...clone(data) });
        } else {
          store.set(path, clone(data));
        }
      },
      update: async (data: Record<string, any>) => {
        if (!store.has(path)) throw new Error(`Document ${path} does not exist`);
        store.set(path, { ...store.get(path)!, ...clone(data) });
      },
      delete: async () => {
        store.delete(path);
      },
    };
  }

  function makeQuery(
    basePath: string,
    filters: Array<{ field: string; op: string; value: any }> = [],
    orderField?: { field: string; dir: 'asc' | 'desc' },
    limitCount?: number
  ): any {
    const run = async () => {
      let docs = Array.from(store.entries())
        .filter(([p]) => matchesPathPrefix(p, basePath))
        .map(([p, d]) => ({
          id: p.split('/').pop()!,
          ref: makeDocRef(p),
          exists: true,
          data: () => clone(d),
        }));

      for (const f of filters) {
        docs = docs.filter((docSnap) => {
          const val = docSnap.data()[f.field];
          if (f.op === '==') return val === f.value;
          if (f.op === 'array-contains') return Array.isArray(val) && val.includes(f.value);
          return true;
        });
      }

      if (orderField) {
        docs.sort((a, b) => {
          const av = a.data()[orderField.field] ?? 0;
          const bv = b.data()[orderField.field] ?? 0;
          return orderField.dir === 'desc' ? bv - av : av - bv;
        });
      }

      if (typeof limitCount === 'number') {
        docs = docs.slice(0, limitCount);
      }

      return {
        empty: docs.length === 0,
        size: docs.length,
        docs,
        forEach: (cb: (d: any) => void) => docs.forEach(cb),
      };
    };

    return {
      where: (field: string, op: string, value: any) =>
        makeQuery(basePath, [...filters, { field, op, value }], orderField, limitCount),
      orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') =>
        makeQuery(basePath, filters, { field, dir }, limitCount),
      limit: (n: number) => makeQuery(basePath, filters, orderField, n),
      get: run,
    };
  }

  function makeCollectionRef(basePath: string): any {
    const queryObj = makeQuery(basePath);
    return {
      ...queryObj,
      doc: (id?: string) => {
        const finalId = id || `auto_${autoIdSeq++}`;
        return makeDocRef(`${basePath}/${finalId}`);
      },
      add: async (data: Record<string, any>) => {
        const finalId = `auto_${autoIdSeq++}`;
        const ref = makeDocRef(`${basePath}/${finalId}`);
        await ref.set(data);
        return ref;
      },
    };
  }

  return {
    store,
    collection: (name: string) => makeCollectionRef(name),
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        get: async (docRef: any) => docRef.get(),
        set: (docRef: any, data: Record<string, any>, opts?: { merge?: boolean }) => {
          if (opts?.merge && store.has(docRef.path)) {
            store.set(docRef.path, { ...store.get(docRef.path)!, ...clone(data) });
          } else {
            store.set(docRef.path, clone(data));
          }
        },
        update: (docRef: any, data: Record<string, any>) => {
          if (!store.has(docRef.path)) throw new Error(`Missing doc ${docRef.path}`);
          store.set(docRef.path, { ...store.get(docRef.path)!, ...clone(data) });
        },
        delete: (docRef: any) => {
          store.delete(docRef.path);
        },
      };
      return fn(tx);
    },
  };
}

async function startTestApp(opts: {
  zoomShouldFail?: boolean;
}) {
  const db = createInMemoryFirestore();
  const sentMulticasts: Array<any> = [];
  let zoomCreateCalls = 0;

  // Seed admin session, sub-admin, courses, and enrolled vs non-enrolled activation keys
  await db.collection('system').doc('admin_session').set({ activeSessionId: 'admin-sess-1' });
  await db.collection('sub_admins').doc('SUB-AI100').set({
    code: 'SUB-AI100',
    name: 'Course AI SubAdmin',
    courseId: 'ai-masterclass',
    status: 'active',
    activeDeviceId: 'subdev-1',
  });
  await db.collection('sub_admins').doc('SUB-YT200').set({
    code: 'SUB-YT200',
    name: 'Course YT SubAdmin',
    courseId: 'youtube-blueprint',
    status: 'active',
    activeDeviceId: 'subdev-2',
  });
  await db.collection('courses').doc('ai-masterclass').set({ id: 'ai-masterclass', title: 'AI Master Class', hasLiveSessions: true });
  await db.collection('courses').doc('youtube-blueprint').set({ id: 'youtube-blueprint', title: 'YouTube Blueprint', hasLiveSessions: false });

  // Enrolled student for ai-masterclass (with FCM token)
  await db.collection('activation_keys').doc('ENROLLED1').set({
    code: 'ENROLLED1',
    status: 'used',
    duration: '1year',
    courseId: 'ai-masterclass',
    courseTitle: 'AI Master Class',
    studentName: 'Aarav Shrestha',
    claimedByEmail: 'aarav@example.com',
    claimedByUid: 'uid-aarav',
    activeDeviceId: 'dev-aarav',
    claimedAt: Date.now() - 86400_000,
    expiresAt: Date.now() + 30 * 86400_000,
  });

  // Enrolled student ONLY for youtube-blueprint (should NOT get ai-masterclass access/notifications)
  await db.collection('activation_keys').doc('OTHERCOURSE1').set({
    code: 'OTHERCOURSE1',
    status: 'used',
    duration: '1year',
    courseId: 'youtube-blueprint',
    courseTitle: 'YouTube Blueprint',
    studentName: 'Bina Gurung',
    claimedByEmail: 'bina@example.com',
    claimedByUid: 'uid-bina',
    activeDeviceId: 'dev-bina',
    claimedAt: Date.now() - 86400_000,
    expiresAt: Date.now() + 30 * 86400_000,
  });

  const mockMessaging: any = {
    sendEachForMulticast: async (message: any) => {
      sentMulticasts.push(message);
      return {
        successCount: message.tokens.length,
        failureCount: 0,
        responses: message.tokens.map(() => ({ success: true })),
      };
    },
  };

  const state = { zoomShouldFail: Boolean(opts.zoomShouldFail) };

  const zoomApi: any = {
    isConfigured: () => true,
    createMeeting: async (input: any) => {
      zoomCreateCalls++;
      if (state.zoomShouldFail) {
        throw new ZoomApiError('Simulated Zoom rate limit / OAuth failure', 502, 'ZOOM_CREATE_FAILED');
      }
      const id = String(9000000000 + zoomCreateCalls);
      return {
        meetingId: id,
        joinUrl: `https://zoom.us/j/${id}?pwd=SecretPass${zoomCreateCalls}`,
        startUrl: `https://zoom.us/s/${id}?zak=HostToken${zoomCreateCalls}`,
        password: `SecretPass${zoomCreateCalls}`,
        startTimeIso: new Date(input.startTimeMs).toISOString(),
        durationMinutes: input.durationMinutes || 40,
      };
    },
    updateMeeting: async () => {},
    deleteMeeting: async () => {},
  };

  const app = express();
  app.use(express.json());
  app.use(
    '/api/live-classes',
    createLiveClassRouter({
      getDb: () => db as any,
      getAuth: () => null,
      getMessaging: () => mockMessaging,
      zoomApi,
      createGoogleMeetSpace: async (token: string) => {
        if (!token || token === 'expired-token') {
          throw new GoogleMeetApiError('Re-auth required', 401, 'GOOGLE_MEET_REAUTH');
        }
        return {
          spaceName: 'spaces/abc-defg-hij',
          meetingUri: 'https://meet.google.com/abc-defg-hij',
          meetingCode: 'abc-defg-hij',
        };
      },
    })
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}/api/live-classes`;

  return {
    baseUrl,
    db,
    sentMulticasts,
    getZoomCreateCalls: () => zoomCreateCalls,
    setZoomShouldFail: (v: boolean) => {
      state.zoomShouldFail = v;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function reqJson(baseUrl: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const ADMIN_HEADERS = {
  'x-admin-session-id': 'admin-sess-1',
};

const ENROLLED_HEADERS = {
  'x-activation-codes': 'ENROLLED1',
  'x-device-id': 'dev-aarav',
  'x-student-uid': 'uid-aarav',
};

const OTHER_COURSE_HEADERS = {
  'x-activation-codes': 'OTHERCOURSE1',
  'x-device-id': 'dev-bina',
  'x-student-uid': 'uid-bina',
};

// ============================================================================
// Tests
// ============================================================================

test('Zoom Service: S2S OAuth enforces waiting_room=true, 40m default & token caching', async () => {
  process.env.ZOOM_ACCOUNT_ID = 'acc_test';
  process.env.ZOOM_CLIENT_ID = 'client_test';
  process.env.ZOOM_CLIENT_SECRET = 'secret_test';
  resetZoomTokenCacheForTests();

  const calls: Array<{ url: string; body?: any }> = [];
  const fakeFetch: any = async (url: string, init: any) => {
    const body = init?.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    if (url.includes('zoom.us/oauth/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'zoom_access_123', expires_in: 3600 }),
      };
    }
    return {
      ok: true,
      status: 201,
      json: async () => ({
        id: 8877665544,
        join_url: 'https://zoom.us/j/8877665544',
        start_url: 'https://zoom.us/s/8877665544',
        password: body.password,
        duration: body.duration,
      }),
    };
  };

  const result = await createZoomMeeting(
    { topic: 'Test AI Live Session', startTimeMs: Date.now() + 3600_000 },
    fakeFetch
  );

  assert.equal(result.meetingId, '8877665544');
  assert.equal(result.durationMinutes, 40);
  const createCall = calls.find((c) => c.url.includes('/meetings'));
  assert.ok(createCall);
  assert.equal(createCall!.body.settings.waiting_room, true);
  assert.equal(createCall!.body.settings.join_before_host, false);
  assert.equal(createCall!.body.settings.mute_upon_entry, true);
  assert.equal(createCall!.body.duration, 40);
});

test('Scenarios 1-6: Admin create, auto Zoom, idempotent retry, publish + enrolled-only FCM + secret isolation', async () => {
  const ctx = await startTestApp({ zoomShouldFail: false });
  try {
    // Register FCM tokens for enrolled student & other-course student
    await reqJson(ctx.baseUrl, '/fcm-token', {
      method: 'POST',
      headers: ENROLLED_HEADERS,
      body: JSON.stringify({ token: 'fcm_token_aarav_valid_1234567890', platform: 'pwa-standalone', isPwa: true }),
    });
    await reqJson(ctx.baseUrl, '/fcm-token', {
      method: 'POST',
      headers: OTHER_COURSE_HEADERS,
      body: JSON.stringify({ token: 'fcm_token_bina_valid_1234567890', platform: 'web' }),
    });

    const startTime = Date.now() + 5 * 60_000; // Starting in 5 minutes (inside 15m join window!)
    // Scenario 1 & 2: Admin creates live class -> Zoom meeting created automatically
    const createRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'AI Video Production Live Q&A',
        description: 'Hands-on AI prompting workflow',
        scheduledStartAt: startTime,
        idempotencyKey: 'idem-key-001',
      }),
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.data.liveClass.zoomCreated, true);
    assert.equal(createRes.data.liveClass.durationMinutes, 40);
    assert.equal(createRes.data.liveClass.maxCapacity, 80);
    assert.equal(createRes.data.liveClass.status, 'draft');
    const classId = createRes.data.liveClass.id;

    // Scenario 3a: Retry with same idempotencyKey MUST NOT create duplicate Zoom meeting
    const retryCreate = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'AI Video Production Live Q&A',
        scheduledStartAt: startTime,
        idempotencyKey: 'idem-key-001',
      }),
    });
    assert.equal(retryCreate.status, 200);
    assert.equal(retryCreate.data.deduplicated, true);
    assert.equal(ctx.getZoomCreateCalls(), 1);

    // Scenario 3b & 4 & 6: Publish class -> notifies ONLY enrolled students + sets PWA deep link URL
    const pubRes = await reqJson(ctx.baseUrl, `/${classId}/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(pubRes.status, 200);
    assert.equal(pubRes.data.status, 'published');
    assert.equal(ctx.sentMulticasts.length, 1);
    assert.deepEqual(ctx.sentMulticasts[0].tokens, ['fcm_token_aarav_valid_1234567890']);
    assert.equal(ctx.sentMulticasts[0].data.url, `/?tab=live&classId=${classId}`);

    // Scenario 5a: Student list NEVER exposes Zoom secrets (password, joinUrl, startUrl)
    const studentList = await reqJson(ctx.baseUrl, '/', { headers: OTHER_COURSE_HEADERS });
    assert.equal(studentList.status, 200);
    assert.equal(studentList.data.classes.length, 1);
    assert.equal(studentList.data.classes[0].zoomPasscode, undefined);
    assert.equal(studentList.data.classes[0].zoomJoinUrl, undefined);
    assert.equal(studentList.data.classes[0].zoomStartUrl, undefined);

    // Scenario 5b: Non-enrolled student is blocked (403) from registering or joining
    const blockedReg = await reqJson(ctx.baseUrl, `/${classId}/register`, {
      method: 'POST',
      headers: OTHER_COURSE_HEADERS,
    });
    assert.equal(blockedReg.status, 403);

    const blockedJoin = await reqJson(ctx.baseUrl, `/${classId}/join`, {
      method: 'POST',
      headers: OTHER_COURSE_HEADERS,
    });
    assert.equal(blockedJoin.status, 403);
    assert.equal(blockedJoin.data.joinUrl, undefined);

    // Enrolled student joins cleanly & receives verified Zoom link & passcode
    const joinRes = await reqJson(ctx.baseUrl, `/${classId}/join`, {
      method: 'POST',
      headers: ENROLLED_HEADERS,
    });
    assert.equal(joinRes.status, 200);
    assert.ok(joinRes.data.joinUrl.includes('zoom.us/j/'));
    assert.ok(joinRes.data.passcode);
    assert.equal(joinRes.data.registeredCount, 1);
  } finally {
    await ctx.close();
  }
});

test('Scenario 7: Capacity strictly enforced at 80 via atomic transaction & duplicates prevented', async () => {
  const ctx = await startTestApp({ zoomShouldFail: false });
  try {
    // Seed 81 valid enrolled students for ai-masterclass
    for (let i = 1; i <= 81; i++) {
      await ctx.db.collection('activation_keys').doc(`BULK_${i}`).set({
        code: `BULK_${i}`,
        status: 'used',
        duration: '1year',
        courseId: 'ai-masterclass',
        studentName: `Student ${i}`,
        claimedByUid: `uid-bulk-${i}`,
        activeDeviceId: `dev-bulk-${i}`,
        claimedAt: Date.now() - 1000,
        expiresAt: Date.now() + 86400_000,
      });
    }

    const createRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Capacity 80 Stress Session',
        scheduledStartAt: Date.now() + 60 * 60_000,
        publishImmediately: true,
      }),
    });
    assert.equal(createRes.status, 201);
    const classId = createRes.data.liveClass.id;
    assert.equal(createRes.data.liveClass.maxCapacity, 80);

    // Register students 1..80
    for (let i = 1; i <= 80; i++) {
      const reg = await reqJson(ctx.baseUrl, `/${classId}/register`, {
        method: 'POST',
        headers: {
          'x-activation-codes': `BULK_${i}`,
          'x-device-id': `dev-bulk-${i}`,
          'x-student-uid': `uid-bulk-${i}`,
        },
      });
      assert.equal(reg.status, 200);
    }

    // Re-registering student #1 should succeed idempotently without exceeding 80
    const dupReg = await reqJson(ctx.baseUrl, `/${classId}/register`, {
      method: 'POST',
      headers: {
        'x-activation-codes': 'BULK_1',
        'x-device-id': 'dev-bulk-1',
        'x-student-uid': 'uid-bulk-1',
      },
    });
    assert.equal(dupReg.status, 200);
    assert.equal(dupReg.data.alreadyRegistered, true);
    assert.equal(dupReg.data.registeredCount, 80);

    // 81st student MUST be rejected with 409 CAPACITY_FULL
    const overflowReg = await reqJson(ctx.baseUrl, `/${classId}/register`, {
      method: 'POST',
      headers: {
        'x-activation-codes': 'BULK_81',
        'x-device-id': 'dev-bulk-81',
        'x-student-uid': 'uid-bulk-81',
      },
    });
    assert.equal(overflowReg.status, 409);
    assert.equal(overflowReg.data.code, 'CAPACITY_FULL');
  } finally {
    await ctx.close();
  }
});

test('Scenario 8 & 10: Duplicate notifications prevented & automated 30m/5m reminders + Sub-Admin course scope', async () => {
  const ctx = await startTestApp({ zoomShouldFail: false });
  try {
    // Sub-Admin for ai-masterclass tries creating a class for youtube-blueprint -> 403 Forbidden
    const crossCourseRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: {
        'x-subadmin-code': 'SUB-AI100',
        'x-device-id': 'subdev-1',
      },
      body: JSON.stringify({
        courseId: 'youtube-blueprint',
        title: 'Unauthorized Cross-Course Class',
        scheduledStartAt: Date.now() + 25 * 60_000,
      }),
    });
    assert.equal(crossCourseRes.status, 403);

    // Sub-Admin for youtube-blueprint (where Main Admin did NOT enable hasLiveSessions) -> 403 Forbidden
    const disabledLiveRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: {
        'x-subadmin-code': 'SUB-YT200',
        'x-device-id': 'subdev-2',
      },
      body: JSON.stringify({
        courseId: 'youtube-blueprint',
        title: 'Unauthorized Live On Non-Live Course',
        scheduledStartAt: Date.now() + 25 * 60_000,
      }),
    });
    assert.equal(disabledLiveRes.status, 403);
    assert.equal(disabledLiveRes.data.code, 'LIVE_NOT_ENABLED_BY_ADMIN');

    // Admin creates & publishes class starting in 28 minutes (inside 30m reminder window)
    const createRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Prompt Engineering Live',
        scheduledStartAt: Date.now() + 28 * 60_000,
        publishImmediately: true,
      }),
    });
    assert.equal(createRes.status, 201);
    const classId = createRes.data.liveClass.id;

    // Repeated publish call must skip duplicate notification
    const dupPub = await reqJson(ctx.baseUrl, `/${classId}/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(dupPub.status, 200);
    assert.equal(dupPub.data.notificationResult.skippedDuplicate, true);

    // Run cron reminders twice -> 30m reminder fires ONCE, second run skips duplicate
    const cron1 = await reqJson(ctx.baseUrl, '/cron/reminders', {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(cron1.status, 200);
    assert.equal(cron1.data.triggered.length, 1);
    assert.equal(cron1.data.triggered[0].reminder, '30m');
    assert.equal(cron1.data.triggered[0].skippedDuplicate, false);

    const cron2 = await reqJson(ctx.baseUrl, '/cron/reminders', {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(cron2.status, 200);
    assert.equal(cron2.data.triggered.length, 0);
  } finally {
    await ctx.close();
  }
});

test('Scenario 9: Zoom API failure handled gracefully & recovered via retry-zoom', async () => {
  const ctx = await startTestApp({ zoomShouldFail: true });
  try {
    // Draft creation succeeds safely with zoomCreated=false and clear zoomWarning when Zoom is down
    const draftRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Resilient Live Class',
        scheduledStartAt: Date.now() + 60 * 60_000,
        publishNow: false,
      }),
    });
    assert.equal(draftRes.status, 201);
    assert.equal(draftRes.data.liveClass.zoomCreated, false);
    assert.equal(draftRes.data.liveClass.zoomMeetingStatus, 'failed');
    const classId = draftRes.data.liveClass.id;

    // Publishing before Zoom exists is blocked cleanly
    const earlyPub = await reqJson(ctx.baseUrl, `/${classId}/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(earlyPub.status, 400);

    // Zoom recovers -> Admin calls retry-zoom
    ctx.setZoomShouldFail(false);
    const retryRes = await reqJson(ctx.baseUrl, `/${classId}/retry-zoom`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(retryRes.status, 200);
    assert.ok(retryRes.data.zoomMeetingId);

    // Calling retry-zoom again returns deduplicated existing Zoom meeting
    const retryRes2 = await reqJson(ctx.baseUrl, `/${classId}/retry-zoom`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    });
    assert.equal(retryRes2.status, 200);
    assert.equal(retryRes2.data.deduplicated, true);
  } finally {
    await ctx.close();
  }
});

test('Zoom Service: Translates disabled Zoom Marketplace app into ZOOM_APP_DISABLED', async () => {
  process.env.ZOOM_ACCOUNT_ID = 'acct_test';
  process.env.ZOOM_CLIENT_ID = 'client_test';
  process.env.ZOOM_CLIENT_SECRET = 'secret_test';
  resetZoomTokenCacheForTests();

  const mockDisabledFetch = (async () =>
    new Response(
      JSON.stringify({
        reason: 'The app has been disabled by the developer',
        error: 'invalid_client',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )) as unknown as typeof fetch;

  await assert.rejects(
    () => verifyZoomConnection(mockDisabledFetch),
    (err: unknown) => {
      assert.ok(err instanceof ZoomApiError);
      assert.equal(err.code, 'ZOOM_APP_DISABLED');
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /marketplace\.zoom\.us/i);
      return true;
    }
  );
});

test('Google Meet Service: creates space and maps 401/missing token to GOOGLE_MEET_REAUTH', async () => {
  await assert.rejects(
    () => createGoogleMeetSpace(''),
    (err: unknown) => {
      assert.ok(err instanceof GoogleMeetApiError);
      assert.equal(err.code, 'GOOGLE_MEET_REAUTH');
      assert.equal(err.statusCode, 401);
      return true;
    }
  );

  const mockOkFetch = (async () =>
    new Response(
      JSON.stringify({
        name: 'spaces/xyz-1234',
        meetingUri: 'https://meet.google.com/xyz-abcd-efg',
        meetingCode: 'xyz-abcd-efg',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as unknown as typeof fetch;

  const okSpace = await createGoogleMeetSpace('valid-meet-oauth-token', mockOkFetch);
  assert.equal(okSpace.spaceName, 'spaces/xyz-1234');
  assert.equal(okSpace.meetingUri, 'https://meet.google.com/xyz-abcd-efg');
  assert.equal(okSpace.meetingCode, 'xyz-abcd-efg');

  const mock401Fetch = (async () =>
    new Response(JSON.stringify({ error: { message: 'Invalid Credentials' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;

  await assert.rejects(
    () => createGoogleMeetSpace('expired-token', mock401Fetch),
    (err: unknown) => {
      assert.ok(err instanceof GoogleMeetApiError);
      assert.equal(err.code, 'GOOGLE_MEET_REAUTH');
      assert.equal(err.statusCode, 401);
      return true;
    }
  );
});

test('Multi-provider: Google Meet Auto & Manual Link work without Zoom credentials', async () => {
  const ctx = await startTestApp({ zoomShouldFail: true });
  try {
    // 1. Google Meet without token -> 401 GOOGLE_MEET_REAUTH
    const noTokenRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Google Meet Workshop',
        provider: 'google_meet',
        scheduledStartAt: Date.now() + 5 * 60_000,
        publishImmediately: true,
      }),
    });
    assert.equal(noTokenRes.status, 401);
    assert.equal(noTokenRes.data.code, 'GOOGLE_MEET_REAUTH');

    // 2. Google Meet with valid token -> creates & publishes immediately
    const meetRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: {
        ...ADMIN_HEADERS,
        'x-google-meet-token': 'Bearer valid-google-token-xyz',
      },
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Google Meet Live Workshop',
        provider: 'google_meet',
        scheduledStartAt: Date.now() + 5 * 60_000,
        publishImmediately: true,
      }),
    });
    assert.equal(meetRes.status, 201);
    assert.equal(meetRes.data.liveClass.provider, 'google_meet');
    assert.equal(meetRes.data.liveClass.status, 'published');
    assert.equal(meetRes.data.liveClass.zoomMeetingId, 'abc-defg-hij');
    assert.equal(ctx.getZoomCreateCalls(), 0);

    // Enrolled student joins Google Meet
    const meetJoin = await reqJson(ctx.baseUrl, `/${meetRes.data.liveClass.id}/join`, {
      method: 'POST',
      headers: ENROLLED_HEADERS,
    });
    assert.equal(meetJoin.status, 200);
    assert.equal(meetJoin.data.provider, 'google_meet');
    assert.equal(meetJoin.data.joinUrl, 'https://meet.google.com/abc-defg-hij');

    // 3. Manual link provider -> works with zero external OAuth calls
    const manualRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Manual Link Q&A',
        provider: 'manual',
        manualMeetingUrl: 'https://meet.google.com/man-ual-lnk',
        manualMeetingId: 'man-ual-lnk',
        scheduledStartAt: Date.now() + 5 * 60_000,
        publishImmediately: true,
      }),
    });
    assert.equal(manualRes.status, 201);
    assert.equal(manualRes.data.liveClass.provider, 'manual');
    assert.equal(manualRes.data.liveClass.status, 'published');

    const manualJoin = await reqJson(ctx.baseUrl, `/${manualRes.data.liveClass.id}/join`, {
      method: 'POST',
      headers: ENROLLED_HEADERS,
    });
    assert.equal(manualJoin.status, 200);
    assert.equal(manualJoin.data.provider, 'manual');
    assert.equal(manualJoin.data.joinUrl, 'https://meet.google.com/man-ual-lnk');
  } finally {
    await ctx.close();
  }
});

test('Zero-Login Built-in Live Classroom: Sub-Admin creates, Student & Mentor join without Google login, role-enforced room endpoints', async () => {
  resetRoomHubForTests();
  const ctx = await startTestApp({ zoomShouldFail: true });
  try {
    // 1. Sub-Admin creates builtin live class with ZERO Google OAuth token & Zoom disabled
    const createRes = await reqJson(ctx.baseUrl, '/', {
      method: 'POST',
      headers: {
        'x-subadmin-code': 'SUB-AI100',
        'x-device-id': 'subdev-1',
      },
      body: JSON.stringify({
        courseId: 'ai-masterclass',
        title: 'Zero-Login Live Prompting Workshop',
        provider: 'builtin',
        scheduledStartAt: Date.now() + 2 * 60_000,
        publishImmediately: true,
      }),
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.data.liveClass.provider, 'builtin');
    assert.equal(createRes.data.liveClass.status, 'published');
    assert.equal(createRes.data.liveClass.zoomCreated, true);
    assert.ok(String(createRes.data.liveClass.zoomMeetingId).startsWith('ROOM-'));
    assert.equal(ctx.getZoomCreateCalls(), 0);
    const classId = createRes.data.liveClass.id;

    // 2. Enrolled student joins using only course activation key (zero Google login)
    const studentJoin = await reqJson(ctx.baseUrl, `/${classId}/join`, {
      method: 'POST',
      headers: ENROLLED_HEADERS,
    });
    assert.equal(studentJoin.status, 200);
    assert.equal(studentJoin.data.provider, 'builtin');
    assert.equal(studentJoin.data.participantRole, 'student');
    assert.equal(studentJoin.data.participantName, 'Aarav Shrestha');
    assert.ok(studentJoin.data.roomToken);
    const studentToken = studentJoin.data.roomToken;

    // 3. Sub-Admin mentor joins the same room with mentor role (zero Google login)
    const mentorJoin = await reqJson(ctx.baseUrl, `/${classId}/join`, {
      method: 'POST',
      headers: {
        'x-subadmin-code': 'SUB-AI100',
        'x-device-id': 'subdev-1',
      },
      body: JSON.stringify({ displayName: 'Mentor Bikash' }),
    });
    assert.equal(mentorJoin.status, 200);
    assert.equal(mentorJoin.data.participantRole, 'mentor');
    assert.equal(mentorJoin.data.participantName, 'Mentor Bikash');
    assert.ok(mentorJoin.data.roomToken);
    const mentorToken = mentorJoin.data.roomToken;

    // 4. Invalid roomToken is rejected (401) across room endpoints
    const badChat = await reqJson(ctx.baseUrl, `/${classId}/room/chat`, {
      method: 'POST',
      body: JSON.stringify({ roomToken: 'invalid.token', peerId: 'p1', text: 'hello' }),
    });
    assert.equal(badChat.status, 401);

    const badMedia = await reqJson(ctx.baseUrl, `/${classId}/room/media`, {
      method: 'POST',
      body: JSON.stringify({ roomToken: 'invalid.token', peerId: 'p1', handRaised: true }),
    });
    assert.equal(badMedia.status, 401);

    const badSseRes = await fetch(`${ctx.baseUrl}/${classId}/room/events?roomToken=invalid.token&peerId=p1`);
    assert.equal(badSseRes.status, 401);

    // 5. Student can post chat & raise hand, but CANNOT end the class (403)
    const okChat = await reqJson(ctx.baseUrl, `/${classId}/room/chat`, {
      method: 'POST',
      body: JSON.stringify({ roomToken: studentToken, peerId: 'student-p1', text: 'Namaste Sir!' }),
    });
    assert.equal(okChat.status, 200);
    assert.equal(okChat.data.message.text, 'Namaste Sir!');
    assert.equal(okChat.data.message.role, 'student');

    const okMedia = await reqJson(ctx.baseUrl, `/${classId}/room/media`, {
      method: 'POST',
      body: JSON.stringify({ roomToken: studentToken, peerId: 'student-p1', handRaised: true }),
    });
    assert.equal(okMedia.status, 200);

    const studentEnd = await reqJson(ctx.baseUrl, `/${classId}/room/end`, {
      method: 'POST',
      body: JSON.stringify({ roomToken: studentToken }),
    });
    assert.equal(studentEnd.status, 403);

    // 6. Mentor ends the live session cleanly (200) & DB marks class completed
    const mentorEnd = await reqJson(ctx.baseUrl, `/${classId}/room/end`, {
      method: 'POST',
      body: JSON.stringify({ roomToken: mentorToken }),
    });
    assert.equal(mentorEnd.status, 200);
    assert.equal(mentorEnd.data.ended, true);
    const updatedSnap = await ctx.db.collection('liveClasses').doc(classId).get();
    assert.equal(updatedSnap.data().status, 'completed');
  } finally {
    resetRoomHubForTests();
    await ctx.close();
  }
});
