import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const LIVE_TOKEN_KEY = crypto
  .createHash("sha256")
  .update(process.env.LIVE_TOKEN_SECRET || process.env.GEMINI_API_KEY || "aiclipzone-nepal-live-zoom-key-2026")
  .digest();

function encryptLivePayload(payload: object): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", LIVE_TOKEN_KEY, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptLivePayload(token: string): any | null {
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

function buildZoomUrls(rawUrl: string, studentName: string): { webUrl: string; mtgUrl: string } | null {
  try {
    const trimmed = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const cleanName = String(studentName || "Student").trim().slice(0, 60) || "Student";
    const idMatch = parsed.pathname.match(/\/(?:j|wc\/join|s)\/(\d{9,12})/i);
    const meetingId = idMatch?.[1] || "";
    const pwd = parsed.searchParams.get("pwd") || "";

    if (parsed.hostname.toLowerCase().includes("zoom.")) {
      parsed.searchParams.set("uname", cleanName);
    }

    const webUrl = parsed.toString();
    const mtgUrl = meetingId
      ? `zoommtg://zoom.us/join?action=join&confno=${encodeURIComponent(meetingId)}${pwd ? `&pwd=${encodeURIComponent(pwd)}` : ""}&uname=${encodeURIComponent(cleanName)}`
      : "";

    return { webUrl, mtgUrl };
  } catch {
    return null;
  }
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const currentDirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta?.url || "file://" + path.join(process.cwd(), "server.ts")));

async function startServer() {
  const app = express();

  // Determine port:
  // In dev, the dev runner passes '--port 3000' (must be 3000).
  // In production (Cloud Run), Cloud Run assigns process.env.PORT (typically 8080).
  const args = process.argv;
  const portArgIndex = args.indexOf("--port");
  let PORT = 3000;

  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    const parsed = parseInt(args[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      PORT = parsed;
    }
  } else if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) {
      PORT = parsed;
    }
  }

  // Body parser
  app.use(express.json());

  // Health check endpoint for Cloud Run and container liveness probes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Generate short-lived opaque join URL so Zoom links are never exposed to students
  app.post("/api/live-join-token", (req, res) => {
    try {
      const { zoomLink, studentName, sessionTitle, courseTitle } = req.body || {};
      const urls = buildZoomUrls(zoomLink, studentName || "Student");
      if (!urls) {
        return res.status(400).json({ error: "Invalid meeting URL" });
      }
      const token = encryptLivePayload({
        w: urls.webUrl,
        m: urls.mtgUrl,
        s: String(studentName || "Student").slice(0, 60),
        t: String(sessionTitle || "Live Class Session").slice(0, 100),
        c: String(courseTitle || "AI Clipzone Live").slice(0, 100),
        exp: Date.now() + 15 * 60 * 1000,
      });
      res.json({ launchUrl: `/api/live-launch?t=${encodeURIComponent(token)}` });
    } catch {
      res.status(500).json({ error: "Unable to create live session pass" });
    }
  });

  // Auto-join redirect page that launches Zoom without displaying any meeting link
  app.get("/api/live-launch", (req, res) => {
    const token = String(req.query.t || "");
    const payload = token ? decryptLivePayload(token) : null;
    if (!payload || !payload.w || !payload.exp || Date.now() > Number(payload.exp)) {
      res.status(410).type("html").send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Link Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:400px;background:#18181b;border:1px solid #27272a;border-radius:20px;padding:28px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0 0 18px}button{background:#2563eb;color:#fff;border:0;border-radius:12px;padding:10px 18px;font-weight:700;cursor:pointer}</style></head><body><div class="card"><h1>Live Pass Expired</h1><p>Please return to your course section and click Join again.</p><button onclick="window.close()">Close</button></div></body></html>`);
      return;
    }

    const safeTitle = escapeHtml(payload.t || "Live Class Session");
    const safeCourse = escapeHtml(payload.c || "Course Live Class");
    const safeStudent = escapeHtml(payload.s || "Student");
    const webUrlJson = JSON.stringify(String(payload.w));
    const mtgUrlJson = JSON.stringify(String(payload.m || ""));

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Joining ${safeTitle}</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fafafa;font-family:system-ui,-apple-system,sans-serif;padding:24px}
    .box{max-width:420px;width:100%;background:#09090b;border:1px solid #27272a;border-radius:24px;padding:32px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.7)}
    .dot{width:12px;height:12px;border-radius:999px;background:#10b981;display:inline-block;margin-right:8px;animation:p 1.2s infinite}
    @keyframes p{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.85)}}
    .badge{display:inline-flex;align-items:center;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#34d399;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);padding:6px 12px;border-radius:999px;margin-bottom:16px}
    h1{font-size:20px;font-weight:800;margin:0 0 8px;line-height:1.3}
    .course{font-size:13px;color:#a1a1aa;margin:0 0 18px}
    .user{font-size:12px;color:#d4d4d8;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:10px 14px;margin-bottom:20px}
    .btn{width:100%;background:#2563eb;color:#fff;border:0;border-radius:14px;padding:13px 18px;font-size:14px;font-weight:800;cursor:pointer}
    .btn:hover{background:#3b82f6}
    .hint{font-size:11px;color:#71717a;margin-top:14px;line-height:1.5}
  </style>
</head>
<body>
  <div class="box">
    <div class="badge"><span class="dot"></span>Connecting to Live Class</div>
    <h1>${safeTitle}</h1>
    <p class="course">${safeCourse}</p>
    <div class="user">Joining as: <strong>${safeStudent}</strong></div>
    <button class="btn" id="join-now-btn" type="button">Join Live Classroom</button>
    <p class="hint">Launching your live classroom automatically. If Zoom asks to open, allow it to join immediately.</p>
  </div>
  <iframe id="zoom-app-frame" style="display:none;width:0;height:0;border:0;" aria-hidden="true"></iframe>
  <script>
    (function(){
      var wUrl = ${webUrlJson};
      var mUrl = ${mtgUrlJson};
      function launch() {
        if (mUrl) {
          try {
            var frame = document.getElementById('zoom-app-frame');
            if (frame) frame.src = mUrl;
          } catch (e) {}
        }
        setTimeout(function() {
          window.location.replace(wUrl);
        }, mUrl ? 750 : 120);
      }
      document.getElementById('join-now-btn').addEventListener('click', function() {
        window.location.replace(wUrl);
      });
      launch();
    })();
  </script>
</body>
</html>`);
  });

  // Dedicated Service Worker route to ensure correct MIME type and avoid HTML fallback
  app.get("/sw.js", (req, res) => {
    const swPath = fs.existsSync(path.join(process.cwd(), "public", "sw.js"))
      ? path.join(process.cwd(), "public", "sw.js")
      : path.join(process.cwd(), "dist", "sw.js");

    if (fs.existsSync(swPath)) {
      res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Service-Worker-Allowed", "/");
      return res.sendFile(swPath);
    }
    res.status(404).type("text/plain").send("Service Worker not found");
  });

  // Dedicated Official Logo routes with CORS and caching
  app.get(["/logo.png", "/institute-logo.png"], (req, res) => {
    const logoPath = fs.existsSync(path.join(process.cwd(), "public", "logo.png"))
      ? path.join(process.cwd(), "public", "logo.png")
      : path.join(process.cwd(), "dist", "logo.png");

    if (fs.existsSync(logoPath)) {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.sendFile(logoPath);
    }
    res.status(404).type("text/plain").send("Logo not found");
  });

  // Serve static assets from public directory
  app.use(express.static(path.join(process.cwd(), "public")));

  // Initialize server-side Gemini client
  let ai: GoogleGenAI | null = null;
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Endpoint for secured AI agent chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check / lazy initialize AI client
      const currentApiKey = process.env.GEMINI_API_KEY;
      if (!ai && currentApiKey) {
        ai = new GoogleGenAI({
          apiKey: currentApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }

      if (!ai) {
        // Safe intelligent fallback when GEMINI_API_KEY is not configured yet
        return res.json({ 
          reply: "नमस्ते! 🙏 AI Clipzone Nepal मा यहाँलाई स्वागत छ। हाम्रा प्रिमियम कोर्षहरू (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Key, वा eSewa भुक्तानी सम्बन्धी जानकारीका लागि सिधै हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।" 
        });
      }

      // Format history into the format that Gemini API expects
      // Using gemini-3.5-flash
      const contents = [];
      
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }

      // Append current user message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const systemInstruction = `You are "AI Clipzone Assistant" 🤖, a helpful, incredibly smart, and friendly customer support representative for "AI Clipzone Nepal", Nepal's premier online AI Academy.

Your primary goal is to assist prospective students, answer inquiries, explain course contents, and provide clear details about purchasing and access.

Here is your exact, accurate source-of-truth knowledge base. ONLY share information compatible with this:

Our Course Catalog:
1. "AI Master Class by AI Clipzone" — Rs. 449 (Hindi & Nepali, Best Seller, covers 30+ AI Tools, Midjourney, Runway, ElevenLabs, ChatGPT, voice cloning, animations).
2. "AI Video, Image & Song Creation" — Rs. 350 (Nepali, covers realistic avatar video creation, text-to-video, Suno, Udio, CapCut).
3. "AI Song Creation Course" — Rs. 299 (Nepali/Hindi, covers Suno v3/v4, lyrics creation, voice cloning, mixing & mastering, launching songs).
4. "AI Presentation Making Course" — Rs. 199 (Nepali/Hindi, covers Gamma App, Tome, PowerPoint AI, creating animated professional presentation slide decks).
5. "YouTube Blueprint Course" — Rs. 549 (Hindi & Nepali, covers YouTube growth, niche selection, editing, monetization, and AI automation).

Important Core Selling Points (HIGHLIGHT THESE):
- Recorded lectures (Watch anytime, anywhere. No live class scheduling pressure, perfect for students & working professionals).
- Lifetime access (आजीवन पहुँच) including all future updates and newly added video lessons completely free.
- Professional Completion Certificate for every course with student name & unique verification code.
- 24/7 dedicated student help and premium support via WhatsApp.

Payment & Activation Flow:
- Payment Modes: eSewa (9763323268 - Ayush Chaurasiya), Khalti, IME Pay, Bank Transfer.
- Scan QR: Users can click "Pay & Join Now" on any card to scan the official FonePay QR code.
- Activation: Once paid, students MUST send a screenshot of the payment transaction to our official WhatsApp support number: 976-3323268 (or +977 9763323268) to receive instant course credentials and secret activation code.

Tone and Language Guidelines:
- Respond in the language of the user. If they write in Nepali, reply in warm, respectful Nepali (using Unicode or Romanized/English mixed words). If they write in English, reply in English.
- Keep responses relatively concise, exciting, and structured. Use formatting (bullet points, bold text) to make replies beautiful.
- Keep the tone polite, optimistic, and encouraging. Never invent mock courses, mock links, or fake pricing.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      });

      const replyText = response.text || "थप जानकारीका लागि कृपया हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।";
      res.json({ reply: replyText });

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.json({ 
        reply: "नमस्ते! 🙏 AI Clipzone Nepal मा यहाँलाई स्वागत छ। हाम्रा प्रिमियम कोर्षहरू (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Key, वा eSewa भुक्तानी सम्बन्धी जानकारीका लागि सिधै हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।"
      });
    }
  });

  // Serve static files & Vite dev middleware
  const isDev = process.argv.includes("--port") || process.env.NODE_ENV === "development";
  const distPath = path.join(process.cwd(), "dist");
  const isProduction = process.env.NODE_ENV === "production" || (!isDev && fs.existsSync(path.join(distPath, "index.html")));

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Clipzone Server is live on http://0.0.0.0:${PORT}`);
  });
}

startServer();
