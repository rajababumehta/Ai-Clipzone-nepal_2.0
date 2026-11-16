import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

const DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID ||
  'ai-studio-aiclipzonenepal-13e41d9c-1db8-4842-a387-8c950c1f5b2a';

const db = getFirestore(DATABASE_ID);
const messaging = getMessaging();

function formatClassDateTime(ms: number): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kathmandu',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(ms)) + ' NPT'
    );
  } catch {
    return new Date(ms).toISOString();
  }
}

async function dispatchReminder(
  classData: Record<string, any>,
  reminderType: '30m' | '5m'
): Promise<{ sent: boolean; skippedDuplicate: boolean; deliveredCount: number }> {
  const classId = String(classData.id);
  const deliveryKey = `${classId}__${reminderType}`;
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
    return { sent: false, skippedDuplicate: true, deliveredCount: 0 };
  }

  const whenStr = formatClassDateTime(Number(classData.scheduledStartAt));
  const title =
    reminderType === '30m'
      ? `⏰ Starts in 30 Mins: ${classData.title}`
      : `🚨 Starting in 5 Mins: ${classData.title}`;
  const body =
    reminderType === '30m'
      ? `Get ready! "${classData.courseTitle}" Zoom session begins at ${whenStr}.`
      : `Join now! "${classData.courseTitle}" live Zoom class starts in 5 minutes.`;
  const badge = reminderType === '30m' ? '30M REMINDER' : '5M REMINDER';
  const url = `/?tab=live&classId=${encodeURIComponent(classId)}`;

  await db.collection('notifications').add({
    title,
    body,
    type: 'live_reminder',
    badge,
    url,
    createdAt: Date.now(),
    author: 'AI Clipzone Live',
    target: 'course_enrolled',
    courseId: classData.courseId,
    courseTitle: classData.courseTitle,
    liveClassId: classId,
    deliveryKey,
    reminderType,
  });

  const tokenSnap = await db.collection('fcmTokens').get();
  const tokens: string[] = [];
  tokenSnap.forEach((docSnap) => {
    const d = docSnap.data();
    const enrolled: string[] = Array.isArray(d.enrolledCourseIds) ? d.enrolledCourseIds : [];
    if (
      d.token &&
      (enrolled.includes(classData.courseId) || enrolled.includes('all') || enrolled.includes('course-all'))
    ) {
      tokens.push(String(d.token));
    }
  });

  let deliveredCount = 0;
  if (tokens.length > 0) {
    const unique = Array.from(new Set(tokens));
    for (let i = 0; i < unique.length; i += 500) {
      const batch = unique.slice(i, i + 500);
      const res = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: {
          title,
          body,
          url,
          liveClassId: classId,
          courseId: String(classData.courseId),
          deliveryKey,
          reminderType,
        },
        webpush: {
          fcmOptions: { link: url },
        },
      });
      deliveredCount += res.successCount;
    }
  }

  await db
    .collection('liveClasses')
    .doc(classId)
    .set(
      reminderType === '30m'
        ? { reminder30mSent: true, updatedAt: Date.now() }
        : { reminder5mSent: true, updatedAt: Date.now() },
      { merge: true }
    );

  return { sent: true, skippedDuplicate: false, deliveredCount };
}

async function runReminderScan() {
  const now = Date.now();
  const snap = await db.collection('liveClasses').where('status', '==', 'published').get();
  const results: any[] = [];

  for (const docSnap of snap.docs) {
    const cls = { ...docSnap.data(), id: docSnap.id } as Record<string, any>;
    const msUntilStart = Number(cls.scheduledStartAt) - now;

    if (cls.sendReminder30m !== false && !cls.reminder30mSent && msUntilStart <= 35 * 60_000 && msUntilStart > 10 * 60_000) {
      const res = await dispatchReminder(cls, '30m');
      results.push({ id: cls.id, type: '30m', ...res });
    }

    if (cls.sendReminder5m !== false && !cls.reminder5mSent && msUntilStart <= 10 * 60_000 && msUntilStart > -5 * 60_000) {
      const res = await dispatchReminder(cls, '5m');
      results.push({ id: cls.id, type: '5m', ...res });
    }
  }

  return results;
}

// Automated 5-minute Cloud Scheduler trigger (Requires Firebase Blaze plan)
export const sendLiveClassReminders = onSchedule('every 5 minutes', async () => {
  const results = await runReminderScan();
  console.log('[sendLiveClassReminders] Completed scan:', JSON.stringify(results));
});

// Optional HTTP trigger protected by CRON_SECRET
export const triggerLiveClassRemindersHttp = onRequest(async (req, res) => {
  const expected = process.env.CRON_SECRET || '';
  const auth = req.headers.authorization || '';
  if (expected && auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const results = await runReminderScan();
  res.json({ success: true, checkedAt: Date.now(), results });
});
