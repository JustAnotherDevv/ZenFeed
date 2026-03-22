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
  const [negKeywordInput, setNegKeywordInput] = useState('')
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

  const addNegKeyword = () => {
    const kw = negKeywordInput.trim()
    if (kw && !feed.negativeKeywords?.includes(kw)) {
      store.updateFeed(feed.id, { negativeKeywords: [...(feed.negativeKeywords ?? []), kw] })
    }
    setNegKeywordInput('')
  }

  const removeNegKeyword = (kw: string) => {
    store.updateFeed(feed.id, { negativeKeywords: feed.negativeKeywords?.filter((k) => k !== kw) ?? [] })
  }

  const handleDelete = () => {
    store.deleteFeed(feed.id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <SheetTitle>{feed.name}</SheetTitle>
            <Badge variant="secondary" className="text-xs">{feed.feedType}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {/* AI Description */}
          {feed.naturalDescription && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">AI description</p>
              <p className="text-sm bg-muted rounded-xl px-3 py-2.5 text-foreground leading-relaxed">
                {feed.naturalDescription}
              </p>
            </div>
          )}

          {/* Search keywords */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Search keywords</p>
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

          {/* Exclude keywords */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Exclude keywords</p>
            {(feed.negativeKeywords?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {feed.negativeKeywords?.map((kw) => (
                  <Badge key={kw} variant="outline" className="flex items-center gap-1 pr-1 text-destructive border-destructive/30">
                    -{kw}
                    <button onClick={() => removeNegKeyword(kw)} className="ml-0.5 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add exclusion keyword"
                value={negKeywordInput}
                onChange={(e) => setNegKeywordInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addNegKeyword() } }}
              />
              <Button variant="outline" size="icon" onClick={addNegKeyword}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Feed
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
