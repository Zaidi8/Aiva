// Aiva — TextBee SMS provider implementation.
//
// Sends SMS through the Android gateway paired to the account by POSTing to:
//   https://api.textbee.dev/api/v1/gateway/send-sms
// Authenticated with the `x-api-key` header. The default device (or the most
// recently active enabled device) is used unless TEXTBEE_DEVICE_ID is set.
//
// Mirrors the account-level (non-device-scoped) send endpoint — the old
// /gateway/devices/{id}/send-sms route is deprecated server-side.
//
// Credentials are read from the environment at call time so the file never
// clashes with Next.js env-caching in dev. Nothing here is ever exposed to
// the client; the module is server-only imported upstream.
//
// Every send RESOLVES with a result — network failures, non-2xx responses and
// missing config all fold into SmsSendResult.error rather than throwing.

import "server-only";
import type { SmsProvider, SmsSendInput, SmsSendResult } from "./provider";

const TEXTBEE_SEND_URL = "https://api.textbee.dev/api/v1/gateway/send-sms";

// Cap how much of a provider error body we persist into Notification.errorMsg.
const MAX_ERROR_LENGTH = 300;

export const textbeeProvider: SmsProvider = {
  name: "textbee",

  async send({ to, message }: SmsSendInput): Promise<SmsSendResult> {
    const apiKey = process.env.TEXTBEE_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "TEXTBEE_API_KEY is not configured on the server.",
      };
    }

    // deviceId / simSubscriptionId are OPTIONAL at the API level; the account
    // falls back to its default (most recently active) device. Only pin them
    // when the operator has chosen to.
    const body: Record<string, unknown> = { recipients: [to], message };
    const deviceId = process.env.TEXTBEE_DEVICE_ID?.trim();
    if (deviceId) body.deviceId = deviceId;
    const simId = Number(process.env.TEXTBEE_SIM_SUBSCRIPTION_ID);
    if (Number.isFinite(simId) && simId > 0) {
      body.simSubscriptionId = simId;
    }

    try {
      const res = await fetch(TEXTBEE_SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(
          0,
          MAX_ERROR_LENGTH,
        );
        return {
          success: false,
          error: `TextBee HTTP ${res.status}${detail ? `: ${detail}` : ""}`,
        };
      }

      // 2xx. The account's SMS queue returns an smsBatchId — keep it as the
      // provider reference so staff can trace the send later.
      const payload = (await res.json().catch(() => ({}))) as {
        smsBatchId?: unknown;
      };
      return {
        success: true,
        ...(typeof payload.smsBatchId === "string" && payload.smsBatchId.length
          ? { providerRef: payload.smsBatchId }
          : {}),
      };
    } catch (e) {
      return {
        success: false,
        error: `TextBee request failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      };
    }
  },
};