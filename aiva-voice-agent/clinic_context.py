"""Aiva — Phase 2 clinic-context fetcher and prompt renderer.

Fetches per-call clinic knowledge from the Next.js app and renders it into the
system prompt and greeting strings the voice agent uses.

The fetch/cache plumbing keeps an in-process dict (`_cache`) so a future
"refresh clinic info" tool can flip the `max_age_s` argument without
restarting the worker. Phase 2 always passes `max_age_s=0` (fresh per call).

On any fetch failure the renderers fall back to a fail-closed prompt + greeting
so the caller hears a clean apology instead of silence or a crash.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import aiohttp

logger = logging.getLogger("aiva.clinic_context")

# The context endpoint does several DB round-trips; from a backend that sits far
# from the DB region this can take a few seconds. 2.5s was too tight and caused
# intermittent timeouts → the fallback "technical issue" greeting even when the
# backend was healthy. 8s tolerates a slow remote pooler while still bounding it.
_FETCH_TIMEOUT_S = 8.0
_HEADER_SECRET = "x-webhook-secret"

# (timestamp, payload) keyed by clinic_id. Phase 2 only ever stores fresh
# entries; failed fetches are NOT cached.
_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_cache_lock = asyncio.Lock()


class ClinicContextError(Exception):
    """Raised when the backend returns a non-success response or malformed payload."""


async def fetch_clinic_context(
    *,
    backend_url: str,
    clinic_id: str,
    webhook_secret: str,
) -> dict[str, Any]:
    """One-shot HTTP GET to /api/voice/clinic-context. Raises on failure."""
    url = f"{backend_url.rstrip('/')}/api/voice/clinic-context"
    timeout = aiohttp.ClientTimeout(total=_FETCH_TIMEOUT_S, connect=3.0)

    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(
            url,
            params={"clinicId": clinic_id},
            headers={_HEADER_SECRET: webhook_secret},
        ) as resp:
            if resp.status != 200:
                body = await resp.text()
                raise ClinicContextError(
                    f"backend returned {resp.status}: {body[:300]}"
                )
            payload = await resp.json()

    # The Next.js envelope is { data: <DTO> }.
    data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(data, dict) or "clinic" not in data:
        raise ClinicContextError(f"malformed payload: {str(payload)[:300]}")
    return data


async def get_or_fetch(
    *,
    backend_url: str,
    clinic_id: str,
    webhook_secret: str,
    max_age_s: float = 0.0,
) -> dict[str, Any]:
    """Return a cached context if fresh, else fetch and cache.

    Phase 2 always passes `max_age_s=0` so every call fetches fresh. A future
    refresh-tool can call this with a larger `max_age_s` and a manual cache
    invalidation step.
    """
    async with _cache_lock:
        cached = _cache.get(clinic_id)
        if cached is not None and max_age_s > 0:
            ts, data = cached
            if time.monotonic() - ts <= max_age_s:
                logger.debug("Clinic context cache hit (age=%.1fs)", time.monotonic() - ts)
                return data

    data = await fetch_clinic_context(
        backend_url=backend_url,
        clinic_id=clinic_id,
        webhook_secret=webhook_secret,
    )
    async with _cache_lock:
        _cache[clinic_id] = (time.monotonic(), data)
    return data


def invalidate_cache(clinic_id: str | None = None) -> None:
    """Drop one or all cached entries. Phase 2 doesn't call this; Phase 3+ will."""
    if clinic_id is None:
        _cache.clear()
    else:
        _cache.pop(clinic_id, None)


# ─────────────────────────────────────────────────────────────────────────────
# Prompt + greeting rendering
# ─────────────────────────────────────────────────────────────────────────────

FALLBACK_SYSTEM_PROMPT = (
    "You are Aiva, a warm clinic receptionist. "
    "There is a temporary problem loading the clinic's information. "
    "Apologize briefly, do not invent any details (no clinic name, address, "
    "doctors, or hours), and tell the caller a human teammate will call them "
    "back shortly. Keep replies to one short sentence."
)

FALLBACK_GREETING = (
    "Hi, this is Aiva. We're having a brief technical issue — a teammate will "
    "call you back shortly."
)


def render_system_prompt(context: dict[str, Any]) -> str:
    """Turn the DTO into the multi-paragraph system prompt.

    Order is intentional: identity → clinic facts → doctors → speaking rules →
    capability boundaries. Rules-last is the most reliable position for
    instruction-following in small models like llama-3.1-8b.
    """
    clinic = context["clinic"]
    ai = context["ai"]
    doctors = context.get("doctors", [])

    agent_name = ai.get("agentName") or "Aiva"
    clinic_name = clinic.get("name") or "the clinic"
    address = clinic.get("address") or "not on file"
    phone = clinic.get("phone") or "not on file"
    timezone = clinic.get("timezone") or "Asia/Karachi"

    lines: list[str] = []
    lines.append(
        f"You are {agent_name}, a warm and concise receptionist at {clinic_name}."
    )
    lines.append("")
    lines.append("# About the clinic")
    lines.append(f"- Name: {clinic_name}")
    lines.append(f"- Address: {address}")
    lines.append(f"- Reception phone: {phone}")
    lines.append(f"- Timezone: {timezone}")
    lines.append("")

    lines.append("# Doctors")
    if not doctors:
        lines.append("- No doctors on file yet. If a caller asks for a specific "
                     "doctor, say you don't have that information and a human "
                     "teammate will follow up.")
    else:
        # Phase 3: only names + specializations here. Day/time availability is
        # answered by the check_availability tool, not baked into the prompt.
        for d in doctors:
            name = d.get("name", "Unknown")
            spec = d.get("specialization")
            lines.append(f"- {name}" + (f" — {spec}" if spec else ""))
    lines.append("")

    lines.append("# How you speak")
    lines.append("- One or two short sentences per reply. This is a phone call, not chat.")
    lines.append("- English only.")
    lines.append(
        "- If you don't know something, say so plainly — never invent doctors, "
        "times, or policies."
    )
    lines.append(f"- Times you mention are in {timezone}.")
    lines.append("")

    lines.append("# What you can and cannot do right now")
    lines.append(
        "- You can answer questions about the clinic and its doctors. You have "
        "tools — USE them instead of guessing:"
    )
    lines.append(
        "  - list_doctors: which doctors work here, or find a kind of doctor "
        "(e.g. a cardiologist)."
    )
    lines.append(
        "  - check_availability: a doctor's open slots on a date. Convert "
        "phrases like 'tomorrow' to a real YYYY-MM-DD date first."
    )
    lines.append(
        "  - lookup_appointments: a caller's upcoming appointments. First ask "
        "them for the phone number the appointment is under, then call it."
    )
    lines.append(
        "- You cannot book, reschedule, or cancel appointments, and you cannot "
        "transfer to a human. NEVER offer to schedule, book, or 'set up' an "
        "appointment, and never ask 'would you like to book?' — you have no way "
        "to do it. You may only TELL the caller which slots are open."
    )
    lines.append(
        "- If the caller wants to book/change/cancel, say a human teammate will "
        "follow up, and offer to take a callback message. Do not promise to do "
        "it yourself."
    )
    # The hard no-booking rule above already covers autoBook/handleRescheduling
    # (Phase 3 cannot write regardless of those flags), so we don't repeat them —
    # repetition tends to confuse small models. Only the emergency rule is
    # conditional on its flag.
    if ai.get("emergencyTransfer", False):
        lines.append(
            "- If the caller describes a medical emergency, tell them to hang up "
            "and call emergency services immediately."
        )

    return "\n".join(lines)


def render_greeting(context: dict[str, Any]) -> str:
    """Return the configured greeting, or a sensible default."""
    ai = context.get("ai", {}) or {}
    msg = (ai.get("greetingMessage") or "").strip()
    if msg:
        return msg
    agent_name = ai.get("agentName") or "Aiva"
    clinic_name = (context.get("clinic") or {}).get("name") or "the clinic"
    return f"Hi, this is {agent_name} at {clinic_name}. How can I help you today?"
