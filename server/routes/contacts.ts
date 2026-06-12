import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/contacts?search=&companyId=&status=
router.get("/", async (req, res) => {
  const { search, companyId, status } = req.query as {
    search?: string;
    companyId?: string;
    status?: string;
  };
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (companyId) where.companyId = companyId;
  if (status) where.leadStatus = status;
  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { company: { select: { id: true, name: true } } },
  });
  res.json(contacts);
});

// GET /api/contacts/:id
router.get("/:id", async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: {
      company: true,
      leads: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });
  res.json(contact);
});

const FIELDS = [
  "firstName", "lastName", "title", "email", "phone",
  "mobile", "companyId", "notes", "leadStatus", "assignedUserId",
] as const;

function pick(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) if (f in body) data[f] = body[f];
  return data;
}

// POST /api/contacts
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  if (!body.firstName || !body.lastName) {
    return res.status(400).json({ error: "firstName and lastName are required" });
  }
  const contact = await prisma.contact.create({
    data: pick(body) as { firstName: string; lastName: string },
    include: { company: { select: { id: true, name: true } } },
  });
  res.status(201).json(contact);
});

// PUT /api/contacts/:id
router.put("/:id", async (req, res) => {
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });
  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: pick(req.body ?? {}),
    include: { company: { select: { id: true, name: true } } },
  });
  res.json(contact);
});

// DELETE /api/contacts/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });
  await prisma.lead.updateMany({ where: { contactId: req.params.id }, data: { contactId: null } });
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
