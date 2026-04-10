import { motion } from 'motion/react';
import { Bot, User } from 'lucide-react';
import { ScrollArea } from './scroll-area';
import type { CallTranscriptSegment } from '../../data/mockData';

interface ChatConversationProps {
  messages: CallTranscriptSegment[];
  patientName: string;
}

export function ChatConversation({ messages, patientName }: ChatConversationProps) {
  return (
    <ScrollArea className="h-[450px] pr-4">
      <div className="space-y-4 pb-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex gap-3 ${message.speaker === 'ai' ? '' : 'flex-row-reverse'}`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                message.speaker === 'ai'
                  ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2]'
                  : 'bg-gradient-to-br from-[#27AE60] to-[#56CCF2]'
              } text-white`}
            >
              {message.speaker === 'ai' ? (
                <Bot className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>

            <div className={`flex-1 max-w-[75%] ${message.speaker === 'ai' ? '' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-600">
                  {message.speaker === 'ai' ? 'Aiva' : patientName}
                </span>
                <span className="text-xs text-gray-400">{message.timestamp}</span>
              </div>
              <div
                className={`p-4 rounded-2xl break-words ${
                  message.speaker === 'ai'
                    ? 'bg-white border border-gray-200'
                    : 'bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white'
                }`}
              >
                <p
                  className={`text-sm leading-relaxed ${
                    message.speaker === 'ai' ? 'text-gray-700' : 'text-white'
                  }`}
                >
                  {message.text}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
}
