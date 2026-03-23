import { LayoutList, LayoutGrid, ArrowUpDown } from 'lucide-react'

export type ViewMode = 'list' | 'grid'
export type SortKey = 'deadline_asc' | 'deadline_desc' | 'start_date' | 'end_date' | 'prize_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'deadline_asc', label: 'Deadline ↑' },
  { value: 'deadline_desc', label: 'Deadline ↓' },
  { value: 'start_date', label: 'Start date' },
  { value: 'end_date', label: 'End date' },
  { value: 'prize_desc', label: 'Biggest prize' },
]

interface EventsToolbarProps {
  view: ViewMode
  sort: SortKey
  onViewChange: (v: ViewMode) => void
  onSortChange: (s: SortKey) => void
}

export function EventsToolbar({ view, sort, onViewChange, onSortChange }: EventsToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Sort dropdown */}
      <div className="flex items-center gap-1 flex-1">
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="text-xs bg-transparent text-muted-foreground focus:outline-none cursor-pointer hover:text-foreground"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
        <button
          onClick={() => onViewChange('list')}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
            view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onViewChange('grid')}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
            view === 'grid' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
