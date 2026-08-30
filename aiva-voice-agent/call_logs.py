"""Aiva — call-log webhook client.

POSTs call lifecycle events to the Next.js app so a live call is persisted to
the `CallLog` table and shows up on the AI Receptionist page:

  - start:  POST /api/voice/incoming-call   (once, when the SIP call connects)
  - turn:   POST /api/voice/transcript-chunk (per spoken utterance, user+assistant)
  - end:    POST /api/voice/call-ended       (once, when the call hangs up)

All endpoints are guarded by the same `x-webhook-secret` header used by
`clinic_context.py`. Every call is treated as fire-and-forget / fail-soft:
persistence must never drop an active call, so any network error is logged and
ignored (the caller still hears the agent).

The `eventId` values are derived from the provider call id plus a sequence, so
retries are idempotent at the backend (see withIdempotency / WebhookEvent).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

logger = logging.getLogger("aiva.call_logs")

_TIMEOUT_S = 5.0
_HEADER_SECRET = "x-webhook-secret"
_MAX_RETRIES = 2


class _AsyncRateLimitedClient:
    """Minimal shared aiohttp client with a soft concurrency cap so a flurry of
    transcript turns can't saturate the event loop or hammer the backend."""

    def __init__(self, backend_url: str, secret: str, max_concurrency: int = 4) -> None:
        self.base = backend_url.rstrip("/")
        self.secret = secret
        self._sem = asyncio.Semaphore(max_concurrency)

    async def post(self, path: str, payload: dict[str, Any], attempts: int = 1) -> bool:
        url = f"{self.base}{path}"
        timeout = aiohttp.ClientTimeout(total=_TIMEOUT_S, connect=3.0)
        async with self._sem:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    url,
                    json=payload,
                    headers={_HEADER_SECRET: self.secret},
                ) as resp:
                    if resp.status != 200:
                        body = await resp.text()
                        logger.warning(
                            "call-log POST %s -> %s: %s", path, resp.status, body[:200]
                        )
                        if attempts > 1:
                            return await self.post(path, payload, attempts - 1)
                        return False
        return True


async def start_call(
    *,
    client: _AsyncRateLimitedClient,
    event_id: str,
    provider_call_id: str,
    to: str,
    caller_phone: str,
    clinic_id: str,
    started_at: str | None = None,
) -> bool:
    """Register a new CallLog row. Returns False on failure (non-fatal)."""
    payload: dict[str, Any] = {
        "eventId": event_id,
        "providerCallId": provider_call_id,
        "to": to,
        "from": caller_phone,
        "clinicId": clinic_id,
    }
    if started_at is not None:
        payload["startedAt"] = started_at
    return await client.post(
        "/api/voice/incoming-call",
        payload,
        attempts=_MAX_RETRIES,
    )


async def append_turn(
    *,
    client: _AsyncRateLimitedClient,
    provider_call_id: str,
    role: str,
    text: str,
    seq: int,
    at: str | None = None,
) -> bool:
    """Append one transcript turn (user | assistant). Dedup-safe via eventId."""
    return await client.post(
        "/api/voice/transcript-chunk",
        {
            "eventId": f"{provider_call_id}.turn.{seq}",
            "providerCallId": provider_call_id,
            "role": role,
            "text": text,
            "at": at,
        },
        attempts=_MAX_RETRIES,
    )


async def end_call(
    *,
    client: _AsyncRateLimitedClient,
    provider_call_id: str,
    ended_at: str | None = None,
    duration_sec: int | None = None,
    outcome: str | None = None,
    detected_intent: str | None = None,
    sentiment: str | None = None,
    patient_id: str | None = None,
    appointment_id: str | None = None,
) -> bool:
    """Finalize the CallLog row with outcome/summary fields. Non-fatal on failure."""
    payload: dict[str, Any] = {
        "eventId": f"{provider_call_id}.end",
        "providerCallId": provider_call_id,
    }
    if ended_at is not None:
        payload["endedAt"] = ended_at
    if duration_sec is not None:
        payload["durationSec"] = duration_sec
    if outcome is not None:
        payload["outcome"] = outcome
    if detected_intent is not None:
        payload["detectedIntent"] = detected_intent
    if sentiment is not None:
        payload["sentiment"] = sentiment
    if patient_id is not None:
        payload["patientId"] = patient_id
    if appointment_id is not None:
        payload["appointmentId"] = appointment_id
    return await client.post(
        "/api/voice/call-ended",
        payload,
        attempts=_MAX_RETRIES,
    )
