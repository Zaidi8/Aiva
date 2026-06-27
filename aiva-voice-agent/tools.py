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
import time
from dataclasses import dataclass
from typing import Any

import aiohttp
from livekit.agents import RunContext, function_tool

logger = logging.getLogger("aiva.tools")


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


async def _post(config: ToolConfig, path: str, body: dict[str, Any]) -> dict[str, Any] | None:
    """POST {backend}/api/voice/{path} with a JSON body. Returns `data`, or None on failure.

    Used by write tools (booking). Same fail-soft + timing-log contract as _get.
    The clinicId is injected here so the LLM never has to supply it.
    """
    url = f"{config.backend_url.rstrip('/')}/api/voice/{path}"
    timeout = aiohttp.ClientTimeout(total=_TIMEOUT_S, connect=3.0)
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
                    logger.warning(
                        "tool=%s method=POST status=%d elapsed_ms=%.0f body=%s",
                        path, resp.status, elapsed_ms, text[:200],
                    )
                    return None
                payload = await resp.json()
                logger.info("tool=%s method=POST status=200 elapsed_ms=%.0f", path, elapsed_ms)
    except Exception as exc:  # noqa: BLE001 — fail-soft, the call must continue
        elapsed_ms = (time.monotonic() - started) * 1000
        logger.warning("tool=%s method=POST error=%s elapsed_ms=%.0f", path, exc, elapsed_ms)
        return None

    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else None


def build_tools(config: ToolConfig) -> list:
    """Return the list of LLM tools bound to this clinic's backend config."""

    @function_tool
    async def list_doctors(query: str = "") -> str:
        """List the clinic's doctors, optionally filtered by name or specialization.

        Use this when the caller asks which doctors are available, or asks for a
        specific kind of doctor (e.g. "do you have a cardiologist?"). Pass the
        caller's search term as `query`, or leave it empty to list everyone.
        """
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
        context: RunContext, doctor_name: str, date: str, time: str = ""
    ) -> str:
        """Check a doctor's open appointment slots on a specific date.

        `doctor_name` is the doctor the caller named. `date` MUST be an absolute
        calendar date in YYYY-MM-DD format — resolve relative phrases like
        "tomorrow" or "next Monday" to a real date before calling.

        If the caller named a specific time, ALWAYS pass it as `time` in 24-hour
        "HH:mm" (e.g. "16:30" for 4:30pm). When you do, this reports whether THAT
        exact time is open plus the nearest alternatives — so you can offer the
        time they actually asked for instead of listing the whole day. Leave
        `time` empty only if the caller hasn't named a time yet.

        Read-only — you cannot book here, only report availability.
        """
        _say_filler(context, "Let me check that for you.")
        params = {"doctorName": doctor_name, "date": date}
        if time.strip():
            params["time"] = time.strip()
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
            req = data["requestedTime"]
            if data.get("totalSlots", 0) == 0:
                return f"{doctor} has no open times on {date} at all."
            if data.get("requestedAvailable"):
                return f"Yes — {doctor} has {req} open on {date}."
            nearest = data.get("nearest") or []
            if not nearest:
                return f"{doctor} doesn't have {req} open on {date}, and has no other times that day."
            return (
                f"{doctor} doesn't have {req} open on {date}. "
                f"The nearest open times are {', '.join(nearest)}. "
                "Would any of those work?"
            )

        # No specific time asked: offer a few times and invite the caller to pick.
        slots = data.get("slots") or []
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
        """Look up the caller's upcoming appointments by the phone number they give.

        Ask the caller for the phone number their appointment is under, then pass
        it as `phone`. Returns their upcoming appointments. Read-only — you cannot
        change or cancel them yet.
        """
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
    ) -> str:
        """Book an appointment for the caller. WRITES to the clinic's records.

        ONLY call this AFTER you have (1) confirmed an open slot with
        check_availability, (2) read the full booking back to the caller — doctor,
        date, time, and name — and (3) gotten a clear spoken "yes". Do not call it
        speculatively.

        Args:
          doctor_name: the doctor the caller chose.
          date: absolute calendar date, YYYY-MM-DD (resolve "tomorrow" etc first).
          time: 24-hour "HH:mm" matching one of the open slots you offered.
          phone: the caller's phone number for the booking.
          patient_name: the caller's full name. Required for a first-time caller;
            pass it whenever you have it.
        """
        _say_filler(context, "Okay, booking that now.")
        body: dict[str, Any] = {
            "doctorName": doctor_name,
            "date": date,
            "time": time,
            "phone": phone,
        }
        if patient_name.strip():
            body["patientName"] = patient_name.strip()
        data = await _post(config, "book", body)
        if data is None:
            return "I couldn't complete the booking right now. A teammate will follow up."
        if data.get("booked"):
            appt = data.get("appointment") or {}
            who = appt.get("doctor", doctor_name)
            when_d = appt.get("date", date)
            when_t = appt.get("time", time)
            if data.get("idempotent"):
                return f"That's already booked — {who} on {when_d} at {when_t}."
            return f"Booked. You're set with {who} on {when_d} at {when_t}."
        reason = data.get("reason")
        if reason == "ambiguous":
            names = ", ".join(data.get("candidates") or [])
            return f"There are a few matching doctors: {names}. Which one did you mean?"
        if reason == "not_found":
            return f"I couldn't find a doctor named {doctor_name}."
        if reason == "slot_taken":
            return "Sorry, that time was just taken. Would you like another time?"
        # slot_unavailable
        return f"{doctor_name} doesn't have {time} open on {date}. Want to pick another time?"

    return [list_doctors, check_availability, lookup_appointments, book_appointment]
