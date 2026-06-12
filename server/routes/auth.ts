import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password, name, role } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password and name are required" });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "A user with that email already exists" });
  }
  // First registered user becomes admin; everyone else defaults to the requested/standard role.
  const userCount = await prisma.user.count();
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: userCount === 0 ? "admin" : role ?? "user",
    },
  });
  const safe = { id: user.id, email: user.email, name: user.name, role: user.role };
  return res.status(201).json({ token: signToken(safe), user: safe });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const safe = { id: user.id, email: user.email, name: user.name, role: user.role };
  return res.json({ token: signToken(safe), user: safe });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt });
});

// PUT /api/auth/me  — update profile (name only, for now)
router.put("/me", requireAuth, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name },
  });
  return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;
