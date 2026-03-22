import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/types/feed'

interface VoiceOrbProps {
  status: AgentStatus
  isSpeaking: boolean
  onToggle: () => void
}

export function VoiceOrb({ status, isSpeaking, onToggle }: VoiceOrbProps) {
  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isError = status === 'error'

  return (
    <div className="fixed bottom-8 right-5 z-50 flex items-center justify-center">
      {/* Outer pulse rings */}
      {isSpeaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary opacity-20 animate-pulse-ring-fast" />
          <span className="absolute inset-0 rounded-full bg-primary opacity-15 animate-pulse-ring-fast" style={{ animationDelay: '0.2s' }} />
        </>
      )}
      {isConnected && !isSpeaking && (
        <span className="absolute inset-0 rounded-full bg-primary opacity-20 animate-pulse-ring" />
      )}

      <button
        onClick={onToggle}
        disabled={isConnecting}
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
          'transition-all duration-200 active:scale-90',
          isConnected && !isSpeaking && 'bg-primary',
          isSpeaking && 'bg-primary scale-110',
          isConnecting && 'bg-primary/70',
          isError && 'bg-destructive',
          status === 'idle' && 'bg-primary',
        )}
        aria-label={isConnected ? 'Stop voice session' : 'Start voice session'}
      >
        {isConnecting ? (
          <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
        ) : isError ? (
          <MicOff className="w-6 h-6 text-destructive-foreground" />
        ) : (
          <Mic className={cn('w-6 h-6 text-primary-foreground', isSpeaking && 'scale-110')} />
        )}
      </button>
    </div>
  )
}
