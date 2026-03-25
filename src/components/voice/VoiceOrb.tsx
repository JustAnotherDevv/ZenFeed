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
      {/* Pulse rings — green glow when active */}
      {isSpeaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-primary opacity-20 animate-pulse-ring-fast" />
          <span className="absolute inset-0 rounded-full bg-primary opacity-10 animate-pulse-ring-fast" style={{ animationDelay: '0.25s' }} />
        </>
      )}
      {isConnected && !isSpeaking && (
        <span className="absolute inset-0 rounded-full bg-primary opacity-15 animate-pulse-ring" />
      )}

      <button
        onClick={onToggle}
        disabled={isConnecting}
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center',
          'transition-all duration-200 active:scale-90 border border-primary/40',
          isConnected && !isSpeaking && 'bg-primary/10 shadow-[0_0_12px_rgba(57,211,83,0.2)]',
          isSpeaking && 'bg-primary scale-110 shadow-[0_0_20px_rgba(57,211,83,0.4)]',
          isConnecting && 'bg-primary/20',
          isError && 'bg-destructive/10 border-destructive/40',
          status === 'idle' && 'bg-background hover:bg-primary/10',
        )}
        aria-label={isConnected ? 'Stop voice session' : 'Start voice session'}
      >
        {isConnecting ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : isError ? (
          <MicOff className="w-5 h-5 text-destructive" />
        ) : isSpeaking ? (
          <Mic className="w-5 h-5 text-primary-foreground" />
        ) : (
          <Mic className="w-5 h-5 text-primary" />
        )}
      </button>
    </div>
  )
}
