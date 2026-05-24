"""Aiva — Phase 1 voice agent (hello-world loop).

A LiveKit Agents worker that wires:
  - Silero VAD
  - LiveKit turn-detector (English)
  - Groq Whisper Large v3 Turbo (STT)
  - Groq llama-3.1-8b-instant (LLM)
  - ElevenLabs TTS (default voice)

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

load_dotenv()

logger = logging.getLogger("aiva.agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")

SYSTEM_PROMPT = (
    "You are Aiva, a warm and concise healthcare clinic receptionist. "
    "Greet the caller and ask how you can help. Speak naturally for voice: "
    "keep replies to one or two short sentences. English only. "
    "Do not promise to book, reschedule, or cancel anything yet — this is an "
    "early prototype that can only chat. If asked to take an action, kindly "
    "say a human teammate will follow up."
)

GREETING = "Hi, this is Aiva at the clinic. How can I help you today?"


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


async def entrypoint(ctx: JobContext) -> None:
    _require_env("GROQ_API_KEY")
    _require_env("ELEVENLABS_API_KEY")

    logger.info("Connecting to room %s ...", ctx.room.name)
    await ctx.connect()

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
        "LLM=Groq(llama-3.1-8b-instant) TTS=ElevenLabs(default voice) "
        "VAD=Silero TurnDetector=LiveKit(english)"
    )

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=vad,
        turn_detection=turn_detection,
    )

    agent = Agent(instructions=SYSTEM_PROMPT)

    await session.start(agent=agent, room=ctx.room)
    logger.info("AgentSession started — Aiva is speaking the greeting.")
    await session.say(GREETING, allow_interruptions=True)


if __name__ == "__main__":
    logger.info("Aiva voice agent worker starting — connecting to LiveKit ...")
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="aiva"))
