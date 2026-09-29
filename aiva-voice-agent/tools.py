"""Aiva — read + write LLM tools.

Each tool is an async function the LLM can call mid-conversation. They do an
aiohttp GET/POST to a /api/voice/* endpoint (same x-webhook-secret auth as the
clinic-context fetch) and return a *compact, speakable string* — never raw JSON —
so the LLM can read the answer aloud directly.

Design notes:
  - `build_tools(config)` is a factory: it closes over the backend URL, clinic
    id, and secret so the decorated tools take only the args the LLM supplies.
  - Every tool is fail-soft: any network error or non-200 returns a friendly
    "couldn't look that up" string instead of raising, so one bad lookup never
    drops the call.
  - Per-tool timing is logged at INFO (`tool=… elapsed_ms=…`) to feed the
    deferred latency pass. We measure here; we do not optimize.
  - Human escalation is deterministic, not model-gated: once `config.escalated`
    latches, every tool short-circuits with StopResponse, so the LLM can never
    keep booking after handoff was requested (same reasoning as
    `conflict_refused` — see its docstring).
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import aiohttp
from livekit.agents import RunContext, StopResponse, function_tool

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


def _say_filler(context: RunContext, text: str, *, add_to_chat_ctx: bool = False) -> None:
    """Speak a brief acknowledgement before a slow backend round-trip.

    Phase 5 bug #5: the availability/booking calls hit a geographically-distant
    DB (~4-5s warm), and without feedback the caller hears dead air and assumes
    the line dropped. We speak a short filler immediately so the wait is filled.
    Fire-and-forget (not awaited) so it doesn't block the tool. Fail-soft: never
    let a filler break a call.

    `add_to_chat_ctx=True` (used for conflict warnings) ALSO inserts the line as
    an assistant message in the LLM context + persisted transcript, so the exact
    warning the caller heard is shown on the AI Receptionist page and the model
    (including a mid-turn fallback model) sees precisely what was said.
    """
    try:
        context.session.say(text, add_to_chat_ctx=add_to_chat_ctx)
    except Exception as exc:  # noqa: BLE001 — a filler must never drop the call
        logger.debug("filler say failed (non-fatal): %s", exc)

# The clinic backend can sit a long way from the DB region; availability does
# several DB round-trips. 3s was too tight and made check_availability time out
# on every call. 8s tolerates a slow remote pooler while still bounding hangs.
_TIMEOUT_S = 8.0
_HEADER_SECRET = "x-webhook-secret"

# Spoken once, by us, the moment the agent decides to hand the call over. Kept
# in the agent's own voice (add_to_chat_ctx) so the exact line the caller heard
# is what the LLM sees afterwards and what lands in the persisted transcript.
# Deliberately does NOT promise a call-back: a colleague is joining THIS call.
_HANDOFF_LINE = (
    "Let me get a colleague to take over for you — hang on a moment."
)
# Used when the backend declines to record the escalation (clinic has the
# feature switched off). The agent still stops taking bookings — it has already
# committed to handing off — but the promise is a call-back, which is the most
# the clinic can honour.
_HANDOFF_LINE_UNAVAILABLE = (
    "Let me get a colleague to call you back about this as soon as they can."
)

# How many consecutive soft failures of the same scheduling tool before the
# agent escalates on its own. Two is the smallest number that is clearly not
# "the caller asked for a slightly different time" — that is a single
# not_found/slot_unavailable and is answered conversationally, not escalated.
# Three felt too patient for a caller already frustrated enough to ask twice.
_FAILURE_STREAK_LIMIT = 2

# The EscalationReason values the backend accepts (Prisma enum member names).
_ESCALATION_REASONS = {
    "caller_request": "CallerRequested",
    "tool_failure_streak": "ToolFailureStreak",
    "failed_booking": "FailedBooking",
    "emergency": "Emergency",
}


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
    `cancel_appointment` are NOT exposed to the LLM, and the agent never
    auto-escalates."""
    escalate_to_human: bool = True
    """Whether this clinic accepts human escalations (AiSettings.escalateToHuman).
    When False, `escalate_to_human` is NOT exposed to the LLM and the
    deterministic triggers (repeated tool failures, a parked booking) stay
    dormant — the agent keeps handling the call itself."""
    room_name: str = ""
    """The LiveKit room this call is running in. Sent with the escalation so
    staff can be issued a join token for exactly this room. A fresh
    ToolConfig is built per call, so it never leaks across callers."""
    provider_call_id: str = ""
    """The provider's id for this call (SIP call-id, else the room name). The
    backend correlates the escalation to the CallLog row by this, the same key
    the rest of the call lifecycle uses — so the AI Receptionist page badges the
    exact call the caller is still on."""
    escalated: bool = False
    """Latches True the first time this call is handed to a human — whether by
    the model's escalate_to_human call, two consecutive scheduling-tool
    failures, or a write that exhausted its retries and got parked.

    Same reasoning as `conflict_refused`: after handoff the agent must not keep
    working the call. Every tool calls `_guard_handoff` first and raises
    StopResponse, so the model cannot book/cancel/look anything up after it has
    asked for a human. A frozen dataclass can't rebind the flag, so it is
    swapped via object.__setattr__ in `_escalate` (same trick the framework's
    own per-call config relies on for its mutable state)."""
    fail_streak: dict[str, int] = field(
        default_factory=dict, compare=False, hash=False
    )
    """Consecutive soft failures per scheduling tool, cleared on any success.
    At _FAILURE_STREAK_LIMIT the agent escalates WITHOUT asking the model —
    a fallback LLM mid-conversation is exactly the wrong thing to trust with a
    decision to give up on a caller."""
    conflict_refused: set[str] = field(
        default_factory=set, compare=False, hash=False
    )
    """Slot fingerprints (see _conflict_key) that have been DISCLOSED to the caller
    as conflicting, keyed for the remainder of the call. Once a slot is refused,
    no confirm=True retry can ever write it again.

    ROOT CAUSE FIX (auto-book): the old Phase 11b design let the agent authorize a
    cross-doctor double-booking by echoing back the conflicting appointment ids it
    had been shown. That proof is replayable by the MODEL ALONE: the ids sit in
    the chat context, so the LLM (or a weak mid-turn fallback model after a Groq
    429 failover, see prod log 2026-09-26 00:36) can confabulate a patient "yes,
    book it anyway" in its own voice and re-call the tool with confirm=True,
    making the write go through with no real caller input. A per-turn gate cannot
    stop this reliably (any later user turn, even "huh?", resets the turn id).

    Instead we REMOVE the ack-echo capability entirely: a conflicted slot is
    simply not writable on this call, deterministically, no matter what the model
    does. Different-patient bookings are unaffected (they get a different phone ->
    different fingerprint -> no conflict). Confabulated retries bounce off a cheap
    local short-circuit instead of the backend. A fresh ToolConfig is built per
    call, so this never leaks across callers."""


def _conflict_key(doctor_name: str, date: str, time: str, phone: str) -> str:
    """Fingerprint a requested slot so a conflict disclosed for it can be matched
    to later retries and refused for the rest of the call. Digits-only phone so
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


async def _post(
    config: ToolConfig,
    path: str,
    body: dict[str, Any],
    context: RunContext | None = None,
) -> dict[str, Any] | None:
    """POST {backend}/api/voice/{path} with a JSON body. Returns `data`, or None on failure.

    Used by write tools (booking). Same fail-soft + timing-log contract as _get,
    with two additions:
      1. Retry with exponential backoff on any failure (non-200 or exception) so a
         transient DB/pooler blip doesn't drop a confirmed booking.
      2. If every retry fails, persist the unresolved request to the backend's
         /failed-booking endpoint (best-effort) so it can be reconciled later
         instead of vanishing — important when the caller has already hung up.
         Parking also escalates the live call, because a booking the caller was
         just promised is exactly what a human should finish by hand; that needs
         `context` to speak, hence the optional argument.
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
    await _park_failed_booking(config, path, body, last_status, last_error, context)
    return None


async def _park_failed_booking(
    config: ToolConfig,
    path: str,
    body: dict[str, Any],
    last_status: int | None,
    last_error: str | None,
    context: RunContext | None = None,
) -> None:
    """Best-effort: record an unresolvable write so it can be reconciled later.

    This must never raise — the call must continue regardless. The backend's
    /failed-booking endpoint writes to the `failed_booking` table; if even that
    fails, the failure is only logged locally (the offline case can't be parked
    anywhere durable).

    A successfully parked write is ALSO escalated: the caller is still on the
    line having been told their appointment is being made, and the thing they
    were promised cannot be made by an agent at this clinic right now. That is
    the definition of "get a human", so the parked call is flagged for the AI
    Receptionist page instead of quietly dying. Escalation last, and only if
    parking worked, so a clinic whose backend is fully down doesn't get flagged
    for a call it can also do nothing about.
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
                    return
                logger.info("failed-booking parked action=%s", action)
    except Exception as exc:  # noqa: BLE001 — never let parking break the call
        logger.warning("failed-booking park failed (action=%s): %s", action, exc)
        return

    if context is not None and config.escalate_to_human:
        # The write the caller was promised could not be made. A human finishes
        # it; the agent stops working the call.
        await _escalate(
            config,
            context,
            "failed_booking",
            f"{action} could not be saved after {_WRITE_MAX_ATTEMPTS} attempts ({detail})",
        )


# ── Human escalation ───────────────────────────────────────────────────────────
# Three triggers, one funnel:
#   1. the MODEL decides (caller asked for a person / an emergency), via the
#      escalate_to_human tool;
#   2. two consecutive scheduling-tool soft failures — the agent gives up on
#      handling it alone, WITHOUT asking the model (a mid-conversation fallback
#      LLM is the last thing we want deciding to abandon a caller);
#   3. a write that exhausted _WRITE_MAX_ATTEMPTS and got parked — the booking
#      the caller was promised cannot be made by an agent at this clinic.
# All three end in _escalate(), which latches, tells the backend, speaks one
# line, and raises StopResponse. After that the agent is out of the conversation.


def _guard_handoff(config: ToolConfig) -> None:
    """Refuse all further tool work once this call has been handed to a human.

    Every tool calls this first. Without it the model could keep "helpfully"
    booking after a colleague was already on the line — the exact class of
    double-handling `conflict_refused` exists to prevent. StopResponse ends the
    turn with no LLM generation, so the model never gets a chance to talk over
    the human.
    """
    if config.escalated:
        raise StopResponse()


async def _escalate(
    config: ToolConfig,
    context: RunContext,
    reason_key: str,
    detail: str,
) -> None:
    """Hand this call to a human. Latches, records, speaks one line, stops the turn.

    Never raises (except StopResponse, which is the point) and never returns to
    its caller — it always ends the turn.

    `reason_key` maps through _ESCALATION_REASONS to the backend's Prisma enum.
    If the clinic has escalation switched off the backend answers
    `{escalated: false}` and the LATCH STILL SETS: the agent has already told
    the caller a colleague is coming, so it must not go back to booking. It just
    promises a call-back instead of a hand-over, which is all such a clinic can
    honour.
    """
    if config.escalated:
        # Second trigger fired after the first already handed off. Do not
        # re-notify staff (and do not speak a second line over the first).
        raise StopResponse()

    # Latch FIRST, before the network call. A slow/unreachable backend must not
    # let the model retry the tool and escalate twice.
    object.__setattr__(config, "escalated", True)
    reason = _ESCALATION_REASONS[reason_key]
    detail = (detail or "").strip()[:500]
    logger.info(
        "escalating to human reason=%s detail=%s room=%s", reason, detail, config.room_name
    )

    recorded = False
    try:
        # Single attempt, no retry: escalating twice would double-badge the call,
        # and the unique callLogId index means a retry cannot help anyway.
        url = f"{config.backend_url.rstrip('/')}/api/voice/escalate"
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=_TIMEOUT_S, connect=3.0)
        ) as session:
            async with session.post(
                url,
                json={
                    "clinicId": config.clinic_id,
                    # Deterministic per call + reason: a retried POST (or a retry
                    # after a network blip) is deduped by the backend's
                    # WebhookEvent idempotency instead of erroring.
                    "eventId": f"{config.provider_call_id}.escalate.{reason_key}",
                    "providerCallId": config.provider_call_id,
                    "reason": reason,
                    "detail": detail,
                    "roomName": config.room_name,
                    "at": datetime.now(timezone.utc).isoformat(),
                },
                headers={_HEADER_SECRET: config.webhook_secret},
            ) as resp:
                body = await resp.text()
                if resp.status == 200:
                    try:
                        recorded = bool((json.loads(body).get("data") or {}).get("escalated"))
                    except (ValueError, AttributeError):
                        recorded = True  # 200 — treat as recorded
                else:
                    logger.warning(
                        "escalation webhook status=%d body=%s", resp.status, body[:200]
                    )
    except Exception as exc:  # noqa: BLE001 — the handoff line still goes out
        logger.warning("escalation webhook failed (non-fatal): %s", exc)

    # Speak from here rather than returning text, so the caller hears it even if
    # the model (or a fallback model) would have said nothing, and the exact line
    # is persisted in the transcript.
    _say_filler(context, _HANDOFF_LINE if recorded else _HANDOFF_LINE_UNAVAILABLE,
                add_to_chat_ctx=True)
    # StopResponse: the turn ends here. No LLM generation, no second sentence, no
    # "actually, is 4:30 ok?" after we promised a colleague. From now on
    # _guard_handoff bounces every tool.
    raise StopResponse()


async def _note_tool_result(
    config: ToolConfig,
    context: RunContext,
    key: str,
    succeeded: bool,
) -> None:
    """Track consecutive scheduling-tool soft failures; escalate at the limit.

    `succeeded=False` means the tool hit a *soft* failure — a timeout, a 5xx, an
    unresolved doctor, no open slots. Those are the ones that mean "the agent
    can't do this for you right now", which is exactly when a human should take
    over. A caller simply not finding a suitable slot is NOT a failure: that
    path reports a successful lookup, so the streak only builds when the backend
    is actually misbehaving.
    """
    if not config.escalate_to_human:
        return
    if succeeded:
        config.fail_streak.pop(key, None)
        return
    streak = config.fail_streak.get(key, 0) + 1
    config.fail_streak[key] = streak
    logger.info("tool=%s soft-failure streak=%d/%d", key, streak, _FAILURE_STREAK_LIMIT)
    if streak >= _FAILURE_STREAK_LIMIT:
        await _escalate(
            config,
            context,
            "tool_failure_streak",
            f"{key} failed {streak} times in a row",
        )


def build_tools(config: ToolConfig) -> list:
    """Return the list of LLM tools bound to this clinic's backend config."""

    @function_tool
    async def list_doctors(query: str = "") -> str:
        """List the clinic's doctors. `query` is the caller's search term (name or
        kind, e.g. "cardiologist"), or empty to list everyone."""
        _guard_handoff(config)
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
        _guard_handoff(config)
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
            await _note_tool_result(config, context, "check_availability", False)
            return "I couldn't check availability right now."
        if not data.get("resolved"):
            await _note_tool_result(config, context, "check_availability", False)
            reason = data.get("reason")
            if reason == "ambiguous":
                names = ", ".join(data.get("candidates") or [])
                return f"There are a few matching doctors: {names}. Which one did you mean?"
            return f"I couldn't find a doctor named {doctor_name}."
        # A resolved lookup — including "no open slots" — is a working backend
        # answering correctly, so it clears any failure streak.
        await _note_tool_result(config, context, "check_availability", True)
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
        _guard_handoff(config)
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
        caller's number. If the caller attempts a time that is already booked for
        the SAME name and number (a different doctor's slot), this tool announces
        the clash and REFUSES the write — a conflicted booking can never be made on
        this call, regardless of `confirm`. Do not re-call after a clash; wait for
        the caller's reply (they can pick another time)."""
        _guard_handoff(config)
        _say_filler(context, "Okay, booking that now.")
        # Safety net: reject empty / obviously fake phone numbers.
        digits = re.sub(r"\D", "", phone or "")
        if len(digits) < 7:
            return (
                "I need the caller's real phone number before I can book. "
                "Please ask them for their phone number."
            )
        key = _conflict_key(doctor_name, date, time, phone)
        # Deterministic auto-book kill: once this slot was disclosed to the caller
        # as conflicting, no confirm=True retry can EVER write it on this call. The
        # model cannot authorize a cross-doctor double-booking by re-echoing ids —
        # the ack capability is gone. Different patients (different phone -> other
        # key) are unaffected. This also makes a confabulated retry loop cheap:
        # repeated confirms bounce here with a stable refusal instead of hitting
        # the backend.
        if bool(confirm) and key in config.conflict_refused:
            # StopResponse: the agent must NOT generate any further text after a
            # refused conflicted booking. This is what makes a confabulated
            # confirm harmless end-to-end — the LLM never gets a turn to invent a
            # "yes, book it anyway" line; the turn simply ends and we wait for the
            # caller. The disclosure warning was already spoken + persisted.
            raise StopResponse()
        body: dict[str, Any] = {
            "doctorName": doctor_name,
            "date": date,
            "time": time,
            "phone": phone,
            "confirm": bool(confirm),
        }
        if patient_name.strip():
            body["patientName"] = patient_name.strip()
        data = await _post(config, "book", body, context)
        if data is None:
            # _post already parked the write and escalated (which raised
            # StopResponse) when escalation is on. Reached only when the clinic
            # has it off — the caller still gets the "someone will call" line.
            return "I couldn't complete the booking right now. A teammate will follow up."
        if data.get("booked"):
            await _note_tool_result(config, context, "book_appointment", True)
            config.conflict_refused.discard(key)
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
            await _note_tool_result(config, context, "book_appointment", False)
            return f"There are a few matching doctors: {names}. Which one did you mean?"
        if reason == "not_found":
            await _note_tool_result(config, context, "book_appointment", False)
            return f"I couldn't find a doctor named {doctor_name}."
        if reason == "conflict":
            # Same patient already has a same-time appointment with a different
            # doctor. Flag the slot as unwritable for the rest of the call and
            # SPEAK the warning from here so it is heard even if the model stays
            # silent. The caller can still legitimately redirect (different phone
            # -> different fingerprint), but this slot can no longer be booked —
            # not by re-echoing ids, not by any confirm, not by a fallback model.
            config.conflict_refused.add(key)
            conflicts = data.get("conflicts") or []
            parts = [
                f"{c.get('doctor')} on {c.get('date')} at {c.get('time')}"
                for c in conflicts
            ]
            if parts:
                warning = (
                    f"Heads up — this name and number already have an appointment "
                    f"at that same time with {', '.join(parts)}. This booking "
                    "cannot be made on this call — a teammate will call back to "
                    "sort it out. Is there another time that works, or is this for "
                    "someone else?"
                )
            else:
                warning = (
                    f"It looks like {patient_name.strip() or 'this patient'} already "
                    "has an appointment at that time. This booking can't be made on "
                    "this call — a teammate will call back to sort it out."
                )
            _say_filler(context, warning, add_to_chat_ctx=True)
            # StopResponse: after announcing the clash in the agent's own voice,
            # END the turn with no further LLM generation. The model never gets to
            # confabulate a patient "yes, book it anyway" (prod log 2026-09-26
            # 00:36: the model literally said both sides of the exchange). The
            # caller hears the heads-up, the agent falls silent and waits.
            raise StopResponse()
        if reason == "slot_taken":
            await _note_tool_result(config, context, "book_appointment", True)
            return "Sorry, that time was just taken. Would you like another time?"
        # slot_unavailable
        await _note_tool_result(config, context, "book_appointment", True)
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
        _guard_handoff(config)
        _say_filler(context, "Okay, let me cancel that.")
        data = await _post(
            config,
            "cancel",
            {"doctorName": doctor_name, "date": date, "time": time, "phone": phone},
            context,
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
        `phone` the number it's under. If the new time clashes with the caller's
        booking under a different doctor, this tool announces the clash and REFUSES
        the move — a clashing move can never be made on this call, regardless of
        `confirm`. Do not re-call after a clash; wait for the caller's reply."""
        _guard_handoff(config)
        _say_filler(context, "Okay, let me move that for you.")
        key = _conflict_key(doctor_name, new_date, new_time, phone)
        # Deterministic auto-book kill, same as book_appointment: a target slot
        # disclosed as clashing is unwritable for the rest of the call.
        if bool(confirm) and key in config.conflict_refused:
            # StopResponse — see book_appointment: never let the model spin out
            # more text (or another tool call) after a refused clash.
            raise StopResponse()
        body: dict[str, Any] = {
            "doctorName": doctor_name,
            "date": date,
            "time": time,
            "newDate": new_date,
            "newTime": new_time,
            "phone": phone,
            "confirm": bool(confirm),
        }
        data = await _post(config, "reschedule", body, context)
        if data is None:
            return "I couldn't reschedule that right now. A teammate will follow up."
        if data.get("rescheduled"):
            config.conflict_refused.discard(key)
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
            config.conflict_refused.add(key)
            conflicts = data.get("conflicts") or []
            parts = [
                f"{c.get('doctor')} on {c.get('date')} at {c.get('time')}"
                for c in conflicts
            ]
            if parts:
                warning = (
                    "Heads up — that new time clashes with an appointment this "
                    f"number already has with {', '.join(parts)}. It can't be moved "
                    "there on this call — a teammate will call back to sort it out. "
                    "Would you like to pick a different time?"
                )
            else:
                warning = (
                    "That new time already overlaps another appointment under this "
                    "number. It can't be moved there on this call — a teammate will "
                    "call back to sort it out."
                )
            _say_filler(context, warning, add_to_chat_ctx=True)
            # StopResponse — end the turn after announcing the clash; the model
            # must not get to fabricate consent or re-call.
            raise StopResponse()
        if reason == "slot_taken":
            return f"Sorry, {new_time} on {new_date} was just taken. Want to pick another time?"
        # slot_unavailable
        return (
            f"{doctor_name} doesn't have {new_time} open on {new_date}. "
            "Want to pick another time?"
        )

    @function_tool
    async def escalate_to_human(context: RunContext, reason: str = "caller_request") -> str:
        """Hand the caller to a human colleague, on THIS call. Call this ONLY when:
          - `reason` is "caller_request": the caller asked for a person ("let me
            talk to a human", "are you a bot?", "I want to complain").
          - `reason` is "emergency": the caller describes a medical emergency or
            is in distress (chest pain, can't breathe, bleeding, a fall, feels
            unsafe). Pass anything else only if you are unsure — prefer
            "caller_request".
        A colleague is alerted and joins the call, so do NOT say goodbye, do NOT
        promise a call-back, and do not offer to keep looking things up. After
        calling this the call is over as far as you are concerned: the handoff
        message is spoken for you and your turn ends.
        """
        key = "emergency" if str(reason).strip().lower() == "emergency" else "caller_request"
        detail = (
            "caller described a medical emergency"
            if key == "emergency"
            else "caller asked for a person"
        )
        # Never returns — _escalate speaks the handoff line and raises
        # StopResponse, so the model cannot add a farewell on top of it.
        await _escalate(config, context, key, detail)

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
    if config.escalate_to_human:
        # Not exposed when the clinic has escalation off, so the model cannot
        # even ask for a hand-off the backend would refuse. The deterministic
        # triggers inside _note_tool_result / _park_failed_booking are gated on
        # the same flag.
        tools.append(escalate_to_human)
    return tools
