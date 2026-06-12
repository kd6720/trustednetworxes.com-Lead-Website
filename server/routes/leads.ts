import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { fireWebhooks, logActivity } from "../lib/events.js";

const router = Router();
router.use(requireAuth);

export const LEAD_STATUSES = [
  "New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost",
] as const;

// GET /api/leads?search=&status=&companyId=
router.get("/", async (req, res) => {
  const { search, status, companyId } = req.query as {
    search?: string;
    status?: string;
    companyId?: string;
  };
  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search };
  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  res.json(leads);
});

// GET /api/leads/:id  (with activity timeline)
router.get("/:id", async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      company: true,
      contact: true,
      assignedUser: { select: { id: true, name: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  res.json(lead);
});

const FIELDS = [
  "name", "companyId", "contactId", "source", "status",
  "estimatedValue", "nextFollowUp", "notes", "assignedUserId",
] as const;

function pick(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (!(f in body)) continue;
    if (f === "estimatedValue") {
      data[f] = body[f] === null || body[f] === "" ? null : Number(body[f]);
    } else if (f === "nextFollowUp") {
      data[f] = body[f] ? new Date(body[f] as string) : null;
    } else {
      data[f] = body[f];
    }
  }
  return data;
}

// POST /api/leads
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  if (!body.name) return res.status(400).json({ error: "name is required" });
  const lead = await prisma.lead.create({
    data: { assignedUserId: req.user!.id, ...(pick(body) as { name: string }) },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  await logActivity({
    type: "created",
    description: `Lead "${lead.name}" created`,
    leadId: lead.id,
    userId: req.user!.id,
  });
  await fireWebhooks("lead.created", lead);
  res.status(201).json(lead);
});

// PUT /api/leads/:id
router.put("/:id", async (req, res) => {
  const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Lead not found" });
  const data = pick(req.body ?? {});
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data,
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  // Record a status change in the activity timeline.
  if (typeof data.status === "string" && data.status !== existing.status) {
    await logActivity({
      type: "status_change",
      description: `Status changed from ${existing.status} to ${data.status}`,
      leadId: lead.id,
      userId: req.user!.id,
    });
  }
  res.json(lead);
});

// PATCH /api/leads/:id/status  (pipeline drag/drop)
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  if (!status || !LEAD_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${LEAD_STATUSES.join(", ")}` });
  }
  const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Lead not found" });
  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status } });
  if (status !== existing.status) {
    await logActivity({
      type: "status_change",
      description: `Status changed from ${existing.status} to ${status}`,
      leadId: lead.id,
      userId: req.user!.id,
    });
  }
  res.json(lead);
});

// DELETE /api/leads/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Lead not found" });
  await prisma.lead.delete({ where: { id: req.params.id } }); // activities cascade
  res.json({ ok: true });
});

export default router;
