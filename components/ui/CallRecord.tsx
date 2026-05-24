import { motion } from 'motion/react';
import { Bot, User, Phone, Volume2, PhoneOff, Star } from 'lucide-react';
import { ScrollArea } from './scroll-area';
import { Button } from './button';
import { Badge } from './badge';
import type { CallTranscriptSegment } from '@/types';

interface CallRecordProps {
  transcript: CallTranscriptSegment[];
  patientName: string;
  duration: string;
  callQuality: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export function CallRecord({ transcript, patientName, duration, callQuality, sentiment }: CallRecordProps) {
  const sentimentColors = {
    positive: 'bg-green-100 text-green-700',
    neutral: 'bg-blue-100 text-blue-700',
    negative: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      {/* Call Summary Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#2F80ED]/5 to-[#56CCF2]/5 rounded-lg border border-[#2F80ED]/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2F80ED] to-[#56CCF2] rounded-full flex items-center justify-center">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-700">Call Duration:</span>
              <span className="text-sm font-semibold text-[#2F80ED]">{duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Quality:</span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < callQuality
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <Badge className={sentimentColors[sentiment]} variant="outline">
          Sentiment: {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
        </Badge>
      </div>

      {/* Call Transcript */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4 pb-4">
          {transcript.map((segment, index) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex gap-3 ${segment.speaker === 'ai' ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  segment.speaker === 'ai'
                    ? 'bg-gradient-to-br from-[#2F80ED] to-[#56CCF2]'
                    : 'bg-gradient-to-br from-[#27AE60] to-[#56CCF2]'
                } text-white shadow-md`}
              >
                {segment.speaker === 'ai' ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              <div className={`flex-1 max-w-[75%] ${segment.speaker === 'ai' ? '' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {segment.speaker === 'ai' ? 'Aiva AI' : patientName}
                  </span>
                  <span className="text-xs text-gray-400">{segment.timestamp}</span>
                  <Volume2 className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{segment.duration}</span>
                </div>
                <div
                  className={`p-4 rounded-2xl break-words shadow-sm ${
                    segment.speaker === 'ai'
                      ? 'bg-white border border-gray-200'
                      : 'bg-gradient-to-r from-[#2F80ED] to-[#56CCF2] text-white'
                  }`}
                >
                  <p
                    className={`text-sm leading-relaxed ${
                      segment.speaker === 'ai' ? 'text-gray-700' : 'text-white'
                    }`}
                  >
                    {segment.text}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Call Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <PhoneOff className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Call ended</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Volume2 className="w-4 h-4 mr-2" />
            Play Recording
          </Button>
          <Button variant="outline" size="sm">
            Download Transcript
          </Button>
        </div>
      </div>
    </div>
  );
}
