import { Bot, User, Phone, Volume2, PhoneOff, Star } from 'lucide-react';
import { ScrollArea } from './scroll-area';
import { Button } from './button';
import { StatusBadge } from './status-badge';
import type { CallTranscriptSegment } from '@/types';

interface CallRecordProps {
  transcript: CallTranscriptSegment[];
  patientName: string;
  duration: string;
  callQuality: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export function CallRecord({ transcript, patientName, duration, callQuality, sentiment }: CallRecordProps) {
  return (
    <div className="space-y-4">
      {/* Call Summary Header */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary-muted p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary">
            <Phone className="size-6 text-primary-foreground" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Call duration:</span>
              <span className="text-sm font-semibold text-primary">{duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quality:</span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3 ${
                      i < callQuality
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sentiment</span>
          <StatusBadge status={sentiment} />
        </div>
      </div>

      {/* Call Transcript */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4 pb-4">
          {transcript.map((segment) => (
            <div
              key={segment.id}
              className={`flex gap-3 ${segment.speaker === 'ai' ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full text-white ${
                  segment.speaker === 'ai' ? 'bg-primary' : 'bg-brand-teal'
                }`}
              >
                {segment.speaker === 'ai' ? (
                  <Bot className="size-5" />
                ) : (
                  <User className="size-5" />
                )}
              </div>

              <div className="max-w-[75%] flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {segment.speaker === 'ai' ? 'Aiva AI' : patientName}
                  </span>
                  <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                  <Volume2 className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{segment.duration}</span>
                </div>
                <div
                  className={`break-words rounded-2xl p-4 ${
                    segment.speaker === 'ai'
                      ? 'border border-border bg-card text-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{segment.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Call Actions */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <PhoneOff className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Call ended</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Volume2 />
            Play recording
          </Button>
          <Button variant="outline" size="sm">
            Download transcript
          </Button>
        </div>
      </div>
    </div>
  );
}
