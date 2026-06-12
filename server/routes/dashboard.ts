import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const OPEN_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent"];

// GET /api/dashboard/stats
router.get("/stats", async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalLeads, newToday, openOpps, wonThisMonth, totalCompanies, totalContacts, pipeline, recentActivity] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.lead.count({ where: { status: { in: OPEN_STATUSES } } }),
      prisma.lead.findMany({ where: { status: "Won", createdAt: { gte: startOfMonth } } }),
      prisma.company.count(),
      prisma.contact.count(),
      prisma.lead.groupBy({ by: ["status"], _count: { _all: true }, _sum: { estimatedValue: true } }),
      prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          user: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true } },
        },
      }),
    ]);

  const wonValue = wonThisMonth.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);

  res.json({
    totalLeads,
    newToday,
    openOpps,
    wonThisMonth: wonThisMonth.length,
    wonValue,
    totalCompanies,
    totalContacts,
    pipeline: pipeline.map((p) => ({
      status: p.status,
      count: p._count._all,
      value: p._sum.estimatedValue ?? 0,
    })),
    recentActivity,
  });
});

export default router;
