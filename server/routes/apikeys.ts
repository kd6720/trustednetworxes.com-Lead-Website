import { Router } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function generateKey(): string {
  return `tnx_${randomBytes(24).toString("hex")}`;
}

// GET /api/apikeys  (only the current user's keys)
router.get("/", async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(keys);
});

// POST /api/apikeys  { name, scopes? }
router.post("/", async (req, res) => {
  const { name, scopes } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const key = await prisma.apiKey.create({
    data: {
      key: generateKey(),
      name,
      scopes: scopes ?? "read,write",
      userId: req.user!.id,
    },
  });
  // The full key is only returned once, at creation time.
  res.status(201).json(key);
});

// DELETE /api/apikeys/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    return res.status(404).json({ error: "API key not found" });
  }
  await prisma.apiKey.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
