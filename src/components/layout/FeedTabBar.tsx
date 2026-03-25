import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Feed } from '@/types/feed'

interface FeedTabBarProps {
  feeds: Feed[]
  activeIndex: number
  onSelect: (i: number) => void
}

export function FeedTabBar({ feeds, activeIndex, onSelect }: FeedTabBarProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    tabRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex])

  return (
    <div className="flex overflow-x-auto scrollbar-hide border-b border-border bg-background">
      <div className="flex min-w-max">
        {feeds.map((feed, i) => (
          <button
            key={feed.id}
            ref={(el) => { tabRefs.current[i] = el }}
            onClick={() => onSelect(i)}
            className={cn(
              'px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors border-b-2',
              i === activeIndex
                ? 'border-b-primary text-primary'
                : 'border-b-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {feed.name}
          </button>
        ))}
      </div>
    </div>
  )
}
