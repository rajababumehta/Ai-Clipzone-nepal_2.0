import express from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createLiveClassRouter } from "./liveClassRoutes.ts";

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

function buildZoomUrls(rawUrl: string, studentName: string): { webUrl: string; embedUrl: string } | null {
  try {
    const trimmed = String(rawUrl || "").trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    const cleanName = String(studentName || "Student").trim().slice(0, 60) || "Student";
    const base64Name = Buffer.from(cleanName, "utf8").toString("base64");
    const idMatch =
      parsed.pathname.match(/\/(?:j|wc\/join|s)\/(\d{9,12})/i) ||
      parsed.pathname.match(/\/wc\/(\d{9,12})\/join/i);
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

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const app = express();

// Body parser
app.use(express.json());

app.get(["/api", "/api/health"], (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.post("/api/live-join-token", (req, res) => {
  try {
    const { zoomLink, studentName, sessionTitle, courseTitle } = req.body || {};
    const urls = buildZoomUrls(zoomLink, studentName || "Student");
    if (!urls) {
      return res.status(400).json({ error: "Invalid meeting URL" });
    }
    const token = encryptLivePayload({
      w: urls.webUrl,
      e: urls.embedUrl,
      s: String(studentName || "Student").slice(0, 60),
      t: String(sessionTitle || "Live Class Session").slice(0, 100),
      c: String(courseTitle || "AI Clipzone Live").slice(0, 100),
      exp: Date.now() + 15 * 60 * 1000,
    });
    const encoded = encodeURIComponent(token);
    res.json({
      embedUrl: `/api/live-embed?t=${encoded}`,
      launchUrl: `/api/live-launch?t=${encoded}`,
    });
  } catch {
    res.status(500).json({ error: "Unable to create live session pass" });
  }
});

app.get("/api/live-embed", (req, res) => {
  const token = String(req.query.t || "");
  const payload = token ? decryptLivePayload(token) : null;
  const target = payload?.e || payload?.w;
  if (!payload || !target || !payload.exp || Date.now() > Number(payload.exp)) {
    res.status(410).type("html").send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:380px;background:#18181b;border:1px solid #27272a;border-radius:16px;padding:24px}h1{font-size:16px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0}</style></head><body><div class="card"><h1>Live Session Pass Expired</h1><p>Please click Leave Class and click Join again.</p></div></body></html>`);
    return;
  }
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.redirect(302, String(target));
});

app.get("/api/live-launch", (req, res) => {
  const token = String(req.query.t || "");
  const payload = token ? decryptLivePayload(token) : null;
  const target = payload?.e || payload?.w;
  if (!payload || !target || !payload.exp || Date.now() > Number(payload.exp)) {
    res.status(410).type("html").send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Session Link Expired</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center}.card{max-width:400px;background:#18181b;border:1px solid #27272a;border-radius:20px;padding:28px}h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#a1a1aa;margin:0}</style></head><body><div class="card"><h1>Live Pass Expired</h1><p>Please return to your course section and click Join again.</p></div></body></html>`);
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

app.use("/api/live-classes", createLiveClassRouter());

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

    if (!ai && process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }

    if (!ai) {
      return res.json({
        reply: "नमस्ते! 🙏 AI Clipzone Nepal मा यहाँलाई स्वागत छ। हाम्रा प्रिमियम कोर्षहरू (AI Masterclass, YouTube Blueprint, AI Video & Song Creation), Activation Key, वा eSewa भुक्तानी सम्बन्धी जानकारीका लागि सिधै हाम्रो आधिकारिक WhatsApp नम्बर 976-3323268 मा सम्पर्क गर्नुहोस्।"
      });
    }

    const contents = [];

    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.sender === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }]
        });
      }
    }

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
- Recorded lectures (Watch anytime, anywhere) plus Live Interactive Classes for courses with live sessions enabled.
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

// Clean JSON 404 for unknown /api/* endpoints
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
