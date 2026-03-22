import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeedStore } from '@/store/useFeedStore'
import type { AgentStatus } from '@/types/feed'

interface VoiceTranscriptProps {
  status: AgentStatus
  isSpeaking: boolean
  onClose: () => void
}

const statusLabel: Record<AgentStatus, string> = {
  idle: '',
  connecting: 'Connecting...',
  connected: 'Listening',
  error: 'Connection error',
}

export function VoiceTranscript({ status, isSpeaking, onClose }: VoiceTranscriptProps) {
  const transcript = useFeedStore((s) => s.transcript)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  if (status === 'idle') return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div className="bg-card border-t border-border rounded-t-3xl shadow-2xl max-h-[55vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isSpeaking ? 'bg-primary animate-pulse' : status === 'connected' ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'
            )} />
            <span className="text-sm font-medium text-foreground">
              {isSpeaking ? 'ZenFeed is speaking...' : statusLabel[status]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Try saying "Summarize my feed" or "Search for more about AI"
            </p>
          ) : (
            transcript.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
