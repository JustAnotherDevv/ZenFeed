import { useState, useCallback, useRef } from 'react'
import { Newspaper, Search, Mic, MicOff, Wand2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto border-t border-border bg-background">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-mono text-sm uppercase tracking-widest text-foreground">
            &gt; new_feed
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-8">
          {/* Feed Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setFeedType('news'); setParsed(false) }}
              className={`flex items-center justify-center gap-2 py-2.5 border font-mono text-xs uppercase tracking-wider transition-colors ${
                feedType === 'news'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              News
            </button>
            <button
              onClick={() => { setFeedType('events'); setParsed(false) }}
              className={`flex items-center justify-center gap-2 py-2.5 border font-mono text-xs uppercase tracking-wider transition-colors ${
                feedType === 'events'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Discovery
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="terminal-label mb-2">quick presets</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.filter(p => p.feedType === feedType).map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                    description === p.description
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Input */}
          <div className="space-y-2">
            <p className="terminal-label">describe what you want</p>
            <div className="relative">
              <textarea
                className="w-full min-h-[96px] border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none pr-10"
                placeholder={feedType === 'events'
                  ? '"Active web3 hackathons with prizes, no job postings"'
                  : '"Latest AI and ML news, no crypto spam"'}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setParsed(false) }}
              />
              <button
                onClick={toggleVoice}
                className={`absolute top-2.5 right-2.5 p-1.5 transition-colors ${
                  isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-primary'
                }`}
                title={isListening ? 'Stop recording' : 'Speak to describe your feed'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            {isListening && (
              <p className="terminal-label text-destructive animate-pulse">listening // speak now</p>
            )}
          </div>

          {/* Generate Button */}
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-border font-mono text-xs uppercase tracking-widest text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-30"
            onClick={handleGenerate}
            disabled={!description.trim() || isParsing}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {isParsing ? 'Generating...' : 'Generate Feed Config'}
          </button>

          {/* Parsed Config Review */}
          {parsed && (
            <div className="border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-primary uppercase tracking-wider">feed preview</span>
                <span className="terminal-label border border-border px-2 py-0.5">{feedType}</span>
              </div>

              <div className="space-y-1">
                <p className="terminal-label">feed name</p>
                <input
                  className="w-full border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:border-primary"
                  value={parsedName}
                  onChange={(e) => setParsedName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <p className="terminal-label">keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsedKeywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase px-1.5 py-0.5 border border-border text-foreground">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-destructive ml-0.5">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {parsedNegKeywords.length > 0 && (
                <div className="space-y-1">
                  <p className="terminal-label">exclude</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedNegKeywords.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase px-1.5 py-0.5 border border-destructive/30 text-destructive/70">
                        -{kw}
                        <button onClick={() => removeNegKeyword(kw)} className="hover:text-destructive ml-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {feedType === 'news' && (
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 terminal-label hover:text-foreground transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    freshness
                  </button>
                  {showAdvanced && (
                    <div className="flex gap-2">
                      {FRESHNESS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFreshness(opt.value)}
                          className={`flex-1 py-1.5 font-mono text-[10px] uppercase tracking-wider border transition-colors ${
                            freshness === opt.value
                              ? 'border-primary bg-primary/10 text-primary'
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

          <button
            className="w-full py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-30"
            onClick={handleCreate}
            disabled={!parsed || !parsedName.trim() || parsedKeywords.length === 0}
          >
            {feedType === 'events' ? 'Create Discovery Feed' : 'Create Feed'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
