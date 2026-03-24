import { useState, useCallback, useRef } from 'react'
import { Newspaper, Search, Mic, MicOff, Wand2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'
import { parseFeedDescription } from '@/api/claude'
import type { FeedType } from '@/types/feed'

const PRESETS = [
  { name: 'Web3 Hackathons', feedType: 'events' as FeedType, description: 'Find active web3 blockchain hackathons with prizes, not job postings or past winners' },
  { name: 'AI Competitions', feedType: 'events' as FeedType, description: 'Find AI and machine learning hackathons and competitions with prizes' },
  { name: 'Startup Grants', feedType: 'events' as FeedType, description: 'Find startup grants, founder competitions and pitch competitions' },
  { name: 'VC News', feedType: 'news' as FeedType, description: 'Series A funding rounds, venture capital news and YC startup news' },
  { name: 'AI & Tech', feedType: 'news' as FeedType, description: 'Artificial intelligence, LLM and machine learning tech news' },
  { name: 'Crypto & Web3', feedType: 'news' as FeedType, description: 'Bitcoin, Ethereum, DeFi and crypto market news' },
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
  const [description, setDescription] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [feedType, setFeedType] = useState<FeedType>('news')
  const [freshness, setFreshness] = useState<'qdr:d' | 'qdr:w' | 'qdr:m'>('qdr:d')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Parsed config state
  const [parsedName, setParsedName] = useState('')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [parsedNegKeywords, setParsedNegKeywords] = useState<string[]>([])
  const [parsed, setParsed] = useState(false)

  const recognitionRef = useRef<any>(null)
  const store = useFeedStore()
  const { fetchFeed } = useFeedSearch()

  const reset = () => {
    setDescription('')
    setParsedName('')
    setParsedKeywords([])
    setParsedNegKeywords([])
    setParsed(false)
    setFeedType('news')
    setFreshness('qdr:d')
    setShowAdvanced(false)
    setIsListening(false)
    setIsParsing(false)
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setDescription(preset.description)
    setFeedType(preset.feedType)
    setParsed(false)
  }

  const handleGenerate = useCallback(async () => {
    const text = description.trim()
    if (!text) return
    setIsParsing(true)
    try {
      const config = await parseFeedDescription(text)
      setParsedName(config.name)
      setParsedKeywords(config.positiveKeywords)
      setParsedNegKeywords(config.negativeKeywords)
      setFeedType(config.feedType)
      setParsed(true)
    } finally {
      setIsParsing(false)
    }
  }, [description])

  const handleCreate = () => {
    if (!parsedName.trim() || parsedKeywords.length === 0) return
    const effectiveFreshness = feedType === 'events' ? 'qdr:m' : freshness
    const id = store.addFeed({
      name: parsedName.trim(),
      keywords: parsedKeywords,
      negativeKeywords: parsedNegKeywords,
      freshness: effectiveFreshness,
      feedType,
      naturalDescription: description.trim(),
    })
    const feed = {
      id,
      name: parsedName.trim(),
      keywords: parsedKeywords,
      negativeKeywords: parsedNegKeywords,
      freshness: effectiveFreshness,
      feedType,
      naturalDescription: description.trim(),
      createdAt: Date.now(),
    }
    fetchFeed(feed)
    store.setActiveIndex(store.feeds.length)
    onOpenChange(false)
    reset()
  }

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      if (transcript) setDescription((prev) => (prev ? prev + ' ' + transcript : transcript))
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    rec.start()
    recognitionRef.current = rec
    setIsListening(true)
  }, [isListening])

  const removeKeyword = (kw: string) => setParsedKeywords((prev) => prev.filter((k) => k !== kw))
  const removeNegKeyword = (kw: string) => setParsedNegKeywords((prev) => prev.filter((k) => k !== kw))

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Create Feed</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-8">
          {/* Feed Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setFeedType('news'); setParsed(false) }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                feedType === 'news'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              News Feed
            </button>
            <button
              onClick={() => { setFeedType('events'); setParsed(false) }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${
                feedType === 'events'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Search className="w-4 h-4" />
              Discovery
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quick presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.filter(p => p.feedType === feedType).map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    description === p.description
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'border-border bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Input */}
          <div className="space-y-2">
            <Label>Describe what you want</Label>
            <div className="relative">
              <textarea
                className="w-full min-h-[96px] rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none pr-10"
                placeholder={feedType === 'events'
                  ? 'e.g. "I want to find active web3 hackathons with prizes, no job postings or past winner announcements"'
                  : 'e.g. "Latest AI and machine learning news, no crypto spam"'}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setParsed(false) }}
              />
              <button
                onClick={toggleVoice}
                className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? 'bg-destructive/10 text-destructive animate-pulse'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                }`}
                title={isListening ? 'Stop recording' : 'Speak to describe your feed'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            {isListening && (
              <p className="text-xs text-destructive animate-pulse">Listening… speak now</p>
            )}
          </div>

          {/* Generate Button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={!description.trim() || isParsing}
          >
            <Wand2 className="w-4 h-4" />
            {isParsing ? 'Generating…' : 'Generate Feed Config'}
          </Button>

          {/* Parsed Config Review */}
          {parsed && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">Feed Preview</span>
                <Badge variant="secondary" className="text-xs">{feedType}</Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Feed name</Label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={parsedName}
                  onChange={(e) => setParsedName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Search keywords</Label>
                <div className="flex flex-wrap gap-1.5">
                  {parsedKeywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="flex items-center gap-1 pr-1 text-xs">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-destructive ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {parsedNegKeywords.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Exclude</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedNegKeywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="flex items-center gap-1 pr-1 text-xs text-destructive border-destructive/30">
                        -{kw}
                        <button onClick={() => removeNegKeyword(kw)} className="hover:text-destructive ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {feedType === 'news' && (
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Freshness
                  </button>
                  {showAdvanced && (
                    <div className="flex gap-2">
                      {FRESHNESS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFreshness(opt.value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            freshness === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!parsed || !parsedName.trim() || parsedKeywords.length === 0}
          >
            {feedType === 'events' ? 'Create Discovery Feed' : 'Create Feed'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
