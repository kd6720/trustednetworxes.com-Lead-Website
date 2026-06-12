import { prisma } from "../db.js";

/**
 * Fire all active webhooks registered for an event. Best-effort: failures are
 * logged but never block the request. Uses the global fetch (Node 18+).
 */
export async function fireWebhooks(event: string, payload: unknown): Promise<void> {
  const hooks = await prisma.webhook.findMany({ where: { event, active: true } });
  await Promise.allSettled(
    hooks.map((hook) =>
      fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
      }).catch((err) => {
        console.error(`[webhook] failed to deliver ${event} to ${hook.url}:`, err.message);
      })
    )
  );
}

/** Convenience helper to record an activity on a lead. */
export async function logActivity(params: {
  type: string;
  description: string;
  leadId?: string | null;
  userId?: string | null;
}): Promise<void> {
  await prisma.activity.create({
    data: {
      type: params.type,
      description: params.description,
      leadId: params.leadId ?? null,
      userId: params.userId ?? null,
    },
  });
}
