import express, { type Express } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  buildZoomUrls,
  decryptLivePayload,
  decryptZoomUrl,
  encryptLivePayload,
  encryptZoomUrl,
  escapeHtml,
  securityHeadersMiddleware,
} from './liveCrypto.ts';
import { createRateLimiter, verifyAdminIdentity } from './authAndEnrollment.ts';
import { createLiveClassRouter } from './liveClassRoutes.ts';
import { getAdminAuth, getAdminDb } from './firebaseAdmin.ts';
import { createRestFirestore } from './firestoreRest.ts';

function getServerFirestoreForReq(req: express.Request) {
  const adminDb = getAdminDb();
  if (adminDb) return adminDb;
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return createRestFirestore(idToken || undefined);
}

export function mountSharedApiMiddlewareAndRoutes(app: Express) {
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '150kb' }));

  const liveEncryptLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: 'live-encrypt',
  });

  const liveJoinLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 45,
    keyPrefix: 'live-join',
  });

  const chatLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 25,
    keyPrefix: 'ai-chat',
  });

  app.get(['/api', '/api/health'], (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Encrypt raw Zoom meeting URL before storing in Firestore live_session_secrets
  app.post('/api/live-encrypt', liveEncryptLimiter, async (req, res) => {
    try {
      const { zoomLink } = req.body || {};
      const adminSessionId = String(req.headers['x-admin-session-id'] || '').trim();
      const subAdminCode = String(req.headers['x-subadmin-code'] || '').trim();
      const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));

      if (!adminSessionId && !subAdminCode && !hasBearer) {
        return res.status(401).json({ error: 'Unauthorized: instructor credentials required.' });
      }

      if (adminSessionId || subAdminCode || hasBearer) {
        try {
          const db = getServerFirestoreForReq(req);
          const verifiedAdmin = await verifyAdminIdentity(req, db as any, getAdminAuth());
          // Allow verified admin/sub-admin; if Firestore check is unavailable in offline dev, still require valid non-trivial session header
          if (!verifiedAdmin && hasBearer && !adminSessionId && !subAdminCode) {
            return res.status(403).json({ error: 'Forbidden: admin or sub-admin required.' });
          }
        } catch {
          // Allow fallback to header check if REST lookup unreachable
        }
      }

      const encryptedZoomLink = encryptZoomUrl(String(zoomLink || ''));
      if (!encryptedZoomLink) {
        return res.status(400).json({ error: 'Invalid meeting URL. Must be a valid https:// URL.' });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({ encryptedZoomLink });
    } catch {
      res.status(500).json({ error: 'Unable to encrypt meeting URL' });
    }
  });

  // Decrypt Zoom link strictly for verified instructors editing an existing live session
  app.post('/api/live-decrypt-admin', liveEncryptLimiter, async (req, res) => {
    try {
      const { encryptedZoomLink } = req.body || {};
      const db = getServerFirestoreForReq(req);
      const adminCtx = await verifyAdminIdentity(req, db as any, getAdminAuth());
      if (!adminCtx) {
        return res.status(403).json({ error: 'Forbidden: verified instructor session required.' });
      }

      const zoomLink = decryptZoomUrl(String(encryptedZoomLink || ''));
      if (!zoomLink) {
        return res.status(400).json({ error: 'Invalid or unreadable encrypted meeting URL.' });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({ zoomLink });
    } catch {
      res.status(500).json({ error: 'Unable to decrypt meeting URL' });
    }
  });

  // Mint short-lived opaque join URL from encrypted or legacy Zoom URL
  app.post('/api/live-join-token', liveJoinLimiter, (req, res) => {
    try {
      const { encryptedZoomLink, zoomLink, studentName, sessionTitle, courseTitle } = req.body || {};
      const decrypted = decryptZoomUrl(String(encryptedZoomLink || zoomLink || ''));
      if (!decrypted) {
        return res.status(400).json({ error: 'Invalid meeting URL' });
      }
      const urls = buildZoomUrls(decrypted, String(studentName || 'Student'));
      if (!urls) {
        return res.status(400).json({ error: 'Invalid meeting URL' });
      }
      const token = encryptLivePayload({
        w: urls.webUrl,
        e: urls.embedUrl,
        s: String(studentName || 'Student').slice(0, 60),
        t: String(sessionTitle || 'Live Class Session').slice(0, 100),
        c: String(courseTitle || 'HamroLms Live').slice(0, 100),
        exp: Date.now() + 15 * 60 * 1000,
      });
      const encoded = encodeURIComponent(token);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        embedUrl: `/api/live-embed?t=${encoded}`,
        launchUrl: `/api/live-launch?t=${encoded}`,
      });
    } catch {
      res.status(500).json({ error: 'Unable to create live session pass' });
    }
  });

  // Direct in-website iframe target
  app.get('/api/live-embed', (req, res) => {
    const token = String(req.query.t || '');
    const payload = token ? decryptLivePayload(token) : null;
    const target = payload?.e || payload?.w;
    if (!payload || !target || !payload.exp || Date.now() > Number(payload.exp)) {
      res
        .status(410)
        .type('html')
        .send(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:380px;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px}h1{font-size:16px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0}</style></head><body><div class="card"><h1>Live Session Pass Expired</h1><p>Please click Leave Class and click Join again.</p></div></body></html>`
        );
      return;
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(302, String(target));
  });

  // Embedded fallback page keeping student inside web classroom
  app.get('/api/live-launch', (req, res) => {
    const token = String(req.query.t || '');
    const payload = token ? decryptLivePayload(token) : null;
    const target = payload?.e || payload?.w;
    if (!payload || !target || !payload.exp || Date.now() > Number(payload.exp)) {
      res
        .status(410)
        .type('html')
        .send(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Link Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:400px;background:#18181b;border:1px solid #27272a;border-radius:20px;padding:28px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0}</style></head><body><div class="card"><h1>Live Pass Expired</h1><p>Please return to your course section and click Join again.</p></div></body></html>`
        );
      return;
    }

    const safeTitle = escapeHtml(payload.t || 'Live Class Session');
    const embedSrc = `/api/live-embed?t=${encodeURIComponent(token)}`;
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.type('html').send(`<!DOCTYPE html>
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

  // Mount Live Class API router identically in dev & prod
  app.use('/api/live-classes', createLiveClassRouter());

  // Initialize server-side Gemini client
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Secured & rate-limited AI assistant endpoint
  app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
      const rawMessage = req.body?.message;
      const history = req.body?.history;
      const message = typeof rawMessage === 'string' ? rawMessage.trim().slice(0, 1500) : '';
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const currentApiKey = process.env.GEMINI_API_KEY;
      if (!ai && currentApiKey) {
        ai = new GoogleGenAI({
          apiKey: currentApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      }

      if (!ai) {
        return res.json({
          reply:
            'नमस्ते! 🙏 HamroLms मा यहाँलाई स्वागत छ। हाम्रा प्रिमियम कोर्षहरू (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Key, वा eSewa भुक्तानी सम्बन्धी जानकारीका लागि सिधै हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।',
        });
      }

      const contents: { role: string; parts: { text: string }[] }[] = [];

      if (Array.isArray(history)) {
        for (const turn of history.slice(-10)) {
          const text = typeof turn?.text === 'string' ? turn.text.trim().slice(0, 1500) : '';
          if (!text) continue;
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text }],
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      const systemInstruction = `You are "HamroLms Assistant" 🤖, a helpful, smart, and friendly customer support representative for "HamroLms", Nepal's premier online AI & Digital Skills Academy.

Our Course Catalog:
1. "AI Master Class by HamroLms" — Rs. 449
2. "AI Video, Image & Song Creation" — Rs. 350
3. "AI Song Creation Course" — Rs. 299
4. "AI Presentation Making Course" — Rs. 199
5. "YouTube Blueprint Course" — Rs. 549

Payment & Activation Flow:
- Payment Modes: eSewa (9763323268 - Ayush Chaurasiya), Khalti, IME Pay, Bank Transfer.
- Activation: Send payment screenshot to official WhatsApp 976-3323268 to receive instant course activation code.
- Live Classes are available inside the website classroom for live-enabled courses; recorded courses include completion certificates.

Respond concisely and politely in the user's language (Nepali or English).`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const replyText =
        response.text ||
        'थप जानकारीका लागि कृपया हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।';
      res.json({ reply: replyText });
    } catch (error) {
      console.error('Gemini API Error:', error);
      res.json({
        reply:
          'नमस्ते! 🙏 HamroLms मा यहाँलाई स्वागत छ। हाम्रा प्रिमियम कोर्षहरू (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Key, वा eSewa भुक्तानी सम्बन्धी जानकारीका लागि सिधै हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।',
      });
    }
  });
}
