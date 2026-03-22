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
    <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">Z</span>
        </div>
        <span className="font-bold text-foreground text-lg tracking-tight">ZenFeed</span>
      </div>
      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button
          onClick={openDebug}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Extraction debug"
        >
          <Bug className="w-4 h-4" />
          {debugEntryCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
        {onSettings && (
          <button
            onClick={onSettings}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onAddFeed}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
