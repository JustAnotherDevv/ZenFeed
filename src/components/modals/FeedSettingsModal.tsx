import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'
import type { Feed } from '@/types/feed'

interface FeedSettingsModalProps {
  feed: Feed | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedSettingsModal({ feed, open, onOpenChange }: FeedSettingsModalProps) {
  const [keywordInput, setKeywordInput] = useState('')
  const store = useFeedStore()
  const { refresh } = useFeedSearch()

  if (!feed) return null

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !feed.keywords.includes(kw)) {
      store.addKeyword(feed.id, kw)
      refresh(feed)
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    store.updateFeed(feed.id, { keywords: feed.keywords.filter((k) => k !== kw) })
  }

  const handleDelete = () => {
    store.deleteFeed(feed.id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="mb-5">
          <SheetTitle>{feed.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Keywords</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {feed.keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="flex items-center gap-1 pr-1">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
              />
              <Button variant="outline" size="icon" onClick={addKeyword}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Feed
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
