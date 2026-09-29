"""Aiva — handing a live call over to a human colleague.

When the agent escalates, a member of clinic staff (Admin or Receptionist) gets
a "Join call" button on the AI Receptionist page. Clicking it mints a
room-scoped LiveKit token and opens the SAME room the caller is in, so the
handover is a real person on the same line — not a call-back.

Everything the agent does to get out of the way lives here. Three things happen,
in this order, the moment a staff participant joins:

  1. INTERRUPT — stop whatever the agent is saying immediately. A half-sentence
     of "let me get a colleague to— " over the top of a human saying "hello?"
     is the single most obvious failure of a naive implementation.
  2. REPLACE THE AGENT — swap in `SilentAgent`, whose every pipeline node is a
     no-op. This is the part that matters and the part that is easy to get
     wrong: the session's VAD and turn detection keep running, so a *silent*
     agent is NOT enough — LiveKit would still run STT over the colleague's
     voice, hand it to the LLM, and burn tokens generating a reply that the
     caller must never hear. Overriding `stt_node` and `llm_node` stops the
     whole chain, which also keeps the human's half of the conversation out of
     the transcript (it would otherwise be logged as the *caller* speaking).
  3. UNPUBLISH THE AUDIO TRACK — the hard guarantee. Layers 1 and 2 are code we
     wrote; this is the room itself going quiet. If anything ever bypassed the
     agent override, the track is already gone, so it physically cannot reach
     the caller.

We also close the silence watchdog (SilenceEscalation) at the same moment. Left
running, it would hear a colleague pause to think and ask a *caller* "are you
still there?" — while a human is in the room.

Staff are identified by the `aiva-staff:` identity prefix, minted in
lib/voice/livekit.ts. Nothing else in the room is treated as a human: the
caller is on SIP, and the agent itself is the local participant.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterable

from livekit import rtc
from livekit.agents import Agent, AgentSession
from livekit.agents.llm import ChatChunk
from livekit.agents.stt import SpeechEvent

logger = logging.getLogger("aiva.handoff")

# Identity prefix for staff participants. Must match STAFF_IDENTITY_PREFIX in
# lib/voice/livekit.ts — that function mints the token, this one reads the room.
STAFF_IDENTITY_PREFIX = "aiva-staff:"


def is_staff_identity(identity: str | None) -> bool:
    """True when a room participant is a human colleague, not the caller."""
    return bool(identity) and str(identity).startswith(STAFF_IDENTITY_PREFIX)


class SilentAgent(Agent):
    """An agent that does nothing at all, on purpose.

    Installed as the active agent the instant a colleague joins the room. All four
    pipeline nodes are overridden to no-ops:

      - `stt_node`          no speech-to-text. This is the load-bearing one: with
                            STT off, no user turn is ever committed, so the LLM is
                            never called at all, and the colleague's voice is not
                            written into the call transcript as the caller's.
      - `llm_node`          defence in depth — even if something upstream
                            synthesised a user turn, no model is invoked. No
                            tokens, no latency, no risk of a reply.
      - `tts_node`          no synthesis, so even a stray `session.say()` from
                            elsewhere in the codebase produces no audio.
      - `transcription_node` nothing to publish, so no empty agent-side
                            transcription events reach the dashboard.

    `on_enter` logs the swap at INFO: "the agent stopped" is the single most
    useful line in the logs when debugging a handoff that felt abrupt.
    """

    def __init__(self) -> None:
        super().__init__(instructions="A human colleague has taken over this call. Say nothing.")

    async def llm_node(
        self,
        chat_ctx: Any,
        tools: list[Any],
        model_settings: Any,
    ) -> AsyncIterable[ChatChunk | str] | None:
        return None

    async def stt_node(
        self,
        audio: AsyncIterable[rtc.AudioFrame],
        model_settings: Any,
    ) -> AsyncIterable[SpeechEvent | str] | None:
        return None

    async def tts_node(
        self,
        text: AsyncIterable[str],
        model_settings: Any,
    ) -> AsyncIterable[rtc.AudioFrame] | None:
        return None

    async def transcription_node(
        self,
        text: AsyncIterable[str],
        model_settings: Any,
    ) -> AsyncIterable[str] | None:
        return None

    def on_enter(self) -> None:
        logger.info("agent replaced by SilentAgent — a colleague has the call now")


class RoomHandoff:
    """Watches the room for a staff participant and silences the agent on arrival.

    Installed once per call, right after the session starts. Self-disabling after
    the first hand-over: a call is handed to one person, and if a second
    colleague also clicks "Join call" (they can — the button stays available, so
    a manager can listen in), the room is already quiet and nothing needs doing.
    """

    def __init__(self) -> None:
        self._room: rtc.Room | None = None
        self._session: AgentSession | None = None
        self._on_handed_off: Any | None = None
        self._done = False
        # Handles for the room callbacks we register, kept so close() can
        # detach them. Without this a re-registered handler would fire twice.
        self._handlers: list[tuple[Any, Any]] = []

    def install(
        self,
        room: rtc.Room,
        session: AgentSession,
        on_handed_off: Any | None = None,
    ) -> None:
        """Start watching `room`. Idempotent.

        `on_handed_off` is a zero-arg callable fired once the room is quiet, so
        the caller can close the silence watchdog and log the transition. It runs
        AFTER the mute, never before: the whole point is that the agent is
        already off the air by the time anything else reacts.
        """
        if self._room is not None:
            return
        self._room = room
        self._session = session
        self._on_handed_off = on_handed_off

        for event, handler in (
            (room.on("participant_connected"), self._on_participant_connected),
            (room.on("track_subscribed"), self._on_track_subscribed),
        ):
            event(handler)
            self._handlers.append((event, handler))

        # The staff member may already be in the room (they clicked "Join call"
        # in the seconds between the escalation landing and this worker setting
        # up). Sweep for them, or that call waits for the next join event that
        # will never come.
        asyncio.create_task(self._sweep_existing())

    def close(self) -> None:
        """Stop watching. Safe to call twice, and safe if never installed."""
        for event, handler in self._handlers:
            try:
                event.off(handler)
            except Exception as exc:  # noqa: BLE001 — teardown must not raise
                logger.debug("handoff handler detach failed: %s", exc)
        self._handlers.clear()
        self._room = None

    # -- internal -----------------------------------------------------------
    async def _sweep_existing(self) -> None:
        if self._room is None:
            return
        for participant in self._room.remote_participants.values():
            if is_staff_identity(participant.identity):
                await self._hand_over(participant.identity)
                return

    def _on_participant_connected(self, participant: rtc.RemoteParticipant) -> None:
        if is_staff_identity(participant.identity):
            logger.info("staff participant joined: %s", participant.identity)
            asyncio.create_task(self._hand_over(participant.identity))
        else:
            logger.debug("non-staff participant joined: %s", participant.identity)

    def _on_track_subscribed(
        self,
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        # Backstop for a race where the staff member's audio track is subscribed
        # before we finish muting ours. Cheap, and it is the last thing between
        # the agent and the caller.
        if is_staff_identity(participant.identity) and not self._done:
            asyncio.create_task(self._hand_over(participant.identity))

    async def _hand_over(self, staff_identity: str) -> None:
        if self._done or self._session is None or self._room is None:
            return
        self._done = True  # set first: two events can land in the same tick
        logger.info("handing call to %s — silencing the agent", staff_identity)

        # 1. Stop talking. `interrupt()` cancels the current speech AND clears any
        #    queued generation, so there is no leftover reply to play out after
        #    the track goes away.
        try:
            await self._session.interrupt()
        except Exception as exc:  # noqa: BLE001
            logger.warning("handoff interrupt failed: %s", exc)

        # 2. Replace the agent (see SilentAgent for why each node matters).
        try:
            await self._session.update_agent(SilentAgent())
        except Exception as exc:  # noqa: BLE001
            logger.warning("handoff agent swap failed: %s", exc)

        # 3. Unpublish the agent's audio — the guarantee, not the mechanism.
        #    Unpublishing is safe here: the framework's own teardown only cancels
        #    its tasks and closes the audio source, it never unpublishes, so
        #    nothing double-unpublishes at session close.
        await self._unpublish_agent_audio()

        # The room belongs to a person now. Stop watching.
        self.close()

        if self._on_handed_off is not None:
            try:
                self._on_handed_off()
            except Exception as exc:  # noqa: BLE001 — never let this break the call
                logger.warning("handoff callback failed: %s", exc)

    async def _unpublish_agent_audio(self) -> None:
        if self._room is None:
            return
        local = self._room.local_participant
        for pub in list(local.track_publications.values()):
            if pub.kind != rtc.TrackKind.KIND_AUDIO:
                continue
            try:
                await local.unpublish_track(pub.sid)
                logger.info("unpublished agent audio track %s", pub.sid)
            except Exception as exc:  # noqa: BLE001
                logger.warning("unpublish agent audio failed: %s", exc)
