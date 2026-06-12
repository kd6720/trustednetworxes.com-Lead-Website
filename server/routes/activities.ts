import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/activities?leadId=&limit=
router.get("/", async (req, res) => {
  const { leadId, limit } = req.query as { leadId?: string; limit?: string };
  const where: Record<string, unknown> = {};
  if (leadId) where.leadId = leadId;
  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit ? Number(limit) : 50,
    include: {
      user: { select: { id: true, name: true } },
      lead: { select: { id: true, name: true } },
    },
  });
  res.json(activities);
});

// POST /api/activities  — log an activity (note, call, email, meeting...)
router.post("/", async (req, res) => {
  const { type, description, leadId } = req.body ?? {};
  if (!type || !description) {
    return res.status(400).json({ error: "type and description are required" });
  }
  const activity = await prisma.activity.create({
    data: { type, description, leadId: leadId ?? null, userId: req.user!.id },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json(activity);
});

// DELETE /api/activities/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Activity not found" });
  await prisma.activity.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
