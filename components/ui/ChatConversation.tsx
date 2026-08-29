import { Bot, User } from 'lucide-react';
import { ScrollArea } from './scroll-area';
import type { CallTranscriptSegment } from '@/types';

interface ChatConversationProps {
  messages: CallTranscriptSegment[];
  patientName: string;
}

export function ChatConversation({ messages, patientName }: ChatConversationProps) {
  return (
    <ScrollArea className="h-[450px] pr-4">
      <div className="space-y-4 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.speaker === 'ai' ? '' : 'flex-row-reverse'}`}
          >
            <div
              className={`flex size-10 flex-shrink-0 items-center justify-center rounded-full text-white ${
                message.speaker === 'ai' ? 'bg-primary' : 'bg-brand-teal'
              }`}
            >
              {message.speaker === 'ai' ? (
                <Bot className="size-5" />
              ) : (
                <User className="size-5" />
              )}
            </div>

            <div className="max-w-[75%] flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {message.speaker === 'ai' ? 'Aiva' : patientName}
                </span>
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>
              <div
                className={`break-words rounded-2xl p-4 ${
                  message.speaker === 'ai'
                    ? 'border border-border bg-card text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
