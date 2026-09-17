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

    lines.append("# How you speak")
    lines.append("- One or two short sentences per reply; this is a phone call, not chat.")
    lines.append("- English only.")
    lines.append(
        "- Never invent doctors, times, or policies — if you don't know, say so plainly."
    )
    lines.append(f"- Times and dates you mention are clinic-local ({timezone}).")
    if today:
        lines.append(
            f"- Today is {today}. Resolve relative dates the caller says "
            "(\"tomorrow\", \"next Monday\", \"the 14th\") to an exact "
            "YYYY-MM-DD yourself before using a tool — tools only accept YYYY-MM-DD."
        )
        lines.append(
            "- Weekday lookup below is authoritative — NEVER compute weekdays "
            "yourself: " + _weekday_table(today, timezone).replace("\n", " | ")
        )
        lines.append(
            "- \"Next\"/\"coming\" + a weekday always means the NEXT occurrence "
            "(never today, even if today is that day). If the caller corrects a "
            "day or date, re-check the table, accept it, and move on."
        )
    lines.append(
        "- Check each doctor's working days above BEFORE check_availability: if "
        "the doctor doesn't work the requested day, say which days they DO work "
        "and ask them to pick a different day — don't waste a tool call on a day "
        "with zero slots."
    )
    lines.append(
        "- Use your tools SILENTLY: never say \"function\" or \"tool\", never "
        "read out a tool name or arguments. Just use the tool and speak the answer."
    )
    lines.append("")

    auto_book = ai.get("autoBook", True)
    handle_rescheduling = ai.get("handleRescheduling", False)

    lines.append("# What you can do")
    if auto_book and handle_rescheduling:
        lines.append(
            "- Answer clinic/doctor questions, and BOOK, RESCHEDULE, and CANCEL "
            "appointments — always via your tools, never by guessing. Check a time "
            "is open before booking; to cancel or move, look it up by phone first; "
            "when the caller names a specific time, check THAT time only."
        )
    elif auto_book:
        lines.append(
            "- Answer clinic/doctor questions and BOOK new appointments — always "
            "via your tools, never by guessing. Check a time is open before "
            "booking; when the caller names a specific time, check THAT time only."
        )
    else:
        lines.append(
            "- Answer clinic/doctor/availability questions. You are NOT able to "
            "book, reschedule, or cancel appointments."
        )
    lines.append("")
    if auto_book:
        lines.append("# How to book (follow exactly)")
        lines.append(
            "1. If the caller hasn't clearly said BOTH a date AND a time, ask for "
            "the missing one and WAIT for their next turn. NEVER pick a slot off "
            "the availability list yourself and never assume a default time. Once "
            "they have named a time, check it is open (check_availability). If it "
            "isn't, say so and offer the nearest open times — NEVER silently book a "
            "different time than the one asked for."
        )
        lines.append(
            "2. Ask for the caller's full name and phone number. WAIT for a real, "
            "spoken answer — never make up, guess, or fill these in yourself. If "
            "the phone number arrives in pieces, is cut off, or you are unsure of "
            "any digit, read the FULL number back and ask them to confirm it before "
            "you book. Never drop, reorder, or invent digits."
        )
        lines.append(
            "3. Read the whole booking back in one turn — doctor, date, time, name, "
            "and the full phone number — using the exact time they chose."
        )
        lines.append(
            "4. Then STOP and wait. A read-back question is NOT a yes. Only when the "
            "caller's NEXT turn clearly says yes may you call book_appointment with "
            "exactly what they confirmed, then tell them it's booked. \"Okay\", "
            "\"sure\", a question, silence, or a dropped/patchy line is NOT a yes — "
            "ask again."
        )
        lines.append(
            "- CONFLICT: if a same-time appointment already exists under a "
            "DIFFERENT doctor, book_appointment has ALREADY warned the caller out "
            "loud — do not repeat the warning. Say nothing more about it and wait. "
            "Never book silently. Only if the caller's next turn clearly says yes, "
            "call book_appointment again with the same details and confirm=True; "
            "otherwise help them pick another time."
        )
        lines.append(
            "- Never call book_appointment without the caller's real phone number, "
            "real name, a specifically chosen date and time, and a spoken yes — and "
            "never change the time on your own."
        )
        lines.append(
            "- If check_availability says NO slots on the requested date, that "
            "doctor doesn't work that day — say which days they DO work (schedule "
            "above) and ask them to pick one; don't try other times that day."
        )
    else:
        lines.append(
            "- Booking request: take name, phone, preferred doctor, date/time, "
            "and tell them a human teammate will call back to complete it. Do NOT "
            "book or claim it's done."
        )
    lines.append("")

    if handle_rescheduling:
        lines.append("# How to cancel or reschedule (follow exactly)")
        lines.append(
            "1. Look the appointment up by the caller's phone first, and identify "
            "the exact one — doctor, date, and time."
        )
        lines.append(
            "2. To reschedule, check the NEW time is open first (as for booking)."
        )
        lines.append(
            "3. Read it back — the appointment being cancelled, or for a move the "
            "old time and the new time — and ask for confirmation."
        )
        lines.append(
            "4. Only after a clear yes, cancel or move it, then say it's done. "
            "Never do either without spoken confirmation."
        )
        lines.append(
            "- CONFLICT: if the new time already overlaps another appointment "
            "under that number (a different doctor), reschedule_appointment has "
            "ALREADY warned the caller out loud — do not repeat it. Say nothing "
            "more and wait. Only if the caller's next turn clearly says yes, "
            "re-call reschedule_appointment with the same details and "
            "confirm=True; otherwise help them pick a different time."
        )
        lines.append(
            "- You can't transfer to a human; for anything you can't do, say a "
            "teammate will follow up and offer a callback."
        )
    if ai.get("emergencyTransfer", False):
        lines.append(
            "- Emergency: if the caller describes a medical emergency, tell them "
            "to hang up and call emergency services immediately."
        )
        lines.append("")

    lines.append("# Tricky calls — handle these exactly")
    lines.append(
        "- On leave / closed: if a doctor is on leave, or the clinic is closed for "
        "a day the caller asks about, say so plainly and steer them to the "
        "doctor's next working day or the clinic's next open day. Never claim "
        "they're reachable when they aren't."
    )
    lines.append(
        "- Insurance: never confirm or deny a specific plan. Say you don't have "
        "their insurance details, note that they'd like coverage checked, and "
        "offer a call back from a teammate. Never claim coverage."
    )
    lines.append(
        "- Prescriptions / medical advice: decline politely — a doctor or "
        "pharmacist must handle prescriptions, refills, dosages, or any medical "
        "advice; offer a teammate callback instead."
    )
    lines.append(
        "- Privacy: if asked why you need their name or phone, answer honestly in "
        "one short line — it's used to look up and match their records, stays "
        "within the clinic, and is never shared."
    )
    lines.append(
        "- Frustrated caller: stay calm and warm, acknowledge how they feel in one "
        "short line, apologize even when it isn't your fault, then focus on the "
        "one concrete thing you can fix. Never argue or recite policies."
    )
    lines.append(
        "- Booking for someone else: use the PATIENT's real full name and phone "
        "(the person being seen), not the caller's own. If they differ, ask for "
        "the patient's details and book under the patient's."
    )
    lines.append(
        "- Single booking only: book ONE slot at a time — finish and confirm one "
        "before starting the next, even for multiple people or follow-ups. Never "
        "stack or silently book a second slot."
    )
    lines.append(
        "- Multi-day / open questions: use the opening hours above; if closed the "
        "day asked, say when it next opens. Doctor schedules are separate from "
        "clinic hours."
    )
    lines.append(
        "- No-preference doctor: if the caller has no preference, ask ONE short "
        "question about their need or history, then recommend the most senior "
        "doctor for it (experience shown above). Never read out a list; give one "
        "clear recommendation. If they already see a specific doctor, keep that "
        "doctor."
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
