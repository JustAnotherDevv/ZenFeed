import { useState, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'

const PRESETS = [
  { name: 'VC & Fundraising', keywords: ['Series A', 'venture capital', 'startup funding', 'YC'] },
  { name: 'AI & Tech', keywords: ['artificial intelligence', 'LLM', 'machine learning', 'OpenAI'] },
  { name: 'Fitness & Diet', keywords: ['workout', 'nutrition', 'fitness', 'health'] },
  { name: 'Crypto & Web3', keywords: ['Bitcoin', 'Ethereum', 'DeFi', 'crypto'] },
  { name: 'Product Hunt', keywords: ['Product Hunt launch', 'new product', 'startup launch'] },
  { name: 'Climate & Energy', keywords: ['climate tech', 'clean energy', 'sustainability'] },
]

const FRESHNESS_OPTIONS = [
  { value: 'qdr:d', label: 'Past 24h' },
  { value: 'qdr:w', label: 'Past week' },
  { value: 'qdr:m', label: 'Past month' },
] as const

interface CreateFeedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFeedModal({ open, onOpenChange }: CreateFeedModalProps) {
  const [name, setName] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [freshness, setFreshness] = useState<'qdr:d' | 'qdr:w' | 'qdr:m'>('qdr:d')
  const store = useFeedStore()
  const { fetchFeed } = useFeedSearch()

  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw])
    }
    setKeywordInput('')
  }, [keywordInput, keywords])

  const removeKeyword = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw))

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setName(preset.name)
    setKeywords(preset.keywords)
  }

  const handleCreate = () => {
    if (!name.trim() || keywords.length === 0) return
    const id = store.addFeed({ name: name.trim(), keywords, freshness })
    const feed = { id, name: name.trim(), keywords, freshness, createdAt: Date.now() }
    fetchFeed(feed)
    store.setActiveIndex(store.feeds.length)
    onOpenChange(false)
    setName('')
    setKeywords([])
    setKeywordInput('')
    setFreshness('qdr:d')
  }

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addKeyword()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Create Feed</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-8">
          {/* Presets */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quick presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="feed-name">Feed name</Label>
            <Input
              id="feed-name"
              placeholder="e.g. VC & Fundraising"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <Label htmlFor="keyword-input">Topics & keywords</Label>
            <div className="flex gap-2">
              <Input
                id="keyword-input"
                placeholder="Add keyword, press Enter"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
              />
              <Button variant="outline" size="icon" onClick={addKeyword}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="flex items-center gap-1 pr-1">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Freshness */}
          <div className="space-y-1.5">
            <Label>Freshness</Label>
            <div className="flex gap-2">
              {FRESHNESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFreshness(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    freshness === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!name.trim() || keywords.length === 0}
          >
            Create Feed
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
