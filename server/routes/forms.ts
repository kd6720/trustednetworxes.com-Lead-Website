import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { fireWebhooks, logActivity } from "../lib/events.js";

// ---------------------------------------------------------------------------
// Authenticated form-builder CRUD  (mounted at /api/forms)
// ---------------------------------------------------------------------------
const router = Router();
router.use(requireAuth);

const FIELDS = [
  "name", "fields", "redirectUrl", "confirmationMessage", "notifyEmail", "spamProtection",
] as const;

function pick(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (!(f in body)) continue;
    // `fields` is stored as a JSON string.
    if (f === "fields" && typeof body[f] !== "string") {
      data[f] = JSON.stringify(body[f]);
    } else {
      data[f] = body[f];
    }
  }
  return data;
}

function serialize(form: { fields: string } & Record<string, unknown>) {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(form.fields);
  } catch {
    parsed = [];
  }
  return { ...form, fields: parsed };
}

router.get("/", async (_req, res) => {
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  res.json(forms.map((f) => serialize(f)));
});

router.get("/:id", async (req, res) => {
  const form = await prisma.form.findUnique({
    where: { id: req.params.id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!form) return res.status(404).json({ error: "Form not found" });
  res.json({
    ...serialize(form),
    submissions: form.submissions.map((s) => ({ ...s, data: safeParse(s.data) })),
  });
});

router.post("/", async (req, res) => {
  const body = req.body ?? {};
  if (!body.name) return res.status(400).json({ error: "name is required" });
  const data = pick(body) as { name: string; fields?: string };
  if (!data.fields) data.fields = "[]";
  const form = await prisma.form.create({ data });
  res.status(201).json(serialize(form));
});

router.put("/:id", async (req, res) => {
  const existing = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Form not found" });
  const form = await prisma.form.update({ where: { id: req.params.id }, data: pick(req.body ?? {}) });
  res.json(serialize(form));
});

router.delete("/:id", async (req, res) => {
  const existing = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Form not found" });
  await prisma.form.delete({ where: { id: req.params.id } }); // submissions cascade
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Public, unauthenticated endpoints  (mounted at /api/public/forms)
// ---------------------------------------------------------------------------
export const publicForms = Router();

// Fetch the form definition so an embedded widget can render it.
publicForms.get("/:id", async (req, res) => {
  const form = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!form) return res.status(404).json({ error: "Form not found" });
  res.json({
    id: form.id,
    name: form.name,
    fields: safeParse(form.fields),
    confirmationMessage: form.confirmationMessage,
    redirectUrl: form.redirectUrl,
  });
});

// Accept a public submission. Creates a FormSubmission + a Lead, fires webhook.
publicForms.post("/:id/submit", async (req, res) => {
  const form = await prisma.form.findUnique({ where: { id: req.params.id } });
  if (!form) return res.status(404).json({ error: "Form not found" });

  const data = (req.body ?? {}) as Record<string, unknown>;

  // Honeypot spam protection: if enabled and the hidden `_gotcha` field is set, drop silently.
  if (form.spamProtection && data._gotcha) {
    return res.json({ ok: true });
  }
  delete data._gotcha;

  const submission = await prisma.formSubmission.create({
    data: {
      formId: form.id,
      data: JSON.stringify(data),
      source: (req.headers["referer"] as string) ?? "embed",
      ip: req.ip ?? null,
      userAgent: (req.headers["user-agent"] as string) ?? null,
    },
  });

  // Derive a lead from common field names.
  const name =
    (data.name as string) ||
    [data.firstName, data.lastName].filter(Boolean).join(" ") ||
    (data.email as string) ||
    "Web lead";
  const lead = await prisma.lead.create({
    data: {
      name: `${name} — ${form.name}`,
      source: "Web Form",
      status: "New",
      notes: Object.entries(data)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    },
  });
  await logActivity({ type: "created", description: `Lead captured from form "${form.name}"`, leadId: lead.id });
  await fireWebhooks("lead.created", { lead, submission });

  res.status(201).json({
    ok: true,
    message: form.confirmationMessage ?? "Thank you! We'll be in touch shortly.",
    redirectUrl: form.redirectUrl,
  });
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default router;
