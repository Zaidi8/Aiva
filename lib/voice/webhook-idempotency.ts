// Webhook idempotency: providers RETRY on flaky 5xx. Each event carries a
// stable `providerEventId`; we record it, run the side effect, then mark
// `processedAt`. On retry, we no-op with a 200 instead of double-processing.
//
// Usage:
//   const verdict = await withIdempotency(eventId, payload, async () => {
//     // your side effect
//   });
//   if (verdict.status === 'duplicate') return ok({ duplicate: true });
//   if (verdict.status === 'failed')    return fail(...);

import "server-only";
import { prisma } from "@/lib/prisma";

export type IdempotencyVerdict =
  | { status: "processed" }
  | { status: "duplicate" }
  | { status: "failed"; error: string };

export async function withIdempotency(
  args: {
    provider: string;
    providerEventId: string;
    eventType: string;
    payload: unknown;
  },
  sideEffect: () => Promise<void>,
): Promise<IdempotencyVerdict> {
  // 1. Try to claim the event id (unique). If the row already exists, this throws.
  let claimed = false;
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: args.provider,
        providerEventId: args.providerEventId,
        eventType: args.eventType,
        payload: args.payload as never,
      },
    });
    claimed = true;
  } catch {
    // Already exists — check whether the previous run completed.
    const existing = await prisma.webhookEvent.findUnique({
      where: { providerEventId: args.providerEventId },
      select: { processedAt: true, error: true },
    });
    if (existing?.processedAt) return { status: "duplicate" };
    // Previous run errored; allow retry by overwriting the row's error field.
  }

  // 2. Run the side effect. Persist its outcome.
  try {
    await sideEffect();
    await prisma.webhookEvent.update({
      where: { providerEventId: args.providerEventId },
      data: { processedAt: new Date(), error: null },
    });
    return { status: "processed" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (claimed) {
      await prisma.webhookEvent.update({
        where: { providerEventId: args.providerEventId },
        data: { error: msg },
      });
    }
    return { status: "failed", error: msg };
  }
}
