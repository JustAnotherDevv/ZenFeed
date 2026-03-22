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
      <div className="flex px-2 py-1 gap-1 min-w-max">
        {feeds.map((feed, i) => (
          <button
            key={feed.id}
            ref={(el) => { tabRefs.current[i] = el }}
            onClick={() => onSelect(i)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              i === activeIndex
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {feed.name}
          </button>
        ))}
      </div>
    </div>
  )
}
