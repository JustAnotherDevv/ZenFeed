import { Plus, Settings, RefreshCw, Bug } from 'lucide-react'
import { useDebugStore } from '@/store/useDebugStore'

interface TopBarProps {
  onAddFeed: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  onSettings?: () => void
}

export function TopBar({ onAddFeed, onRefresh, isRefreshing, onSettings }: TopBarProps) {
  const debugEntryCount = useDebugStore((s) => s.entries.length)
  const openDebug = () => useDebugStore.getState().setOpen(true)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-background border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 border border-primary flex items-center justify-center">
          <span className="text-primary font-mono font-medium text-xs">Z</span>
        </div>
        <span className="font-mono font-medium text-foreground text-sm tracking-[0.15em] uppercase">
          ZenFeed
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button
          onClick={openDebug}
          className="relative w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Extraction debug"
        >
          <Bug className="w-3.5 h-3.5" />
          {debugEntryCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary" />
          )}
        </button>
        {onSettings && (
          <button
            onClick={onSettings}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onAddFeed}
          className="w-8 h-8 flex items-center justify-center border border-primary/40 text-primary hover:bg-primary/10 transition-colors ml-1"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
