import { Plus, Settings } from 'lucide-react'

interface TopBarProps {
  onAddFeed: () => void
  onSettings?: () => void
}

export function TopBar({ onAddFeed, onSettings }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">Z</span>
        </div>
        <span className="font-bold text-foreground text-lg tracking-tight">ZenFeed</span>
      </div>
      <div className="flex items-center gap-1">
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
