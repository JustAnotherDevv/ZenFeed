import { cn, formatDate, truncate } from '@/lib/utils'
import type { FeedItem } from '@/types/feed'

interface FeedCardProps {
  item: FeedItem
  highlighted?: boolean
  index: number
}

export function FeedCard({ item, highlighted, index }: FeedCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block bg-card border-b border-border overflow-hidden',
        'transition-all duration-100',
        'hover:bg-muted/40 hover:border-l-2 hover:border-l-primary',
        'animate-fade-in',
        highlighted && 'card-highlighted border-l-2 border-l-primary'
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {item.imageUrl && (
        <div className="relative h-36 overflow-hidden bg-muted">
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover opacity-80"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.parentElement!.style.display = 'none'
            }}
          />
        </div>
      )}
      <div className="p-4">
        <p className="terminal-label mb-2">
          {item.source}
          {item.publishedAt && (
            <> // {formatDate(item.publishedAt)}</>
          )}
        </p>
        <h3 className="font-mono font-medium text-foreground text-sm leading-snug mb-2">
          {truncate(item.title, 100)}
        </h3>
        {item.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed font-mono">
            {truncate(item.summary, 160)}
          </p>
        )}
      </div>
    </a>
  )
}
