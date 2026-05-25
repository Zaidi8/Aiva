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
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import elevenlabs, groq, silero
from livekit.plugins.turn_detector.english import EnglishModel

from clinic_context import (
    FALLBACK_GREETING,
    FALLBACK_SYSTEM_PROMPT,
    get_or_fetch,
    render_greeting,
    render_system_prompt,
)

load_dotenv()

logger = logging.getLogger("aiva.agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


async def entrypoint(ctx: JobContext) -> None:
    _require_env("GROQ_API_KEY")
    _require_env("ELEVENLABS_API_KEY")
    backend_url = _require_env("AIVA_BACKEND_URL")
    clinic_id = _require_env("AIVA_CLINIC_ID")
    webhook_secret = _require_env("VOICE_WEBHOOK_SECRET")

    logger.info("Connecting to room %s ...", ctx.room.name)
    await ctx.connect()

    # Phase 2: fetch fresh per call. The cache is plumbed in get_or_fetch for
    # a future refresh tool; max_age_s=0 means always fetch.
    try:
        context = await get_or_fetch(
            backend_url=backend_url,
            clinic_id=clinic_id,
            webhook_secret=webhook_secret,
            max_age_s=0,
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
        logger.warning("Clinic context fetch failed (%s); using fallback prompt", exc)
        system_prompt = FALLBACK_SYSTEM_PROMPT
        greeting = FALLBACK_GREETING

    stt = groq.STT(model="whisper-large-v3-turbo", language="en")
    llm = groq.LLM(model="llama-3.1-8b-instant")
    tts = elevenlabs.TTS(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        voice_id="EXAVITQu4vr4xnSDxMaL",  # "Sarah" — mature, reassuring; fits a clinic receptionist
    )
    vad = silero.VAD.load()
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

    agent = Agent(instructions=system_prompt)

    await session.start(agent=agent, room=ctx.room)
    logger.info("AgentSession started — Aiva is speaking the greeting.")
    await session.say(greeting, allow_interruptions=True)


if __name__ == "__main__":
    logger.info("Aiva voice agent worker starting — connecting to LiveKit ...")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="aiva"))
