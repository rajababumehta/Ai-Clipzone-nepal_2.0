import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { mountSharedApiMiddlewareAndRoutes } from "./server/coreApiRoutes.ts";

dotenv.config();

async function startServer() {
  const app = express();
  app.disable("x-powered-by");

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

  // Mount shared hardened security headers, body limits, rate limiters, Live Class & AI APIs
  mountSharedApiMiddlewareAndRoutes(app);

  // Dedicated Service Worker route to ensure correct MIME type and avoid HTML fallback
  app.get("/sw.js", (_req, res) => {
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
  app.get(["/logo.png", "/institute-logo.png"], (_req, res) => {
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

  // Clean JSON 404 for unknown /api/* endpoints
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Clipzone Server is live on http://0.0.0.0:${PORT}`);
  });
}

startServer();
