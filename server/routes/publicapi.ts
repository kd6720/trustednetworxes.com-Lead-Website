import { Router } from "express";
import { prisma } from "../db.js";
import { requireApiKey } from "../middleware/auth.js";
import { fireWebhooks, logActivity } from "../lib/events.js";

// Public REST API authenticated with an API key (x-api-key header).
// Mounted at /api/v1.
const router = Router();
router.use(requireApiKey);

function requireScope(scope: string) {
  return (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    if (!req.apiKeyScopes?.includes(scope)) {
      return res.status(403).json({ error: `API key missing required scope: ${scope}` });
    }
    next();
  };
}

// GET /api/v1/leads
router.get("/leads", requireScope("read"), async (_req, res) => {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: { select: { id: true, name: true } } },
  });
  res.json(leads);
});

// POST /api/v1/leads  — create a lead via the API
router.post("/leads", requireScope("write"), async (req, res) => {
  const { name, source, status, estimatedValue, notes, companyId, contactId } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const lead = await prisma.lead.create({
    data: {
      name,
      source: source ?? "API",
      status: status ?? "New",
      estimatedValue: estimatedValue != null ? Number(estimatedValue) : null,
      notes: notes ?? null,
      companyId: companyId ?? null,
      contactId: contactId ?? null,
      assignedUserId: req.user?.id ?? null,
    },
  });
  await logActivity({ type: "created", description: `Lead "${lead.name}" created via API`, leadId: lead.id, userId: req.user?.id });
  await fireWebhooks("lead.created", lead);
  res.status(201).json(lead);
});

// GET /api/v1/companies
router.get("/companies", requireScope("read"), async (_req, res) => {
  const companies = await prisma.company.findMany({ orderBy: { createdAt: "desc" } });
  res.json(companies);
});

export default router;
