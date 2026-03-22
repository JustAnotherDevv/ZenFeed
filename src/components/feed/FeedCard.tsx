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
        'block bg-card rounded-2xl border border-border overflow-hidden',
        'active:scale-[0.98] transition-transform duration-100',
        'animate-fade-in',
        highlighted && 'card-highlighted'
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      {item.imageUrl && (
        <div className="relative h-40 overflow-hidden bg-muted">
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.parentElement!.style.display = 'none'
            }}
          />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
          {item.source}
          {item.publishedAt && (
            <>
              <span className="text-border">·</span>
              {formatDate(item.publishedAt)}
            </>
          )}
        </p>
        <h3 className="font-semibold text-foreground text-sm leading-snug mb-2">
          {truncate(item.title, 100)}
        </h3>
        {item.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {truncate(item.summary, 160)}
          </p>
        )}
      </div>
    </a>
  )
}
