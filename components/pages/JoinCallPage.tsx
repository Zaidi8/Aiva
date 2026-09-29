'use client';

// Staff "take this call" view — the browser half of a human hand-off.
//
// When the AI receptionist escalates a call, a receptionist clicks "Take this
// call" on the AI Receptionist page and lands here. This component then:
//
//   1. CLAIMS the escalation, so a second colleague clicking at the same moment
//      is told the call is already taken rather than both talking at the caller.
//   2. FETCHES a short-lived, room-scoped LiveKit token from the server. The
//      token is deliberately never a prop, never in the URL, and never rendered
//      into the DOM — it is requested over POST and handed straight to the SDK.
//   3. CONNECTS to the same room the caller is in. The agent unpublishes its own
//      audio the moment it sees our participant join, so from that point the
//      receptionist is talking to the caller directly.
//
// If the caller has already hung up, the room is empty and the agent is gone:
// LiveKit keeps the room alive briefly, so this page reports that the call has
// ended rather than pretending to be connected.
//
// The UI is phone-first and deliberately plain — during a live call this window
// is competing with the receptionist's attention, not a place for navigation, so
// it adds no chrome of its own inside the app's usual shell.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type RemoteTrack,
} from 'livekit-client';
import { Button } from '../ui/button';

type Phase =
  | 'claiming'
  | 'connecting'
  | 'live'
  | 'ended'
  | 'taken'
  | 'unavailable'
  | 'error';

interface JoinCallPageProps {
  callId: string;
  callerName: string;
  callerPhone: string | null;
  /** LiveKit room to join. Null when the escalation recorded no room. */
  roomName: string | null;
  escalationStatus: 'Requested' | 'Claimed' | 'Resolved' | null;
}

export function JoinCallPage({
  callId,
  callerName,
  callerPhone,
  roomName,
  escalationStatus,
}: JoinCallPageProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('claiming');
  const [message, setMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasCallerAudio, setHasCallerAudio] = useState(false);

  // Refs, not state: the Room must not be re-created by a render, and the
  // disconnect/cleanup path needs the live instance.
  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const hangUp = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      // The caller's line is the SIP leg — leaving the room is what ends our
      // side of it. Disconnect explicitly rather than relying on unmount.
      room.disconnect();
      roomRef.current = null;
    }
    router.push('/ai-receptionist');
  }, [router]);

  useEffect(() => {
    // No room recorded => this escalation predates (or lost) the LiveKit room
    // name. There is nothing to join, so say so instead of failing opaquely.
    if (!roomName) {
      setPhase('unavailable');
      setMessage(
        'This call has no live room recorded, so it cannot be joined. Use the number below to call the patient back.',
      );
      return;
    }

    let cancelled = false;
    // The <audio> element is committed by the time this effect runs, so the ref
    // is populated. Read it once into a typed local: the attach callback below
    // needs a definite HTMLMediaElement, not `T | null`.
    const audioEl: HTMLAudioElement | null = audioElRef.current;

    (async () => {
      try {
        // 1. Claim first. If a colleague already took the call, stop here
        //    BEFORE asking for a token — there is no reason to hand out room
        //    credentials for a call someone else is on.
        const claimRes = await fetch(`/api/calls/${callId}/escalation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'claim' }),
        });
        if (claimRes.status === 409) {
          if (!cancelled) {
            setPhase('taken');
            // The server distinguishes "a colleague is on it" from "staff already
            // marked this handled" — both are 409, but the receptionist needs to
            // know which, so prefer its message over a generic one.
            const body = (await claimRes.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
            setMessage(body?.error?.message ?? 'A colleague has already taken this call.');
          }
          return;
        }
        if (!claimRes.ok) {
          throw new Error('claim failed');
        }

        // 2. Room-scoped token from the server.
        const tokenRes = await fetch(`/api/calls/${callId}/join`, { method: 'POST' });
        const tokenBody = (await tokenRes.json().catch(() => null)) as {
          data?: { token: string; url: string; roomName: string };
          error?: { code?: string; message?: string };
        } | null;
        if (!tokenRes.ok || !tokenBody?.data?.token) {
          if (tokenBody?.error?.code === 'LIVEKIT_NOT_CONFIGURED') {
            if (!cancelled) {
              setPhase('unavailable');
              setMessage(
                'LiveKit is not configured on this server, so joining a live call is not possible yet.',
              );
            }
            return;
          }
          throw new Error(tokenBody?.error?.message ?? 'Could not get a join token');
        }
        if (cancelled) return;

        setPhase('connecting');

        // 3. Join the room the caller is in.
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        // Attach the caller's audio to a plain <audio> element — remote
        // playback, no local preview, no camera. Muted autoplay is a browser
        // policy, so playback starts on the first user gesture on the page.
        const attach = (
          track: RemoteTrack,
          _publication: RemoteTrackPublication,
          participant: RemoteParticipant,
        ) => {
          if (track.kind === Track.Kind.Audio) {
            // The agent is still connected when we arrive and unpublishes a
            // moment later; only the SIP caller should ever be heard.
            if (participant.identity.startsWith('aiva-staff:')) return;
            if (audioEl) {
              track.attach(audioEl);
              audioEl.play().catch(() => {
                // Blocked until a gesture — the "Connected" state above still
                // tells the receptionist the line is open.
              });
            }
            setHasCallerAudio(true);
          }
        };
        room.on(RoomEvent.TrackSubscribed, attach);
        room.on(RoomEvent.ParticipantConnected, (p) => {
          // A new participant on an established escalation is the caller
          // reconnecting, not a second colleague (those would already be here).
          if (!p.identity.startsWith('aiva-staff:')) setHasCallerAudio(true);
        });
        room.on(RoomEvent.Disconnected, () => {
          if (!cancelled) {
            setPhase('ended');
            setMessage('The call has ended.');
          }
        });

        await room.connect(tokenBody.data.url, tokenBody.data.token);
        if (cancelled) {
          room.disconnect();
          return;
        }
        setPhase('live');
      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setMessage(
            err instanceof Error
              ? err.message
              : 'Could not join this call.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      const room = roomRef.current;
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
    };
    // Intentionally mount-only: the room connection is a one-shot side effect.
    // Re-running it on a re-render would drop a live call.
  }, [callId, roomName]);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    // setMicrophoneEnabled is the modern API and publishes/renegotiates the
    // track; localParticipant.setMicrophoneEnabled(false) is the older spelling.
    void room.localParticipant.setMicrophoneEnabled(!isMuted);
    setIsMuted((m) => !m);
  }, [isMuted]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      <audio ref={audioElRef} autoPlay playsInline className="hidden" />

      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-primary-muted mx-auto">
          {phase === 'live' ? (
            <Phone className="size-7 text-primary" />
          ) : phase === 'connecting' || phase === 'claiming' ? (
            <Loader2 className="size-7 animate-spin text-primary" />
          ) : (
            <PhoneOff className="size-7 text-muted-foreground" />
          )}
        </div>

        <h1 className="mb-1 text-xl font-semibold text-foreground">{callerName}</h1>
        {callerPhone && (
          <p className="mb-6 text-sm text-muted-foreground">{callerPhone}</p>
        )}

        {phase === 'claiming' && (
          <p className="text-sm text-muted-foreground">Taking the call…</p>
        )}
        {phase === 'connecting' && (
          <p className="text-sm text-muted-foreground">Connecting…</p>
        )}
        {phase === 'live' && (
          <div className="space-y-4">
            <p className="flex items-center justify-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              {hasCallerAudio ? 'Connected — the caller is on the line' : 'Connected — waiting for the caller'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isMuted ? 'destructive' : 'outline'}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff /> : <Mic />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              <Button variant="destructive" onClick={hangUp}>
                <PhoneOff />
                Leave call
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The AI receptionist has gone quiet. Leaving ends your side of the
              call — the patient&rsquo;s line closes with it.
            </p>
          </div>
        )}
        {(phase === 'ended' ||
          phase === 'taken' ||
          phase === 'unavailable' ||
          phase === 'error') && (
          <div className="space-y-4">
            <p className="flex items-start justify-center gap-2 text-sm text-foreground">
              {phase === 'taken' ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              {message}
            </p>
            <Button onClick={() => router.push('/ai-receptionist')}>
              Back to calls
            </Button>
          </div>
        )}
      </div>

      {escalationStatus === 'Claimed' && phase === 'live' && (
        <p className="text-xs text-muted-foreground">
          This call is marked as yours. Mark it handled once you are done.
        </p>
      )}
    </div>
  );
}
