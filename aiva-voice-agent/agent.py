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

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.plugins import elevenlabs, groq, silero
from livekit.plugins.turn_detector.english import EnglishModel

from clinic_context import (
    FALLBACK_GREETING,
    FALLBACK_SYSTEM_PROMPT,
    get_or_fetch,
    render_greeting,
    render_system_prompt,
)
from tools import ToolConfig, build_tools

load_dotenv()

logger = logging.getLogger("aiva.agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")


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
                max_age_s=0,
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

    # Phase 2: fetch fresh per call (with one retry). The cache is plumbed in
    # get_or_fetch for a future refresh tool; max_age_s=0 means always fetch.
    try:
        context = await _load_context_with_retry(
            backend_url=backend_url,
            clinic_id=clinic_id,
            webhook_secret=webhook_secret,
        )
        system_prompt = render_system_prompt(context)
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
    llm = groq.LLM(model="llama-3.1-8b-instant")
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
        "LLM=Groq(llama-3.1-8b-instant) TTS=ElevenLabs(Sarah) "
        "VAD=Silero TurnDetector=LiveKit(english)"
    )

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=vad,
        turn_detection=turn_detection,
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

    agent = Agent(instructions=system_prompt, tools=tools)

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
        )
    )
