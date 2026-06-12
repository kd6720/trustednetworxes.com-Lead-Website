import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/webhooks
router.get("/", async (_req, res) => {
  const hooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  res.json(hooks);
});

// POST /api/webhooks  { url, event? }
router.post("/", async (req, res) => {
  const { url, event } = req.body ?? {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: "url must be a valid URL" });
  }
  const hook = await prisma.webhook.create({
    data: { url, event: event ?? "lead.created" },
  });
  res.status(201).json(hook);
});

// PUT /api/webhooks/:id  — toggle active / update url
router.put("/:id", async (req, res) => {
  const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Webhook not found" });
  const { url, event, active } = req.body ?? {};
  const hook = await prisma.webhook.update({
    where: { id: req.params.id },
    data: {
      ...(url !== undefined ? { url } : {}),
      ...(event !== undefined ? { event } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
    },
  });
  res.json(hook);
});

// DELETE /api/webhooks/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.webhook.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Webhook not found" });
  await prisma.webhook.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
