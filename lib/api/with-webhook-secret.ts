// Webhook auth: every inbound webhook must carry an `X-Webhook-Secret` header
// matching `process.env.VOICE_WEBHOOK_SECRET`. Comparison is timing-safe.
//
// The secret is shared between Aiva and the voice provider. Rotate by setting
// a new value and re-configuring the provider; we do NOT support multiple
// active secrets today (revisit if a multi-vendor world needs it).

import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { failUnauthorized } from "./response";

const HEADER = "x-webhook-secret";

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<Response>;

export function withWebhookSecret<Ctx = unknown>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const expected = process.env.VOICE_WEBHOOK_SECRET;
    if (!expected) {
      // Fail closed: missing config = no webhooks accepted.
      return failUnauthorized();
    }
    const got = req.headers.get(HEADER) ?? "";
    if (got.length !== expected.length) {
      // timingSafeEqual throws on length mismatch; short-circuit safely first.
      return failUnauthorized();
    }
    if (!timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
      return failUnauthorized();
    }
    return handler(req, ctx);
  };
}
