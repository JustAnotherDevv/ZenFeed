import { LayoutList, LayoutGrid } from 'lucide-react'

export type ViewMode = 'list' | 'grid'
export type SortKey = 'deadline_asc' | 'deadline_desc' | 'start_date' | 'end_date' | 'prize_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'deadline_asc',  label: 'Deadline ↑' },
  { value: 'deadline_desc', label: 'Deadline ↓' },
  { value: 'start_date',    label: 'Start' },
  { value: 'end_date',      label: 'End' },
  { value: 'prize_desc',    label: 'Prize' },
]

interface EventsToolbarProps {
  view: ViewMode
  sort: SortKey
  onViewChange: (v: ViewMode) => void
  onSortChange: (s: SortKey) => void
}

export function EventsToolbar({ view, sort, onViewChange, onSortChange }: EventsToolbarProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      {/* Sort options */}
      <div className="flex items-center gap-0 flex-1 overflow-x-auto scrollbar-hide">
        {SORT_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => onSortChange(o.value)}
            className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
              sort === o.value
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center border border-border">
        <button
          onClick={() => onViewChange('list')}
          className={`w-7 h-7 flex items-center justify-center transition-colors ${
            view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`w-7 h-7 flex items-center justify-center border-l border-border transition-colors ${
            view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
