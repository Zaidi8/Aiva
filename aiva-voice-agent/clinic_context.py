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
from datetime import datetime, timedelta
from typing import Any

import aiohttp

logger = logging.getLogger("aiva.clinic_context")


def _fmt_time_12h(hhmm: str) -> str:
    """Convert '14:30' → '2:30 PM' for spoken output."""
    try:
        h, m = (int(x) for x in hhmm.split(":"))
        suffix = "PM" if h >= 12 else "AM"
        h12 = h % 12 or 12
        return f"{h12}:{m:02d} {suffix}" if m else f"{h12} {suffix}"
    except Exception:
        return hhmm  # fall back to raw if unparseable


def _weekday_table(today: str, timezone: str = "Asia/Karachi") -> str:
    """Build a day-of-week lookup table so the model never has to compute
    weekdays from dates (small LLMs systematically get this wrong).

    `today` is the current date in the clinic timezone ("YYYY-MM-DD"). Returns
    a compact multi-line mapping of dates → weekday names spanning ~1 week before
    and ~1 week after today, which the system prompt tells the model is
    authoritative. Falls back to `today` alone if the date won't parse.
    """
    try:
        base = datetime.strptime(today, "%Y-%m-%d").date()
    except Exception:
        return today

    days: list[str] = []
    for offset in range(-7, 8):
        d = base + timedelta(days=offset)
        label = "TODAY" if offset == 0 else ""
        days.append(
            f"{d.strftime('%Y-%m-%d')} = {d.strftime('%A')}{('  (' + label + ')') if label else ''}"
        )
    return "\n".join(days)

# dayOfWeek 0=Sunday .. 6=Saturday — same convention as the Next.js DTO.
_DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


def _render_opening_hours(opening_hours: Any) -> str:
    """Render the clinic's openingHours DTO to a compact, readable string like
    "Monday 9:00 AM–5:00 PM, Tuesday 9:00 AM–5:00 PM".

    `opening_hours` is the backend's normalized list of
    { dayOfWeek: 0-6, startTime: "HH:mm", endTime: "HH:mm" } (day-sorted and
    already validated). Returns "" when nothing usable so the caller falls back
    to "not on file".
    """
    if not isinstance(opening_hours, list):
        return ""
    parts: list[str] = []
    for entry in opening_hours:
        if not isinstance(entry, dict):
            continue
        day = entry.get("dayOfWeek")
        start = entry.get("startTime")
        end = entry.get("endTime")
        if not isinstance(day, int) or not (0 <= day <= 6):
            continue
        if not start or not end:
            continue
        parts.append(
            f"{_DAY_NAMES[day]} {_fmt_time_12h(str(start))}–{_fmt_time_12h(str(end))}"
        )
    return ", ".join(parts)

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


def render_system_prompt(context: dict[str, Any], today: str | None = None) -> str:
    """Turn the DTO into the multi-paragraph system prompt.

    Order is intentional: identity → clinic facts → doctors → speaking rules →
    capability boundaries. Rules-last is the most reliable position for
    instruction-following in small models like llama-3.1-8b.

    `today` is the current date in the clinic timezone as "YYYY-MM-DD". It is
    injected so the model can resolve relative phrases ("tomorrow", "next Monday")
    to absolute dates itself — the tools require YYYY-MM-DD.
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

    opening_hours = _render_opening_hours(clinic.get("openingHours"))
    if opening_hours:
        lines.append(
            "- Opening hours: " + opening_hours
            + ". These are doors-open times; appointment slots are set by each "
            "doctor's working days below."
        )
    else:
        lines.append("- Opening hours: not on file.")
    lines.append("")

    lines.append("# Doctors")
    if not doctors:
        lines.append("- No doctors on file yet. If a caller asks for a specific "
                     "doctor, say you don't have that information and a human "
                     "teammate will follow up.")
    else:
        for d in doctors:
            name = d.get("name", "Unknown")
            spec = d.get("specialization")
            exp = d.get("experienceYears")
            sched_parts = []
            for s in d.get("schedule") or []:
                day = s.get("dayName", "")
                start = s.get("startTime", "")
                end = s.get("endTime", "")
                if day and start and end:
                    sched_parts.append(f"{day[:3]} {_fmt_time_12h(start)}–{_fmt_time_12h(end)}")
            sched_str = ""
            if sched_parts:
                sched_str = f" (works: {', '.join(sched_parts)})"
            exp_str = f", {exp} yrs experience" if exp else ""
            lines.append(
                f"- {name}" + (f" — {spec}" if spec else "")
                + exp_str + sched_str
            )
    lines.append("")

    auto_book = ai.get("autoBook", True)
    handle_rescheduling = ai.get("handleRescheduling", False)

    lines.append("# Call rules")
    lines.append(
        "Speak warm, concise English (usually 1–2 sentences). Never invent clinic "
        "facts, doctors, slots, or policies. Use tools silently; never mention "
        "tools, function calls, or arguments. Speak all times in clinic-local time."
    )
    if today:
        lines.append(
            f"Today is {today}. Convert relative dates to YYYY-MM-DD before a "
            "tool call. Use this date-to-weekday table; do not calculate weekdays: "
            + _weekday_table(today, timezone).replace("\n", " | ")
            + ". ‘Next/coming <weekday>’ means its next occurrence, never today. "
            "If corrected, re-check the table and accept the correction."
        )
    lines.append(
        "Doctor schedules are appointment days; clinic opening hours are when "
        "doors are open. Check the chosen doctor's schedule before checking slots. "
        "If they do not work that day, explain their working days and ask for "
        "another day. If a doctor is on leave or the clinic is closed, say so and "
        "offer the next working/open day; never claim they are available."
    )
    lines.append("")

    if auto_book:
        lines.append("# Booking")
        lines.append(
            "Use tools; never choose or change the caller's requested date/time. "
            "If either is missing, ask and wait. Check the exact requested time "
            "only; if unavailable, offer nearby open times. If the doctor has no "
            "slots that day, explain their schedule and ask for another day; do not "
            "try other times that day."
        )
        lines.append(
            "Collect the patient's real full name and phone (for someone else, "
            "use that patient's details). If any phone digit is unclear or arrives "
            "cut off, read the full number back and confirm it. Read back doctor, "
            "date, exact time, name, and phone, then wait. Book only after a clear "
            "yes on the caller's next turn; ‘okay’, ‘sure’, silence, or a question "
            "is not consent. Never invent or alter details."
        )
        lines.append(
            "Book one appointment at a time. If a booking conflict is returned, "
            "the tool has already announced it: do not repeat the warning. Wait; "
            "only a clear yes on the caller's next turn permits retrying the same "
            "details with confirm=True. Otherwise offer another time."
        )
    else:
        unavailable = "You cannot book"
        if not handle_rescheduling:
            unavailable += ", cancel, or reschedule"
        lines.append(
            f"{unavailable} appointments. For a booking request, collect the name, phone, "
            "doctor, and date/time, then say a teammate will call to complete it. "
            "Do not claim it is booked."
        )

    if handle_rescheduling:
        lines.append("# Existing appointments")
        lines.append(
            "Before canceling or moving an appointment, look it up by phone and "
            "identify the exact doctor/date/time. For a move, check the new time "
            "is open. Read back the current appointment and (for a move) the new "
            "time; act only after a clear yes, then confirm the result. Conflict "
            "warnings are already spoken by the tool: do not repeat them. Wait; "
            "only a clear yes on the next turn permits retrying the same move with "
            "confirm=True. Otherwise offer another time."
        )
        lines.append(
            "You cannot transfer to a human; for actions you cannot complete, "
            "offer a teammate callback."
        )
    if ai.get("emergencyTransfer", False):
        lines.append(
            "Medical emergency: tell the caller to hang up and call emergency services."
        )

    lines.append("# Other requests")
    lines.append(
        "Do not confirm insurance coverage; offer to have a teammate check it. For "
        "prescriptions or medical advice, defer to a doctor/pharmacist and offer "
        "a callback. If asked about privacy, say their details are used to match "
        "records and stay within the clinic. With a frustrated caller, acknowledge "
        "and apologize even if it is not your fault, then address one concrete issue."
    )
    lines.append(
        "If no doctor preference, ask one brief question about the caller's need "
        "and recommend the most experienced suitable doctor (one recommendation, "
        "not a list); keep a doctor they already see. For multi-day questions use "
        "clinic hours and doctor schedules separately."
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
