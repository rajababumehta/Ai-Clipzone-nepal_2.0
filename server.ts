import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const currentDirname = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(fileURLToPath(import.meta?.url || "file://" + path.join(process.cwd(), "server.ts")));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

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
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
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
