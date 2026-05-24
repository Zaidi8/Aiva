# Aiva Voice Agent — Phase 1

A minimal LiveKit Agents worker that runs a voice loop for **Aiva**, the
healthcare clinic receptionist. This phase is intentionally tiny: just a
two-way voice conversation. No booking, no DB, no telephony — yet.

## Stack

| Layer            | Provider                                              |
| ---------------- | ----------------------------------------------------- |
| Orchestration    | `livekit-agents` (Python)                             |
| VAD              | Silero (`livekit-plugins-silero`)                     |
| Turn detection   | LiveKit `turn-detector` (English model)               |
| STT              | Groq Whisper Large v3 Turbo (`livekit-plugins-groq`)  |
| LLM              | Groq `llama-3.1-8b-instant` (`livekit-plugins-groq`)  |
| TTS              | ElevenLabs default voice (`livekit-plugins-elevenlabs`) |

## Setup

```bash
cd aiva-voice-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit .env
```

Fill in `.env`:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — from your project
  at <https://cloud.livekit.io>.
- `GROQ_API_KEY` — from <https://console.groq.com/keys>.
- `ELEVENLABS_API_KEY` — from <https://elevenlabs.io/app/settings/api-keys>.

## Run

```bash
python agent.py dev
```

You should see the worker connect to LiveKit, register, and then sit idle
waiting for a room. That idle state is correct — it activates when a
participant joins a room.

## Talk to it (frontend)

Don't build a custom frontend yet. Use LiveKit's hosted **Agents Playground**
at <https://agents-playground.livekit.io>: sign in with your LiveKit Cloud
project, click *Connect*, allow mic access, and your locally running worker
will join the room and greet you. The playground gives you mic input,
streaming transcript, audio output, and a live conversation log — perfect
for sanity-checking the voice loop before wiring up a real UI.
