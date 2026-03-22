import { ExternalLink } from 'lucide-react'
import { cn, truncate, formatDeadline, daysUntil } from '@/lib/utils'
import type { EventItem } from '@/types/feed'

interface EventCardProps {
  item: EventItem
  highlighted?: boolean
  index: number
}

const statusConfig = {
  active: { label: 'Active', className: 'bg-green-500/15 text-green-600' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/15 text-blue-600' },
  ended: { label: 'Ended', className: 'bg-muted text-muted-foreground' },
}

export function EventCard({ item, highlighted, index }: EventCardProps) {
  const days = daysUntil(item.deadline)
  const status = statusConfig[item.status] ?? statusConfig.active
  const registerUrl = item.registrationUrl ?? item.url

  return (
    <div
      className={cn(
        'bg-card rounded-2xl border border-border overflow-hidden',
        'animate-fade-in',
        highlighted && 'card-highlighted'
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Clickable body */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 active:bg-muted/50 transition-colors"
      >
        {/* Status + source row */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', status.className)}>
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground">{item.source}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-foreground text-sm leading-snug mb-1">
          {truncate(item.title, 100)}
        </h3>

        {/* Organizer */}
        {item.organizer && (
          <p className="text-xs text-muted-foreground mb-2">by {item.organizer}</p>
        )}

        {/* Description */}
        {item.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {truncate(item.summary, 140)}
          </p>
        )}

        {/* Prize + Deadline badges */}
        {(item.prizes || item.deadline) && (
          <div className="flex flex-wrap gap-2 mb-1">
            {item.prizes && (
              <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg px-2.5 py-1.5">
                <span className="text-xs">Prize</span>
                <span className="text-xs font-bold">{truncate(item.prizes, 30)}</span>
              </div>
            )}
            {item.deadline && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary rounded-lg px-2.5 py-1.5">
                <span className="text-xs">Deadline</span>
                <span className="text-xs font-bold">{formatDeadline(item.deadline)}</span>
                {days !== null && days >= 0 && (
                  <span className="text-xs opacity-75">· {days}d left</span>
                )}
                {days !== null && days < 0 && (
                  <span className="text-xs opacity-75">· ended</span>
                )}
              </div>
            )}
          </div>
        )}
      </a>

      {/* Register CTA */}
      <div className="px-4 pb-4">
        <a
          href={registerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:opacity-80 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          Register
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
