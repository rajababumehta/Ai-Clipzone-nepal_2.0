import express from "express";
import dotenv from "dotenv";
import { mountSharedApiMiddlewareAndRoutes } from "./coreApiRoutes.ts";

dotenv.config();

const app = express();
app.disable("x-powered-by");

// Mount shared hardened security headers, body limits, rate limiters, Live Class & AI APIs
mountSharedApiMiddlewareAndRoutes(app);

// Clean JSON 404 for unknown /api/* endpoints
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export default app;
