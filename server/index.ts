import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import companiesRoutes from "./routes/companies.js";
import contactsRoutes from "./routes/contacts.js";
import leadsRoutes from "./routes/leads.js";
import activitiesRoutes from "./routes/activities.js";
import formsRoutes, { publicForms } from "./routes/forms.js";
import webhooksRoutes from "./routes/webhooks.js";
import apiKeysRoutes from "./routes/apikeys.js";
import dashboardRoutes from "./routes/dashboard.js";
import publicApiRoutes from "./routes/publicapi.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.set("trust proxy", true);

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "trustednetworx-crm" }));

// Diagnostic endpoint — tests DB connectivity and env vars (no auth)
app.get("/api/diag", async (_req, res) => {
  const result: Record<string, unknown> = {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
      JWT_SECRET: process.env.JWT_SECRET ? "set" : "MISSING",
      NO_AUTH: process.env.NO_AUTH ?? "MISSING",
    },
    db: "not tested",
  };
  try {
    const { prisma } = await import("./db.js");
    const count = await prisma.company.count();
    result.db = { connected: true, companyCount: count };
  } catch (e: unknown) {
    const err = e as Error;
    result.db = { connected: false, error: err.message, stack: err.stack?.split("\n").slice(0, 3) };
  }
  res.json(result);
});

// Authenticated app routes
app.use("/api/auth", authRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/apikeys", apiKeysRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Public endpoints
app.use("/api/public/forms", publicForms); // embeddable form render + submit
app.use("/api/v1", publicApiRoutes); // API-key authenticated REST API

// 404 for unknown API routes
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Only start listening when run directly (not imported as a serverless function).
const isMain = process.argv[1]?.includes("server/index");
if (isMain) {
  app.listen(PORT, () => {
    console.log(`🚀 TrustedNetworx CRM API listening on http://localhost:${PORT}`);
  });
}

export { app };
