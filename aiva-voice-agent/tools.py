"""Aiva — Phase 3 read-only LLM tools.

Each tool is an async function the LLM can call mid-conversation. They do an
aiohttp GET to a read-only /api/voice/* endpoint (same x-webhook-secret auth as
Phase 2) and return a *compact, speakable string* — never raw JSON — so the LLM
can read the answer aloud directly.

Design notes:
  - `build_tools(config)` is a factory: it closes over the backend URL, clinic
    id, and secret so the decorated tools take only the args the LLM supplies.
  - Every tool is fail-soft: any network error or non-200 returns a friendly
    "couldn't look that up" string instead of raising, so one bad lookup never
    drops the call.
  - Per-tool timing is logged at INFO (`tool=… elapsed_ms=…`) to feed the
    deferred latency pass. We measure here; we do not optimize.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any

import aiohttp
from livekit.agents import RunContext, function_tool

logger = logging.getLogger("aiva.tools")


def _fmt_time_12h(hhmm: str) -> str:
    """Convert '14:30' → '2:30 PM' for spoken output."""
    try:
        h, m = (int(x) for x in hhmm.split(":"))
        suffix = "PM" if h >= 12 else "AM"
        h12 = h % 12 or 12
        return f"{h12}:{m:02d} {suffix}" if m else f"{h12} {suffix}"
    except Exception:
        return hhmm


def _say_filler(context: RunContext, text: str) -> None:
    """Speak a brief acknowledgement before a slow backend round-trip.

    Phase 5 bug #5: the availability/booking calls hit a geographically-distant
    DB (~4-5s warm), and without feedback the caller hears dead air and assumes
    the line dropped. We speak a short filler immediately so the wait is filled.
    Fire-and-forget (not awaited) and `add_to_chat_ctx=False` so it doesn't enter
    the LLM context or block the tool. Fail-soft: never let a filler break a call.
    """
    try:
        context.session.say(text, add_to_chat_ctx=False)
    except Exception as exc:  # noqa: BLE001 — a filler must never drop the call
        logger.debug("filler say failed (non-fatal): %s", exc)

# The clinic backend can sit a long way from the DB region; availability does
# several DB round-trips. 3s was too tight and made check_availability time out
# on every call. 8s tolerates a slow remote pooler while still bounding hangs.
_TIMEOUT_S = 8.0
_HEADER_SECRET = "x-webhook-secret"


@dataclass(frozen=True)
class ToolConfig:
    backend_url: str
    clinic_id: str
    webhook_secret: str
    on_booking: Any | None = None
    """Optional callback (appointment_id, patient_id) fired after a booking
    succeeds, so the call logger can link the resulting appointment/patient to the
    CallLog row. Called synchronously; fail-soft, exceptions are swallowed."""
    auto_book: bool = True
    """Whether this clinic lets the agent place new bookings (AiSettings.autoBook).
    When False, `book_appointment` is NOT exposed to the LLM."""
    handle_rescheduling: bool = False
    """Whether this clinic lets the agent reschedule/cancel (AiSettings.
    handleRescheduling). When False, `reschedule_appointment` and
    `cancel_appointment` are NOT exposed to the LLM."""
    conflict_acks: dict[str, list[str]] = field(
        default_factory=dict, compare=False, hash=False
    )
    """Per-call record of conflicts the agent has already been SHOWN, keyed by
    slot fingerprint -> the conflicting appointment ids. Phase 11b: the backend
    refuses a cross-doctor double-booking unless the agent echoes those ids, so a
    write can only happen after the warning was actually disclosed. A fresh
    ToolConfig is built per call, so this never leaks across callers."""


def _conflict_key(doctor_name: str, date: str, time: str, phone: str) -> str:
    """Fingerprint a requested slot so a conflict warning shown for it can be
    matched to a later confirmed retry (Phase 11b). Digits-only phone so
    punctuation/whitespace differences don't break the match."""
    digits = re.sub(r"\D", "", phone or "")
    return f"{(doctor_name or '').strip().lower()}|{date}|{time}|{digits}"


def _notify_booking(config: ToolConfig, appointment_id: str | None, patient_id: str | None) -> None:
    if config.on_booking is None:
        return
    try:
        config.on_booking(appointment_id, patient_id)
    except Exception as exc:  # noqa: BLE001 — never let linkage break a booking
        logger.warning("booking linkage callback failed: %s", exc)


async def _get(config: ToolConfig, path: str, params: dict[str, str]) -> dict[str, Any] | None:
    """GET {backend}/api/voice/{path}. Returns the `data` envelope, or None on any failure."""
    url = f"{config.backend_url.rstrip('/')}/api/voice/{path}"
    # connect sub-timeout so a dead/unreachable backend fails fast (3s) instead
    # of burning the full total as dead air mid-call.
    timeout = aiohttp.ClientTimeout(total=_TIMEOUT_S, connect=3.0)
    started = time.monotonic()
    try:
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                url,
                params={**params, "clinicId": config.clinic_id},
                headers={_HEADER_SECRET: config.webhook_secret},
            ) as resp:
                elapsed_ms = (time.monotonic() - started) * 1000
                if resp.status != 200:
                    body = await resp.text()
                    logger.warning(
                        "tool=%s status=%d elapsed_ms=%.0f body=%s",
                        path, resp.status, elapsed_ms, body[:200],
                    )
                    return None
                payload = await resp.json()
                logger.info("tool=%s status=200 elapsed_ms=%.0f", path, elapsed_ms)
    except Exception as exc:  # noqa: BLE001 — fail-soft, the call must continue
        elapsed_ms = (time.monotonic() - started) * 1000
        logger.warning("tool=%s error=%s elapsed_ms=%.0f", path, exc, elapsed_ms)
        return None

    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else None


# Write operations are replayed on a transient DB/pooler blip before we give up.
# Most transient failures clear within a second or two, so a short exponential
# backoff is enough — we do NOT park a booking in the reconciliation queue until
# every retry has been exhausted. The caller usually waits ≤ a few seconds here.
_WRITE_MAX_ATTEMPTS = 3
_WRITE_BACKOFF_FIRST_MS = 400


async def _post(config: ToolConfig, path: str, body: dict[str, Any]) -> dict[str, Any] | None:
    """POST {backend}/api/voice/{path} with a JSON body. Returns `data`, or None on failure.

    Used by write tools (booking). Same fail-soft + timing-log contract as _get,
    with two additions:
      1. Retry with exponential backoff on any failure (non-200 or exception) so a
         transient DB/pooler blip doesn't drop a confirmed booking.
      2. If every retry fails, persist the unresolved request to the backend's
         /failed-booking endpoint (best-effort) so it can be reconciled later
         instead of vanishing — important when the caller has already hung up.
    The clinicId is injected here so the LLM never has to supply it.
    """
    import asyncio

    url = f"{config.backend_url.rstrip('/')}/api/voice/{path}"
    timeout = aiohttp.ClientTimeout(total=_TIMEOUT_S, connect=3.0)
    last_status: int | None = None
    last_error: str | None = None

    for attempt in range(1, _WRITE_MAX_ATTEMPTS + 1):
        started = time.monotonic()
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    url,
                    json={**body, "clinicId": config.clinic_id},
                    headers={_HEADER_SECRET: config.webhook_secret},
                ) as resp:
                    elapsed_ms = (time.monotonic() - started) * 1000
                    if resp.status != 200:
                        text = await resp.text()
                        last_status = resp.status
                        logger.warning(
                            "tool=%s method=POST attempt=%d/%d status=%d elapsed_ms=%.0f body=%s",
                            path, attempt, _WRITE_MAX_ATTEMPTS, resp.status, elapsed_ms, text[:200],
                        )
                    else:
                        payload = await resp.json()
                        logger.info(
                            "tool=%s method=POST attempt=%d status=200 elapsed_ms=%.0f",
                            path, attempt, elapsed_ms,
                        )
                        data = payload.get("data") if isinstance(payload, dict) else None
                        return data if isinstance(data, dict) else None
        except asyncio.TimeoutError as exc:
            last_status = None
            last_error = str(exc)
            elapsed_ms = (time.monotonic() - started) * 1000
            logger.warning(
                "tool=%s method=POST attempt=%d/%d timeout elapsed_ms=%.0f",
                path, attempt, _WRITE_MAX_ATTEMPTS, elapsed_ms,
            )
        except Exception as exc:  # noqa: BLE001 — fail-soft, the call must continue
            last_status = None
            last_error = str(exc)
            elapsed_ms = (time.monotonic() - started) * 1000
            logger.warning(
                "tool=%s method=POST attempt=%d/%d error=%s elapsed_ms=%.0f",
                path, attempt, _WRITE_MAX_ATTEMPTS, exc, elapsed_ms,
            )

        if attempt < _WRITE_MAX_ATTEMPTS:
            delay = _WRITE_BACKOFF_FIRST_MS * 2 ** (attempt - 1) / 1000.0
            logger.info("tool=%s method=POST retrying in %.2fs", path, delay)
            await asyncio.sleep(delay)

    logger.warning(
        "tool=%s method=POST giving up after %d attempts — parking for reconciliation.",
        path, _WRITE_MAX_ATTEMPTS,
    )
    await _park_failed_booking(config, path, body, last_status, last_error)
    return None


async def _park_failed_booking(
    config: ToolConfig,
    path: str,
    body: dict[str, Any],
    last_status: int | None,
    last_error: str | None,
) -> None:
    """Best-effort: record an unresolvable write so it can be reconciled later.

    This must never raise — the call must continue regardless. The backend's
    /failed-booking endpoint writes to the `failed_booking` table; if even that
    fails, the failure is only logged locally (the offline case can't be parked
    anywhere durable).
    """
    action = {"book": "book", "cancel": "cancel", "reschedule": "reschedule"}.get(path, path)
    detail = f"status={last_status}" if last_status is not None else f"error={last_error}"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{config.backend_url.rstrip('/')}/api/voice/failed-booking",
                json={
                    "clinicId": config.clinic_id,
                    "action": action,
                    "payload": body,
                    "attempts": _WRITE_MAX_ATTEMPTS,
                    "error": detail,
                },
                headers={_HEADER_SECRET: config.webhook_secret},
                timeout=aiohttp.ClientTimeout(total=_TIMEOUT_S, connect=3.0),
            ) as resp:
                if resp.status != 200:
                    logger.warning(
                        "failed-booking park status=%d body=%s",
                        resp.status, (await resp.text())[:200],
                    )
                else:
                    logger.info("failed-booking parked action=%s", action)
    except Exception as exc:  # noqa: BLE001 — never let parking break the call
        logger.warning("failed-booking park failed (action=%s): %s", action, exc)


def build_tools(config: ToolConfig) -> list:
    """Return the list of LLM tools bound to this clinic's backend config."""

    @function_tool
    async def list_doctors(query: str = "") -> str:
        """List the clinic's doctors. `query` is the caller's search term (name or
        kind, e.g. "cardiologist"), or empty to list everyone."""
        params = {"q": query} if query.strip() else {}
        data = await _get(config, "doctors", params)
        if data is None:
            return "I couldn't look up the doctor list right now."
        doctors = data.get("doctors") or []
        if not doctors:
            return (
                f"No doctors matched '{query}'." if query.strip()
                else "There are no doctors on file."
            )
        parts = [
            f"{d['name']} ({d['specialization']})" if d.get("specialization") else d["name"]
            for d in doctors
        ]
        return "Doctors: " + "; ".join(parts) + "."

    @function_tool
    async def check_availability(
        context: RunContext,
        doctor_name: str,
        date: str,
        time: str = "",
        from_time: str = "",
        to_time: str = "",
    ) -> str:
        """Check a doctor's open slots on `date` (YYYY-MM-DD, clinic-local). If the
        caller named ONE time, pass it as `time` ("HH:mm", 24h, e.g. "16:30") to
        get whether it's open plus nearest alternatives. If they named a WINDOW
        ("between 4 and 5", "morning", "after 2"), pass its edges as
        `from_time`/`to_time` ("HH:mm", 24h; either may be empty for half-open) to
        get which slots inside are open plus the nearest outside each edge. Use at
        most ONE of `time` and the from/to pair. Read-only."""
        _say_filler(context, "Let me check that for you.")
        params = {"doctorName": doctor_name, "date": date}
        if time.strip():
            params["time"] = time.strip()
        elif from_time.strip() or to_time.strip():
            # Phase 10 window: forward the clinic-local edges only when the
            # caller named a WINDOW (mutually exclusive with a single `time`).
            if from_time.strip():
                params["from"] = from_time.strip()
            if to_time.strip():
                params["to"] = to_time.strip()
        data = await _get(config, "availability", params)
        if data is None:
            return "I couldn't check availability right now."
        if not data.get("resolved"):
            reason = data.get("reason")
            if reason == "ambiguous":
                names = ", ".join(data.get("candidates") or [])
                return f"There are a few matching doctors: {names}. Which one did you mean?"
            return f"I couldn't find a doctor named {doctor_name}."
        doctor = (data.get("doctor") or {}).get("name", doctor_name)

        # Time-specific path (Phase 5 #3/#4): answer about the requested time only.
        if data.get("requestedTime"):
            req = _fmt_time_12h(data["requestedTime"])
            if data.get("totalSlots", 0) == 0:
                return f"{doctor} has no open times on {date} at all."
            if data.get("requestedAvailable"):
                return f"Yes — {doctor} has {req} open on {date}."
            nearest = [_fmt_time_12h(t) for t in (data.get("nearest") or [])]
            if not nearest:
                return f"{doctor} doesn't have {req} open on {date}, and has no other times that day."
            return (
                f"{doctor} doesn't have {req} open on {date}. "
                f"The nearest open times are {', '.join(nearest)}. "
                "Would any of those work?"
            )

        # Phase 10: clinic-local WINDOW ("between 4 and 5", "morning"). Report the
        # slots open INSIDE the window, plus the nearest open slot just outside
        # each edge, so a caller who only knows roughly when they want can still
        # be offered a real near-neighbour time without the day being dumped.
        if data.get("window"):
            win = data["window"]
            edge = lambda t: _fmt_time_12h(t) if t else None
            inside = [_fmt_time_12h(t) for t in (data.get("openInWindow") or [])]
            if not inside:
                before, after = edge(data.get("nearestBefore")), edge(data.get("nearestAfter"))
                bits = [p for p in (before, after) if p]
                if not bits:
                    return f"{doctor} has no open times in that window on {date}."
                return (
                    f"{doctor} has nothing open between {edge(win.get('from')) or 'the start'} "
                    f"and {edge(win.get('to')) or 'the end'} on {date}. "
                    f"That window is fully closed."
                )
            shown = ", ".join(inside)
            before = data.get("nearestBefore")
            after = data.get("nearestAfter")
            extra = []
            if before:
                extra.append(f"closest before is {_fmt_time_12h(before)}")
            if after:
                extra.append(f"closest after is {_fmt_time_12h(after)}")
            suffix = (" — " + ", ".join(extra)) if extra else ""
            return (
                f"Between {edge(win.get('from')) or 'open of day'} and "
                f"{edge(win.get('to')) or 'end of day'} on {date}, {doctor} has "
                f"{shown} open{suffix}."
            )

        # No specific time asked: offer a few times and invite the caller to pick.
        slots = [_fmt_time_12h(t) for t in (data.get("slots") or [])]
        total = data.get("totalSlots", len(slots))
        if not slots:
            return f"{doctor} has no open slots on {date}."
        shown = ", ".join(slots[:4])
        more = f", and {total - 4} more" if total > 4 else ""
        return (
            f"{doctor} has openings on {date} — for example {shown}{more}. "
            "What time works best for you?"
        )

    @function_tool
    async def lookup_appointments(context: RunContext, phone: str) -> str:
        """Find the caller's upcoming appointments by `phone`. Use FIRST when they want
        to cancel or move one, so you have the exact doctor, date, and time.
        Read-only."""
        _say_filler(context, "Let me pull that up.")
        data = await _get(config, "appointments", {"phone": phone})
        if data is None:
            return "I couldn't look up appointments right now."
        if not data.get("found"):
            return f"I couldn't find any appointments under {phone}."
        appts = data.get("appointments") or []
        if not appts:
            return f"There are no upcoming appointments under {phone}."
        parts = [
            f"{a['patient']} with {a['doctor']} on {a['date']} at {a['time']} ({a['status']})"
            for a in appts
        ]
        more = " There are more beyond these." if data.get("hasMore") else ""
        return "Upcoming appointments: " + "; ".join(parts) + "." + more

    @function_tool
    async def book_appointment(
        context: RunContext,
        doctor_name: str,
        date: str,
        time: str,
        phone: str,
        patient_name: str = "",
        confirm: bool = False,
    ) -> str:
        """Book an appointment. WRITES. Call only after the slot is confirmed open, the
        caller gave their real full name + phone, and they said yes to a read-back.
        `date` YYYY-MM-DD, `time` "HH:mm" matching an open slot, `phone` the
        caller's number. If there is a conflict (same time already booked under a
        different doctor) this tool itself announces the warning: do not repeat it,
        do not re-call, and wait. Only if the caller then clearly says yes, call
        again with `confirm` True."""
        _say_filler(context, "Okay, booking that now.")
        # Safety net: reject empty / obviously fake phone numbers.
        digits = re.sub(r"\D", "", phone or "")
        if len(digits) < 7:
            return (
                "I need the caller's real phone number before I can book. "
                "Please ask them for their phone number."
            )
        key = _conflict_key(doctor_name, date, time, phone)
        body: dict[str, Any] = {
            "doctorName": doctor_name,
            "date": date,
            "time": time,
            "phone": phone,
            "confirm": bool(confirm),
        }
        # Phase 11b: echo the ids from a conflict we were shown earlier this call.
        # Only sent when the model actually asks to proceed (confirm=True), so a
        # premature confirm on the first call carries no ids and still gets refused.
        if confirm and key in config.conflict_acks:
            body["conflictAckIds"] = config.conflict_acks[key]
        if patient_name.strip():
            body["patientName"] = patient_name.strip()
        data = await _post(config, "book", body)
        if data is None:
            return "I couldn't complete the booking right now. A teammate will follow up."
        if data.get("booked"):
            config.conflict_acks.pop(key, None)
            appt = data.get("appointment") or {}
            who = appt.get("doctor", doctor_name)
            when_d = appt.get("date", date)
            when_t = appt.get("time", time)
            # Link the call log to the created/existing appointment + patient.
            _notify_booking(config, data.get("appointmentId"), data.get("patientId"))
            if data.get("idempotent"):
                return f"That's already booked — {who} on {when_d} at {when_t}."
            return f"Booked. You're set with {who} on {when_d} at {when_t}."
        reason = data.get("reason")
        if reason == "ambiguous":
            names = ", ".join(data.get("candidates") or [])
            return f"There are a few matching doctors: {names}. Which one did you mean?"
        if reason == "not_found":
            return f"I couldn't find a doctor named {doctor_name}."
        if reason == "conflict":
            # Same patient already has a same-time appointment with a different
            # doctor. Phase 11b: remember the ids we were shown (so a later
            # confirmed retry can prove the warning was disclosed), and SPEAK the
            # warning from here so it is heard even if the model stays silent.
            conflicts = data.get("conflicts") or []
            ids = [c["appointmentId"] for c in conflicts if c.get("appointmentId")]
            if ids:
                config.conflict_acks[key] = ids
            parts = [
                f"{c.get('doctor')} on {c.get('date')} at {c.get('time')}"
                for c in conflicts
            ]
            if parts:
                warning = (
                    f"Heads up — this name and number already have an appointment "
                    f"at that same time with {', '.join(parts)}. Are you booking "
                    "this one for someone else, and do you still want to go ahead?"
                )
            else:
                warning = (
                    f"It looks like {patient_name.strip() or 'this patient'} already "
                    "has an appointment at that time. Do you still want to book this one?"
                )
            _say_filler(context, warning)
            return (
                "I have just told the caller about the existing appointment and asked "
                "whether it's for someone else and whether they still want to go ahead. "
                "Do NOT repeat that warning and do NOT call book_appointment again — "
                "wait for their next reply."
            )
        if reason == "slot_taken":
            return "Sorry, that time was just taken. Would you like another time?"
        # slot_unavailable
        return f"{doctor_name} doesn't have {time} open on {date}. Want to pick another time?"

    @function_tool
    async def cancel_appointment(
        context: RunContext,
        doctor_name: str,
        date: str,
        time: str,
        phone: str,
    ) -> str:
        """Cancel one of the caller's appointments. WRITES. Call only after you looked
        it up, read it back, and the caller said yes. `date`/`time` are that
        appointment's date (YYYY-MM-DD) and time ("HH:mm"); `phone` the number
        it's under."""
        _say_filler(context, "Okay, let me cancel that.")
        data = await _post(
            config,
            "cancel",
            {"doctorName": doctor_name, "date": date, "time": time, "phone": phone},
        )
        if data is None:
            return "I couldn't cancel that right now. A teammate will follow up."
        if data.get("cancelled"):
            appt = data.get("appointment") or {}
            who = appt.get("doctor", doctor_name)
            when_d = appt.get("date", date)
            when_t = appt.get("time", time)
            return f"Done — your appointment with {who} on {when_d} at {when_t} is cancelled."
        reason = data.get("reason")
        if reason == "ambiguous":
            names = ", ".join(data.get("candidates") or [])
            return f"There are a few matching doctors: {names}. Which one did you mean?"
        if reason == "not_found":
            return (
                f"I couldn't find an appointment with {doctor_name} on {date} at {time} "
                f"under {phone}. Could you double-check those details?"
            )
        return "I couldn't cancel that one. Could you double-check the details?"

    @function_tool
    async def reschedule_appointment(
        context: RunContext,
        doctor_name: str,
        date: str,
        time: str,
        new_date: str,
        new_time: str,
        phone: str,
        confirm: bool = False,
    ) -> str:
        """Move one of the caller's appointments to a new time (same doctor). WRITES.
        Call only after you looked it up, confirmed the NEW time is open, read the
        move back, and the caller said yes. `date`/`time` are the CURRENT date
        (YYYY-MM-DD) and time ("HH:mm"); `new_date`/`new_time` the new ones;
        `phone` the number it's under. On a conflict (new time clashes with the
        caller's booking under a different doctor) this tool itself announces the
        warning: do not repeat it, do not re-call, and wait. Only if the caller then
        clearly says they want it anyway, call again with `confirm` True."""
        _say_filler(context, "Okay, let me move that for you.")
        key = _conflict_key(doctor_name, new_date, new_time, phone)
        body: dict[str, Any] = {
            "doctorName": doctor_name,
            "date": date,
            "time": time,
            "newDate": new_date,
            "newTime": new_time,
            "phone": phone,
            "confirm": bool(confirm),
        }
        # Phase 11b: echo the ids from a conflict we were shown earlier this call.
        if confirm and key in config.conflict_acks:
            body["conflictAckIds"] = config.conflict_acks[key]
        data = await _post(config, "reschedule", body)
        if data is None:
            return "I couldn't reschedule that right now. A teammate will follow up."
        if data.get("rescheduled"):
            config.conflict_acks.pop(key, None)
            appt = data.get("appointment") or {}
            who = appt.get("doctor", doctor_name)
            when_d = appt.get("date", new_date)
            when_t = appt.get("time", new_time)
            return f"Done — you're now booked with {who} on {when_d} at {when_t}."
        reason = data.get("reason")
        if reason == "ambiguous":
            names = ", ".join(data.get("candidates") or [])
            return f"There are a few matching doctors: {names}. Which one did you mean?"
        if reason == "not_found":
            return (
                f"I couldn't find an appointment with {doctor_name} on {date} at {time} "
                f"under {phone}. Could you double-check those details?"
            )
        if reason == "conflict":
            conflicts = data.get("conflicts") or []
            ids = [c["appointmentId"] for c in conflicts if c.get("appointmentId")]
            if ids:
                config.conflict_acks[key] = ids
            parts = [
                f"{c.get('doctor')} on {c.get('date')} at {c.get('time')}"
                for c in conflicts
            ]
            if parts:
                warning = (
                    "Heads up — that new time clashes with an appointment this "
                    f"number already has with {', '.join(parts)}. Do you still want "
                    "to move it there anyway, or pick a different time?"
                )
            else:
                warning = (
                    "That new time already overlaps another appointment under this "
                    "number. Do you still want to move it there?"
                )
            _say_filler(context, warning)
            return (
                "I have just told the caller about the clash and asked whether they "
                "still want to move it. Do NOT repeat that warning and do NOT call "
                "reschedule_appointment again — wait for their next reply."
            )
        if reason == "slot_taken":
            return f"Sorry, {new_time} on {new_date} was just taken. Want to pick another time?"
        # slot_unavailable
        return (
            f"{doctor_name} doesn't have {new_time} open on {new_date}. "
            "Want to pick another time?"
        )

    tools: list = [
        list_doctors,
        check_availability,
        lookup_appointments,
    ]
    if config.auto_book:
        tools.append(book_appointment)
    if config.handle_rescheduling:
        tools.append(cancel_appointment)
        tools.append(reschedule_appointment)
    return tools
