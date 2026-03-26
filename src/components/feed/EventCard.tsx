import { ExternalLink } from 'lucide-react'
import { cn, truncate, formatDeadline, daysUntil } from '@/lib/utils'
import type { EventItem } from '@/types/feed'

interface EventCardProps {
  item: EventItem
  highlighted?: boolean
  index: number
  compact?: boolean
}

const statusConfig = {
  active:   { dot: '●', label: 'ACTIVE',   color: 'text-primary',          border: 'border-l-primary' },
  upcoming: { dot: '●', label: 'UPCOMING', color: 'text-[#58a6ff]',        border: 'border-l-[#58a6ff]' },
  ended:    { dot: '○', label: 'ENDED',    color: 'text-muted-foreground', border: 'border-l-transparent' },
}

export function EventCard({ item, highlighted, index, compact = false }: EventCardProps) {
  const days = daysUntil(item.deadline)
  const status = statusConfig[item.status] ?? statusConfig.active

  const isValidUrl = (url?: string) => {
    if (!url) return false
    try {
      const u = new URL(url)
      return u.protocol.startsWith('http') && !u.hostname.match(/^(localhost|127\.|0\.0\.0\.0|::1)/)
    } catch { return false }
  }
  const registerUrl = isValidUrl(item.registrationUrl) ? item.registrationUrl!
    : isValidUrl(item.url) ? item.url
    : null

  if (compact) {
    return (
      <div
        className={cn(
          'w-full bg-card border border-border border-l-2 overflow-hidden flex flex-col',
          status.border,
          'animate-fade-in',
          highlighted && 'card-highlighted'
        )}
        style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
      >
        <a href={isValidUrl(item.url) ? item.url : undefined} target="_blank" rel="noopener noreferrer" className="flex-1 block p-3 hover:bg-muted/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className={cn('terminal-label', status.color)}>
              {status.dot} {status.label}
            </span>
            {item.prizes && (
              <span className="font-mono text-[10px] text-[#f0a500] font-medium">
                {truncate(item.prizes, 16)}
              </span>
            )}
          </div>
          <h3 className="font-mono font-medium text-foreground text-xs leading-snug mb-1.5">
            {truncate(item.title, 60)}
          </h3>
          {item.organizer && (
            <p className="terminal-label">by {item.organizer}</p>
          )}
          {item.deadline && (
            <p className={cn('font-mono text-[10px] mt-1.5', status.color)}>
              {formatDeadline(item.deadline)}{days !== null && days >= 0 ? ` · ${days}d` : ''}
            </p>
          )}
          {item.location && (
            <p className="terminal-label mt-0.5 truncate">{item.location}</p>
          )}
        </a>
        <div className="px-3 pb-3 mt-auto">
          {registerUrl ? (
            <a
              href={registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 w-full py-1.5 bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Register <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="flex items-center justify-center w-full py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border border-border opacity-40">
              No Link
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-card border border-border border-l-2 overflow-hidden',
        status.border,
        'animate-fade-in',
        highlighted && 'card-highlighted'
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {/* Clickable body */}
      <a
        href={isValidUrl(item.url) ? item.url : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 hover:bg-muted/30 transition-colors"
      >
        {/* Status + source row */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn('terminal-label', status.color)}>
            {status.dot} {status.label}
          </span>
          <div className="flex items-center gap-3">
            {item.location && (
              <span className="terminal-label">{item.location}</span>
            )}
            <span className="terminal-label">{item.source}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-mono font-medium text-foreground text-sm leading-snug mb-2">
          {truncate(item.title, 100)}
        </h3>

        {/* Organizer + team size */}
        {(item.organizer || item.teamSize) && (
          <p className="terminal-label mb-2">
            {item.organizer && <span>by {item.organizer}</span>}
            {item.organizer && item.teamSize && <span className="mx-2 opacity-40">//</span>}
            {item.teamSize && <span>{item.teamSize}</span>}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.tags.slice(0, 4).map(tag => (
              <span key={tag} className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border border-primary/30 text-primary">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tech stack */}
        {item.techStack && item.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.techStack.slice(0, 3).map(tech => (
              <span key={tech} className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 border border-border text-muted-foreground">
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {item.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 font-mono">
            {truncate(item.summary, 140)}
          </p>
        )}

        {/* Prize + Deadline */}
        {(item.prizes || item.deadline) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1 font-mono text-xs">
            {item.prizes && (
              <span className="text-[#f0a500]">
                <span className="terminal-label mr-1.5">prize</span>
                {truncate(item.prizes, 30)}
              </span>
            )}
            {item.deadline && (
              <span className={status.color}>
                <span className="terminal-label mr-1.5">deadline</span>
                {formatDeadline(item.deadline)}
                {days !== null && days >= 0 && <span className="text-muted-foreground ml-1.5">· {days}d left</span>}
                {days !== null && days < 0 && <span className="text-muted-foreground ml-1.5">· ended</span>}
              </span>
            )}
          </div>
        )}
      </a>

      {/* Register CTA */}
      <div className="px-4 pb-4">
        {registerUrl ? (
          <a
            href={registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Register <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="flex items-center justify-center w-full py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground border border-border opacity-40">
            No Link
          </span>
        )}
      </div>
    </div>
  )
}
