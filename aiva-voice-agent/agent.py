"""Aiva — Phase 2 voice agent (live clinic knowledge).

A LiveKit Agents worker that wires:
  - Silero VAD
  - LiveKit turn-detector (English)
  - Groq Whisper Large v3 Turbo (STT)
  - Groq openai/gpt-oss-120b (LLM)
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

from typing import AsyncIterable

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
CONTEXT_CACHE_TTL_S = 600.0


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
    # openai/gpt-oss-120b is Groq's strongest tool-caller as of Aug 2026.
    # Earlier models (llama-3.3-70b-versatile, meta-llama/llama-4-scout) were
    # decommissioned by Groq and now return HTTP 400 (model_not_found), which
    # the FallbackAdapter does NOT catch (it only retries on 429). The fallback
    # defaults to openai/gpt-oss-20b (low latency, own token bucket).
    # temperature kept low for instruction-following on a phone call.
    #
    # Phase 8: wrap the primary in a FallbackAdapter with a SECOND model. Groq's
    # free-tier rate limits are PER MODEL, so when the primary returns a 429 the
    # adapter fails over mid-turn to the backup model's own token bucket and the
    # caller still gets an answer. If BOTH are exhausted, the APIError reaches
    # AivaAgent.llm_node, which speaks the graceful fallback line instead of
    # going silent (Phase 7).
    # Both models are env-overridable so a drained per-model Groq budget can be
    # sidestepped for testing WITHOUT a code change — e.g. set
    # AIVA_PRIMARY_MODEL=openai/gpt-oss-20b (its own fresh token bucket) and
    # restart the worker. Defaults are the tuned production pair.
    primary_model = os.environ.get("AIVA_PRIMARY_MODEL", "openai/gpt-oss-120b")
    fallback_model = os.environ.get("AIVA_FALLBACK_MODEL", "openai/gpt-oss-20b")
    llm = FallbackAdapter(
        [
            groq.LLM(model=primary_model, temperature=0.3),
            groq.LLM(model=fallback_model, temperature=0.3),
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
    # patient back to this call's CallLog row.
    tools = build_tools(
        ToolConfig(
            backend_url=backend_url,
            clinic_id=clinic_id,
            webhook_secret=webhook_secret,
            on_booking=call_logger.note_booking,
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
        call_logger._spawn(call_logger.record_end())

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
