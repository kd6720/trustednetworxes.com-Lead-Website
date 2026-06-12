import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/companies?search=&industry=
router.get("/", async (req, res) => {
  const { search, industry } = req.query as { search?: string; industry?: string };
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { city: { contains: search } },
      { website: { contains: search } },
    ];
  }
  if (industry) where.industry = industry;
  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, leads: true } } },
  });
  res.json(companies);
});

// GET /api/companies/:id
router.get("/:id", async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      leads: { orderBy: { createdAt: "desc" } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
  if (!company) return res.status(404).json({ error: "Company not found" });
  res.json(company);
});

const FIELDS = [
  "name", "website", "industry", "size", "address",
  "city", "state", "zip", "notes", "leadSource", "assignedUserId",
] as const;

function pick(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) if (f in body) data[f] = body[f];
  return data;
}

// POST /api/companies
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  if (!body.name) return res.status(400).json({ error: "name is required" });
  const company = await prisma.company.create({ data: pick(body) as { name: string } });
  res.status(201).json(company);
});

// PUT /api/companies/:id
router.put("/:id", async (req, res) => {
  const existing = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Company not found" });
  const company = await prisma.company.update({ where: { id: req.params.id }, data: pick(req.body ?? {}) });
  res.json(company);
});

// DELETE /api/companies/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Company not found" });
  // Detach related records so the delete doesn't fail on FK constraints.
  await prisma.contact.updateMany({ where: { companyId: req.params.id }, data: { companyId: null } });
  await prisma.lead.updateMany({ where: { companyId: req.params.id }, data: { companyId: null } });
  await prisma.company.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
