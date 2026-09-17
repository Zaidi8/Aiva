"""Aiva — Phase 2 voice agent (live clinic knowledge).

A LiveKit Agents worker that wires:
  - Silero VAD
  - LiveKit turn-detector (English)
  - Groq Whisper Large v3 Turbo (STT)
  - Groq qwen/qwen3.8-27b (LLM) with openai/gpt-oss-120b mid-turn 429 fallback
  - ElevenLabs TTS (Sarah)

Phase 2 adds: per-call clinic-context fetch from the Next.js app, rendered
into the system prompt + greeting. On fetch failure we fall back to a safe
"sorry, we'll call you back" prompt rather than dropping the call.

Run with:
    python agent.py dev
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def _utc_iso_z() -> str:
    """Current UTC time as an ISO string ending in 'Z'.

    The backend zod schemas use `z.string().datetime()`, which REJECTS the
    Python-default '+00:00' offset (returns 400 → the CallLog write silently
    fails while the call still proceeds). A trailing 'Z' passes validation."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

from typing import AsyncIterable, Callable

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    APIError,
    JobContext,
    JobProcess,
    ModelSettings,
    WorkerOptions,
    cli,
)
from livekit.agents.llm import ChatChunk, ChatContext, FallbackAdapter
from livekit.plugins import elevenlabs, groq, silero
from livekit.plugins.turn_detector.english import EnglishModel

from call_logs import (
    _AsyncRateLimitedClient,
    append_turn,
    end_call,
    start_call,
)
from clinic_context import (
    FALLBACK_GREETING,
    FALLBACK_SYSTEM_PROMPT,
    get_or_fetch,
    render_greeting,
    render_system_prompt,
)
from speech_filter import sanitize_for_speech
from tools import ToolConfig, build_tools

load_dotenv()

# Log to the console always, and to a file when the path is writable. `agent.py dev`
# otherwise writes only to the terminal, which makes a local call impossible to
# inspect after the fact. The file path is overridable via AIVA_LOG_FILE; default
# /tmp/aiva-worker.log. In a container (non-root user / read-only fs) the file may
# not be openable — there we fall back to stdout only, which LiveKit Cloud captures
# (`lk agent logs`), instead of crashing the worker on startup.
_LOG_FILE = os.environ.get("AIVA_LOG_FILE", "/tmp/aiva-worker.log")
_handlers: list[logging.Handler] = [logging.StreamHandler()]
_file_log_error: str | None = None
try:
    _handlers.append(logging.FileHandler(_LOG_FILE))
except OSError as exc:  # permission denied / read-only fs (e.g. in the deployed container)
    _file_log_error = str(exc)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
    handlers=_handlers,
)
logger = logging.getLogger("aiva.agent")
if _file_log_error:
    logger.info("Logging to console only (file log unavailable: %s)", _file_log_error)
else:
    logger.info("Logging to console + %s", _LOG_FILE)

# Spoken when an LLM completion can't be produced for a turn (rate limit /
# connection / timeout, after the framework's own retries). Better than the dead
# air the caller hears today — it invites a retry, by which point a per-minute
# token budget has typically refilled. See AivaAgent.llm_node.
LLM_FAILURE_REPLY = (
    "Sorry, I'm having a little trouble on my end. Could you say that one more time?"
)

# Phase 8: how long a fetched clinic context stays usable from the per-worker
# cache before the next call re-fetches. Clinic facts change rarely; this trades a
# little staleness for skipping the Mumbai DB round-trip on every call's greeting.
CONTEXT_CACHE_TTL_S = 60.0


class AivaAgent(Agent):
    """Clinic receptionist agent with a sanitized TTS path (Phase 5 bug #1).

    Overrides `tts_node` so any leaked tool-call syntax the LLM emits as text is
    scrubbed BEFORE synthesis — the caller never hears "function …". Real tool
    calls are unaffected (they travel the structured tool-call channel, not this
    text stream).
    """

    async def tts_node(
        self, text: AsyncIterable[str], model_settings: ModelSettings
    ) -> AsyncIterable[rtc.AudioFrame]:
        async for frame in Agent.default.tts_node(
            self, sanitize_for_speech(text), model_settings
        ):
            yield frame

    async def llm_node(
        self,
        chat_ctx: ChatContext,
        tools: list,
        model_settings: ModelSettings,
    ) -> AsyncIterable[ChatChunk | str]:
        """Speak a graceful apology instead of going silent when the LLM fails
        (Phase 7 reliability). The framework already retries 4× before raising; by
        the time an APIError reaches here (rate limit / connection / timeout), the
        completion is unrecoverable for this turn. Rather than dead air — what the
        caller heard on a Groq 429 — we yield a short spoken line that invites them
        to try again (by which point the per-minute token budget has refilled)."""
        produced = False
        try:
            async for chunk in Agent.default.llm_node(
                self, chat_ctx, tools, model_settings
            ):
                produced = True
                yield chunk
        except APIError as exc:
            logger.warning(
                "LLM completion failed (%s) — speaking fallback line.", exc
            )
            # Only apologize if nothing was spoken yet, so we don't tack the
            # apology onto a partially-delivered reply.
            if not produced:
                yield LLM_FAILURE_REPLY


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def prewarm(proc: JobProcess) -> None:
    """Load the heavy VAD model ONCE per worker process, not per call.

    silero.VAD.load() is slow to initialize; doing it here (before any call
    arrives) keeps it off the call's critical path. NOTE: the EnglishModel turn
    detector is NOT prewarmed here — it requires an active job context and
    raises "no job context found" outside the entrypoint, so it is constructed
    per call in entrypoint() instead.
    """
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("Prewarm complete: VAD loaded.")


async def _load_context_with_retry(
    *, backend_url: str, clinic_id: str, webhook_secret: str, attempts: int = 2
):
    """Fetch clinic context, retrying once before giving up.

    A single transient hiccup (cold DB connection, dev server still compiling)
    should not doom the whole call to the fallback prompt. Raises the last error
    if every attempt fails.
    """
    last_exc: Exception | None = None
    for i in range(attempts):
        try:
            return await get_or_fetch(
                backend_url=backend_url,
                clinic_id=clinic_id,
                webhook_secret=webhook_secret,
                # Phase 8: cache the clinic context per worker for CONTEXT_CACHE_TTL_S.
                # The fetch is a ~1.5-4s round-trip to the Mumbai DB on EVERY call's
                # critical path (before the greeting); clinic facts (name, doctors,
                # hours) change rarely, so serving consecutive calls from cache cuts
                # that latency and also rides out a transient DB blip between calls.
                max_age_s=CONTEXT_CACHE_TTL_S,
            )
        except Exception as exc:  # noqa: BLE001 — retry then re-raise
            last_exc = exc
            logger.warning("Context fetch attempt %d/%d failed: %s", i + 1, attempts, exc)
    assert last_exc is not None
    raise last_exc


class CallLogger:
    """Persists one voice call's lifecycle to the Next.js CallLog table.

    Wires the LiveKit session events (transcripts + close) into fire-and-forget
    POSTs to the backend. All writes are best-effort: an unrecoverable backend
    error is logged, never allowed to drop the live call. The `seq` counter,
    combined with the provider call id in the eventId, keeps transcript chunks
    idempotent and ordered.
    """

    def __init__(self, *, client: _AsyncRateLimitedClient, provider_call_id: str) -> None:
        self._client = client
        self._provider_call_id = provider_call_id
        self._seq = 0
        self._started_monotonic = time.monotonic()
        self._appointment_id: str | None = None
        self._patient_id: str | None = None
        self._tasks: set[asyncio.Task] = set()

    def _spawn(self, coro: Any) -> None:
        """Schedule a fire-and-forget DB write, keeping a reference so the task
        isn't garbage-collected mid-flight. Failures are logged, never raised."""
        task = asyncio.create_task(coro)

        def _done(t: asyncio.Task) -> None:
            self._tasks.discard(t)
            if not t.cancelled():
                exc = t.exception()
                if exc is not None:
                    logger.warning("call-log write failed (non-fatal): %s", exc)

        task.add_done_callback(_done)
        self._tasks.add(task)

    @property
    def appointment_id(self) -> str | None:
        return self._appointment_id

    @property
    def patient_id(self) -> str | None:
        return self._patient_id

    async def record_start(self, *, clinic_id: str, caller_phone: str, dialed: str) -> None:
        """Register the call. Provider call id is reused across turns + end."""
        await start_call(
            client=self._client,
            event_id=f"{self._provider_call_id}.start",
            provider_call_id=self._provider_call_id,
            to=dialed or "unknown",
            caller_phone=caller_phone or "unknown",
            clinic_id=clinic_id,
            started_at=_utc_iso_z(),
        )

    async def record_user_turn(self, text: str) -> None:
        """Record the caller's final transcribed utterance."""
        text = (text or "").strip()
        if not text:
            return
        self._seq += 1
        await append_turn(
            client=self._client,
            provider_call_id=self._provider_call_id,
            role="user",
            text=text,
            seq=self._seq,
        )

    async def record_assistant_turn(self, text: str) -> None:
        """Record the agent's spoken reply."""
        text = (text or "").strip()
        if not text:
            return
        self._seq += 1
        await append_turn(
            client=self._client,
            provider_call_id=self._provider_call_id,
            role="assistant",
            text=text,
            seq=self._seq,
        )

    def note_booking(self, appointment_id: str | None, patient_id: str | None) -> None:
        """Stash the booked-appointment ids so call-ended can link them."""
        if appointment_id:
            self._appointment_id = appointment_id
        if patient_id:
            self._patient_id = patient_id

    async def record_end(self, *, outcome: str = "Completed") -> None:
        """Finalize the call. Duration is computed from wall-clock elapsed time."""
        duration = max(0, int(time.monotonic() - self._started_monotonic))
        await end_call(
            client=self._client,
            provider_call_id=self._provider_call_id,
            ended_at=_utc_iso_z(),
            duration_sec=duration,
            outcome=outcome,
            detected_intent="Booking" if self._appointment_id else "Inquiry",
            patient_id=self._patient_id,
            appointment_id=self._appointment_id,
        )


# ────────────────────────────────────────────────────────────────────────────
# SILENCE ESCALATION — never let the agent wait forever in dead air.
#
# If the caller never speaks ("are you still there?" loop goes infinite), the
# base turn-detector leaves the agent waiting indefinitely. This watchdog arms a
# timer ONLY when the agent is truly idle (listening/idle state) AND the
# transition was from a busy state (speaking/thinking → listening). This
# prevents the timer from firing while the agent is still mid-tool-call or mid-
# speech-fillers — a critical distinction for a tool-using agent where the agent
# can be "listening" between intermediate turns while still actively processing.
#
# Escalation steps:
#   stage 0: silence → gentle prompt ("Are you still there?")
#   stage 1: silence → firmer nudge ("I'm having trouble hearing you …")
#   stage 2: silence → graceful goodbye, then hang up.
# Any VAD-detected caller speech resets the escalation to stage 0 so a live
# conversation proceeds untouched. Tunings are env-overridable:
#   AIVA_SILENCE_TIMEOUT_S  (default 7.0)  — seconds of silence before each step
#   AIVA_SILENCE_MAX_PROMPTS(default 2)    — prompts before we hang up
# ────────────────────────────────────────────────────────────────────────────
_SILENCE_TIMEOUT_S = float(os.environ.get("AIVA_SILENCE_TIMEOUT_S", "7.0"))
_SILENCE_MAX_PROMPTS = int(os.environ.get("AIVA_SILENCE_MAX_PROMPTS", "2"))
_PROMPT_STILL_THERE = "Are you still there?"
_PROMPT_TROUBLE = (
    "I'm having trouble hearing you. If you're still there, please go ahead."
)
_GOODBYE = (
    "It seems we're having trouble connecting. Feel free to call back anytime. Goodbye."
)


class SilenceEscalation:
    """Watchdog that interrupts dead air with escalating prompts, then hangs up.

    State-machine approach: the countdown only runs when the agent has finished
    ALL speech (including post-tool-call replies) and is truly idle waiting on the
    caller. The key insight: LiveKit's agent_state transitions to "listening"
    briefly between a filler and a tool call, so the old code armed the 7-second
    timer during the agent's own active turn — causing an immediate
    "are you still there?" the moment the agent finished its real reply.

    Interface used by entrypoint:
      - `install(session, shutdown_fnc)` — register event handlers + start the loop.
      - `close()` — cancel the loop (e.g. on close/participant-disconnect).
    """

    def __init__(self) -> None:
        self._session: AgentSession | None = None
        self._shutdown_fnc: Callable[[], None] | None = None
        # Edge-triggered events based on agent state transitions:
        # - _idle_event: set on busy→idle transition; the loop consumes it to start the countdown.
        # - _busy_event: set on idle→busy transition; aborts an active countdown.
        self._idle_event = asyncio.Event()
        self._busy_event = asyncio.Event()
        self._speech = asyncio.Event()  # set when VAD detects caller speech
        self._task: asyncio.Task[None] | None = None
        self._stage = 0  # 0 = none spoken, 1/2 = prompted, 3+ = hang up
        # Start busy=True so the first idle transition (after greeting) arms the timer.
        self._agent_busy = True

    # -- event handlers (registered on the AgentSession) ---------------------
    def on_agent_state(self, event: object) -> None:
        new_state = getattr(event, "new_state", None)
        if new_state in ("speaking", "thinking", "initializing"):
            # Agent is or will be active — abort any in-flight countdown.
            if not self._agent_busy:
                self._agent_busy = True
                self._busy_event.set()
        elif new_state in ("listening", "idle"):
            # Agent finished and is now waiting for the caller.
            if self._agent_busy:
                self._agent_busy = False
                self._idle_event.set()

    def on_user_state(self, event: object) -> None:
        # Caller is making a sound — cancel the current silence timer.
        if getattr(event, "new_state", None) == "speaking":
            self._speech.set()

    def install(self, session: AgentSession, shutdown_fnc: Callable[[], None]) -> None:
        """Register handlers + start the escalation loop. Idempotent."""
        if self._task is not None:
            return
        self._session = session
        self._shutdown_fnc = shutdown_fnc
        session.on("agent_state_changed", self.on_agent_state)
        session.on("user_state_changed", self.on_user_state)
        self._task = asyncio.create_task(self._run())

    def close(self) -> None:
        if self._task is not None:
            self._task.cancel()
            self._task = None

    # -- main loop -----------------------------------------------------------
    async def _speak(self, text: str) -> None:
        """Speak a line, tolerating the session being closed. Returns once it
        has finished playing out (so we know the caller's turn has begun)."""
        if self._session is None:
            return
        try:
            handle = self._session.say(text, allow_interruptions=True)
            await handle.wait_for_playout()
        except Exception as exc:  # noqa: BLE001 — escalation must never crash the call
            logger.debug("silence escalation say failed: %s", exc)

    async def _run(self) -> None:
        try:
            while True:
                # Wait for the edge transition: agent was busy, now truly idle.
                await self._idle_event.wait()
                self._idle_event.clear()
                self._busy_event.clear()
                self._speech.clear()

                # Start the countdown. We race the speech VAD event (caller spoke)
                # against the busy event (agent is active again) against a timeout.
                speech_task = asyncio.create_task(self._speech.wait())
                busy_task = asyncio.create_task(self._busy_event.wait())
                try:
                    done, _ = await asyncio.wait(
                        {speech_task, busy_task},
                        timeout=_SILENCE_TIMEOUT_S,
                    )
                finally:
                    if not speech_task.done():
                        speech_task.cancel()
                    if not busy_task.done():
                        busy_task.cancel()

                if busy_task in done:
                    # Agent started speaking/thinking again (tool call producing a
                    # final reply, interruption, etc.) — this listening window was
                    # never truly idle. Discard and wait for the next idle edge.
                    self._busy_event.clear()
                    self._speech.clear()
                    continue

                if speech_task in done:
                    # Caller spoke — normal conversation happening. Reset escalation.
                    self._stage = 0
                    self._speech.clear()
                    continue

                # No speech, no agent activity → dead air. Escalate step by step.
                if self._stage < _SILENCE_MAX_PROMPTS:
                    self._stage += 1
                    await self._speak(
                        _PROMPT_STILL_THERE if self._stage == 1 else _PROMPT_TROUBLE
                    )
                    # _speak itself transitions agent→speaking→listening; the next
                    # idle edge will re-arm the countdown naturally.
                else:
                    await self._speak(_GOODBYE)
                    logger.info(
                        "Silence escalation reached stage %d — hanging up.",
                        self._stage,
                    )
                    if self._shutdown_fnc is not None:
                        self._shutdown_fnc()
                    return
        except asyncio.CancelledError:
            return
        except Exception as exc:  # noqa: BLE001 — a watchdog bug must not kill the worker
            logger.warning("Silence escalation loop error: %s", exc)


def _extract_sip_call_info(ctx: JobContext) -> tuple[str, str, str]:
    """Pull (provider_call_id, caller_phone, dialed) from the SIP participant.

    For LiveKit SIP inbound calls the caller exposes attributes `sip.callID`,
    `sip.phoneNumber` (caller) and `sip.trunkPhoneNumber` (dialed-in number).
    Falls back defensively so both local `dev` console calls and non-SIP rooms
    still register a call row.
    """
    provider_call_id = None
    caller_phone = None
    dialed = None
    try:
        for participant in ctx.room.remote_participants.values():
            if participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
                attrs = participant.attributes or {}
                provider_call_id = attrs.get("sip.callID")
                caller_phone = attrs.get("sip.phoneNumber")
                dialed = attrs.get("sip.trunkPhoneNumber")
                break
    except Exception:  # noqa: BLE001 — never let introspection break the call
        logger.warning("Failed to inspect SIP participant attributes", exc_info=True)

    provider_call_id = provider_call_id or ctx.room.name
    return provider_call_id, caller_phone or "", dialed or ""


async def entrypoint(ctx: JobContext) -> None:
    _require_env("GROQ_API_KEY")
    _require_env("ELEVENLABS_API_KEY")
    backend_url = _require_env("AIVA_BACKEND_URL")
    clinic_id = _require_env("AIVA_CLINIC_ID")
    webhook_secret = _require_env("VOICE_WEBHOOK_SECRET")

    logger.info("Connecting to room %s ...", ctx.room.name)
    await ctx.connect()

    # Register the call in the DB (best-effort) and capture the LiveKit SIP
    # caller identity so transcripts persist under one stable providerCallId.
    provider_call_id, caller_phone, dialed = _extract_sip_call_info(ctx)
    call_logger = CallLogger(
        client=_AsyncRateLimitedClient(
            backend_url=backend_url,
            secret=webhook_secret,
        ),
        provider_call_id=provider_call_id,
    )
    try:
        await call_logger.record_start(
            clinic_id=clinic_id,
            caller_phone=caller_phone,
            dialed=dialed,
        )
    except Exception:  # noqa: BLE001 — call logging must never drop the call
        logger.warning("Failed to register call start (non-fatal)", exc_info=True)

    # Fetch the clinic context (with one retry), served from the per-worker cache
    # when fresh (Phase 8, CONTEXT_CACHE_TTL_S) to keep the Mumbai round-trip off
    # most calls' critical path.
    try:
        context = await _load_context_with_retry(
            backend_url=backend_url,
            clinic_id=clinic_id,
            webhook_secret=webhook_secret,
        )
        # Today's date in the clinic timezone, so the model can resolve relative
        # dates ("tomorrow") to absolute YYYY-MM-DD the tools require.
        tz_name = (context.get("clinic") or {}).get("timezone") or "Asia/Karachi"
        try:
            today = datetime.now(ZoneInfo(tz_name)).strftime("%Y-%m-%d")
        except Exception:  # noqa: BLE001 — bad tz name shouldn't drop the call
            today = datetime.utcnow().strftime("%Y-%m-%d")
        system_prompt = render_system_prompt(context, today=today)
        greeting = render_greeting(context)
        logger.info(
            "Loaded clinic context: clinic=%s doctors=%d",
            context["clinic"].get("name"),
            len(context.get("doctors") or []),
        )
        logger.debug("Rendered system prompt (%d chars):\n%s", len(system_prompt), system_prompt)
    except Exception as exc:  # noqa: BLE001 — fail-closed, log every failure mode
        logger.error(
            "Clinic context fetch FAILED after retries (%s) — using fallback "
            "prompt. Check that AIVA_BACKEND_URL (%s) is reachable and the "
            "Next.js app is running.",
            exc,
            backend_url,
        )
        system_prompt = FALLBACK_SYSTEM_PROMPT
        greeting = FALLBACK_GREETING

    stt = groq.STT(model="whisper-large-v3-turbo", language="en")
    # Primary is qwen/qwen3.8-27b: the most capable current Groq model that still
    # supports tool calling (groq/compound has a higher token budget but rejects
    # tools outright). It is a stronger instruction-follower than gpt-oss-20b and
    # is far less prone to the "rushed booking" failure seen on 2026-09-17, where
    # the caller never named a time yet the agent read back a slot as if chosen.
    # NOTE: every usable Groq chat model is capped at 8,000 TPM free, so the
    # model swap buys reliability, NOT extra budget — the prompt diet, output cap
    # and FallbackAdapter are what protect the token budget.
    # The fallback stays openai/gpt-oss-120b deliberately: if the primary drains
    # mid-turn, the adapter must fail over to another HIGH-capability model, not a
    # weak one — a 429 switch to a small model mid-conversation is what produced
    # the hallucinated read-back on that call.
    # Earlier models (llama-3.3-70b-versatile, meta-llama/llama-4-scout) were
    # decommissioned by Groq and now return HTTP 400 (model_not_found), which the
    # FallbackAdapter does NOT catch (it only retries on 429).
    # max_completion_tokens caps reasoning + reply tokens so each request's
    # "Requested" (and therefore the 8k/min cap hit) stays small and bounded
    # instead of consuming the Groq model default. It MUST stay <= 1000: Groq
    # rejects the whole request outright (HTTP 429, BEFORE any generation) when
    # max_completion_tokens exceeds the model's output-tokens-per-minute cap, and
    # qwen/qwen3.8-27b's OTPM is exactly 1000. 512 leaves headroom while still
    # covering a spoken sentence plus a tool call.
    # temperature kept low for instruction-following on a phone call.
    #
    # Phase 8: wrap the primary in a FallbackAdapter with a SECOND model. Groq's
    # free-tier rate limits are PER MODEL, so when the primary returns a 429 the
    # adapter fails over mid-turn to the backup model's own token bucket and the
    # caller still gets an answer. If BOTH are exhausted, the APIError reaches
    # AivaAgent.llm_node, which speaks the graceful fallback line instead of
    # going silent (Phase 7).
    primary_model = os.environ.get("AIVA_PRIMARY_MODEL", "qwen/qwen3.8-27b")
    fallback_model = os.environ.get("AIVA_FALLBACK_MODEL", "openai/gpt-oss-120b")
    llm = FallbackAdapter(
        [
            groq.LLM(
                model=primary_model,
                temperature=0.3,
                max_completion_tokens=512,
            ),
            groq.LLM(
                model=fallback_model,
                temperature=0.3,
                max_completion_tokens=512,
            ),
        ]
    )
    tts = elevenlabs.TTS(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        voice_id="EXAVITQu4vr4xnSDxMaL",  # "Sarah" — mature, reassuring; fits a clinic receptionist
    )
    # Reuse the VAD loaded once in prewarm(). The turn detector must be built
    # inside the job context, so it is constructed here per call.
    vad = ctx.proc.userdata["vad"]
    turn_detection = EnglishModel()

    logger.info(
        "Providers loaded | STT=Groq(whisper-large-v3-turbo) "
        "LLM=Groq(%s -> %s fallback) TTS=ElevenLabs(Sarah) "
        "VAD=Silero TurnDetector=LiveKit(english)",
        primary_model,
        fallback_model,
    )

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=vad,
        turn_detection=turn_detection,
        # Endpointing tuning to reduce the "dead air until the caller speaks
        # again" turns seen in Phase 3: a shorter max delay makes the agent
        # commit to responding sooner once the turn detector is confident, while
        # the min delay still guards against cutting the caller off mid-sentence.
        min_endpointing_delay=0.4,
        max_endpointing_delay=3.0,
        # Phase 7: disable preemptive generation. It speculatively generates a
        # reply before the caller's turn ends to shave latency, but on a
        # tool-using agent the context/tools change mid-turn, so the speculative
        # generation is thrown away and re-run — the log showed exactly this
        # ("preemptive generation … tools have changed"). On Groq's tight
        # per-minute token budget that wasted generation is what tips a tool turn
        # over the 12k/min limit into a 429. Off = one generation per turn.
        preemptive_generation=False,
    )

    # Phase 3: read-only LLM tools, bound to this clinic's backend config. The
    # on_booking hook lets book_appointment link the resulting appointment +
    # patient back to this call's CallLog row. The auto_book / handle_rescheduling
    # flags come from the clinic's AiSettings and gate the write tools below.
    tools = build_tools(
        ToolConfig(
            backend_url=backend_url,
            clinic_id=clinic_id,
            webhook_secret=webhook_secret,
            on_booking=call_logger.note_booking,
            auto_book=bool((context.get("ai") or {}).get("autoBook", True)),
            handle_rescheduling=bool(
                (context.get("ai") or {}).get("handleRescheduling", False)
            ),
        )
    )
    logger.info("Loaded %d read-only tools: %s", len(tools), [t.info.name for t in tools])

    agent = AivaAgent(instructions=system_prompt, tools=tools)

    await session.start(agent=agent, room=ctx.room)
    logger.info("AgentSession started — Aiva is speaking the greeting.")

    # Persist the live transcript + call-end as they happen. Both handlers are
    # fire-and-forget tasks, so a slow backend never delays the spoken turn.
    from livekit.agents.voice.events import (
        CloseEvent,
        ConversationItemAddedEvent,
        UserInputTranscribedEvent,
    )
    from livekit.agents.llm import ChatMessage

    @session.on("user_input_transcribed")
    def _on_user_transcribed(event: UserInputTranscribedEvent) -> None:
        if not event.is_final or not (event.transcript or "").strip():
            return
        call_logger._spawn(call_logger.record_user_turn(event.transcript))

    @session.on("conversation_item_added")
    def _on_conversation_item_added(event: ConversationItemAddedEvent) -> None:
        item = event.item
        if not isinstance(item, ChatMessage) or item.role != "assistant":
            return
        text = item.text_content
        if not text or not text.strip():
            return
        call_logger._spawn(call_logger.record_assistant_turn(text))

    @session.on("close")
    def _on_close(_event: CloseEvent) -> None:
        silence_escalation.close()
        call_logger._spawn(call_logger.record_end())

    # Phase 9: watchdog for a caller who never speaks. Without it the agent can
    # wait in dead air forever (the turn-detector handles speech->pause, but has
    # no "no speech at all" timeout). Arms after the greeting, prompts to
    # re-engage, then hangs up gracefully.
    silence_escalation = SilenceEscalation()
    silence_escalation.install(session, shutdown_fnc=ctx.shutdown)

    await session.say(greeting, allow_interruptions=True)


if __name__ == "__main__":
    logger.info("Aiva voice agent worker starting — connecting to LiveKit ...")
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name="aiva",
            # Keep one process warm + prewarmed (VAD loaded) waiting for a job, so
            # a call doesn't pay spawn+prewarm latency on the critical path. In
            # Phase 3 the pool was empty at call time ("no warmed process
            # available"), forcing an at-call spawn (~6s join). This fixes that.
            num_idle_processes=1,
        )
    )
