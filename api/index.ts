import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

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

    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini API Key is not configured. Please configure GEMINI_API_KEY." 
      });
    }

    // Format history into the format that Gemini API expects
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
1. "AI Master Class by Dhruv Rathee" — Rs. 449 (Hindi, Best Seller, covers 30+ AI Tools, Midjourney, Runway, ElevenLabs, ChatGPT, voice cloning, animations).
2. "AI Video, Image & Song Creation" — Rs. 350 (Nepali, covers realistic avatar video creation, text-to-video, Suno, Udio, CapCut).
3. "AI Song Creation Course" — Rs. 299 (Nepali/Hindi, covers Suno v3/v4, lyrics creation, voice cloning, mixing & mastering, launching songs).
4. "AI Presentation Making Course" — Rs. 199 (Nepali/Hindi, covers Gamma App, Tome, PowerPoint AI, creating animated professional presentation slide decks in the viral Dhruv Rathee style).

Important Core Selling Points (HIGHLIGHT THESE):
- Recorded lectures (Watch anytime, anywhere. No live class scheduling pressure, perfect for students & working professionals).
- Lifetime access (आजीवन पहुँच) including all future updates and newly added video lessons completely free.
- Professional Completion Certificate for every course.
- 24/7 dedicated student help and premium support via WhatsApp.

Payment & Activation Flow:
- Payment Modes: eSewa, Khalti, IME Pay, Bank Transfer.
- Scan QR: Users can click "Pay & Join Now" on any card to scan the official FonePay QR code.
- Activation: Once paid, students MUST send a screenshot of the payment transaction to our official WhatsApp support number: 976-3323268 (or +977 9763323268) to receive instant course credentials and access link.

Tone and Language Guidelines:
- Respond in the language of the user. If they write in Nepali, reply in warm, respectful Nepali (using Unicode or Romanized/English mixed words). If they write in English, reply in English.
- Keep responses relatively concise, exciting, and structured. Use formatting (bullet points, bold text) to make replies beautiful.
- Keep the tone polite, optimistic, and encouraging. Never invent mock courses, mock links, or fake pricing.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
    res.status(500).json({ 
      error: "An error occurred with our server-side AI Agent. Please retry or contact support on WhatsApp.",
      details: error?.message || ""
    });
  }
});

// Export the Express app for Vercel Serverless Functions
export default app;
