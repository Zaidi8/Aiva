"""Aiva — Phase 2 voice agent (live clinic knowledge).

A LiveKit Agents worker that wires:
  - Silero VAD
  - LiveKit turn-detector (English)
  - Groq Whisper Large v3 Turbo (STT)
  - Groq llama-3.1-8b-instant (LLM)
  - ElevenLabs TTS (Sarah)

Phase 2 adds: per-call clinic-context fetch from the Next.js app, rendered
into the system prompt + greeting. On fetch failure we fall back to a safe
"sorry, we'll call you back" prompt rather than dropping the call.

Run with:
    python agent.py dev
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo

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


async def entrypoint(ctx: JobContext) -> None:
    _require_env("GROQ_API_KEY")
    _require_env("ELEVENLABS_API_KEY")
    backend_url = _require_env("AIVA_BACKEND_URL")
    clinic_id = _require_env("AIVA_CLINIC_ID")
    webhook_secret = _require_env("VOICE_WEBHOOK_SECRET")

    logger.info("Connecting to room %s ...", ctx.room.name)
    await ctx.connect()

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
    # llama-3.3-70b-versatile is Groq's strong tool-caller. The earlier
    # llama-3.1-8b-instant was a weak tool-caller: under tool pressure it leaked
    # malformed tool-call TEXT (e.g. "function check_availability…") into the
    # spoken stream instead of emitting a real function call, and burned the turn
    # without producing an answer ("said 'function' and never responded"). The
    # 70b model emits proper tool calls and follows the booking protocol better.
    # temperature kept low for instruction-following on a phone call.
    #
    # Phase 8: wrap the primary in a FallbackAdapter with a SECOND model. Groq's
    # free-tier rate limits are PER MODEL, so when 70b returns a 429 (which kept
    # killing test calls) the adapter fails over mid-turn to the backup model's
    # own token bucket and the caller still gets an answer. The backup defaults to
    # llama-3.1-8b-instant (same family, low latency, and our tts_node sanitizer
    # already scrubs its tool-call-text leaks); override via AIVA_FALLBACK_MODEL.
    # If BOTH are exhausted, the APIError reaches AivaAgent.llm_node, which speaks
    # the graceful fallback line instead of going silent (Phase 7).
    # Both models are env-overridable so a drained per-model Groq budget can be
    # sidestepped for testing WITHOUT a code change — e.g. set
    # AIVA_PRIMARY_MODEL=openai/gpt-oss-20b (its own fresh token bucket) and
    # restart the worker. Defaults are the tuned production pair.
    primary_model = os.environ.get("AIVA_PRIMARY_MODEL", "llama-3.3-70b-versatile")
    fallback_model = os.environ.get("AIVA_FALLBACK_MODEL", "llama-3.1-8b-instant")
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

    # Phase 3: read-only LLM tools, bound to this clinic's backend config.
    tools = build_tools(
        ToolConfig(
            backend_url=backend_url,
            clinic_id=clinic_id,
            webhook_secret=webhook_secret,
        )
    )
    logger.info("Loaded %d read-only tools: %s", len(tools), [t.info.name for t in tools])

    agent = AivaAgent(instructions=system_prompt, tools=tools)

    await session.start(agent=agent, room=ctx.room)
    logger.info("AgentSession started — Aiva is speaking the greeting.")
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
