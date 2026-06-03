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
from livekit.agents import function_tool

logger = logging.getLogger("aiva.tools")

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
    async def check_availability(doctor_name: str, date: str) -> str:
        """Check a doctor's open appointment slots on a specific date.

        `doctor_name` is the doctor the caller named. `date` MUST be an absolute
        calendar date in YYYY-MM-DD format — resolve relative phrases like
        "tomorrow" or "next Monday" to a real date before calling. Returns the
        open slot times; you cannot book them yet, only report availability.
        """
        data = await _get(config, "availability", {"doctorName": doctor_name, "date": date})
        if data is None:
            return "I couldn't check availability right now."
        if not data.get("resolved"):
            reason = data.get("reason")
            if reason == "ambiguous":
                names = ", ".join(data.get("candidates") or [])
                return f"There are a few matching doctors: {names}. Which one did you mean?"
            return f"I couldn't find a doctor named {doctor_name}."
        doctor = (data.get("doctor") or {}).get("name", doctor_name)
        slots = data.get("slots") or []
        total = data.get("totalSlots", len(slots))
        if not slots:
            return f"{doctor} has no open slots on {date}."
        shown = ", ".join(slots)
        more = f" (and {total - len(slots)} more)" if total > len(slots) else ""
        return f"{doctor} has these open times on {date}: {shown}{more}."

    @function_tool
    async def lookup_appointments(phone: str) -> str:
        """Look up the caller's upcoming appointments by the phone number they give.

        Ask the caller for the phone number their appointment is under, then pass
        it as `phone`. Returns their upcoming appointments. Read-only — you cannot
        change or cancel them yet.
        """
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

    return [list_doctors, check_availability, lookup_appointments]
