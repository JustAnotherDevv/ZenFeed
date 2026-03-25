import { useState, useRef, useCallback } from 'react'
import { ArrowRight, Mic, MicOff, Wand2 } from 'lucide-react'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'
import { parseFeedDescription } from '@/api/claude'
import type { FeedType } from '@/types/feed'

const PRESETS: { label: string; description: string; feedType: FeedType }[] = [
  { label: 'VC & Fundraising', feedType: 'news',   description: 'Latest Series A and venture capital funding rounds and startup news' },
  { label: 'AI & Tech',        feedType: 'news',   description: 'Artificial intelligence, LLM and machine learning tech news' },
  { label: 'Web3 Hackathons',  feedType: 'events', description: 'Find active web3 blockchain hackathons with prizes, no job postings or past winners' },
  { label: 'AI Competitions',  feedType: 'events', description: 'Find active AI and machine learning hackathons and competitions with prize money' },
]

export function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [description, setDescription] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState(false)
  const [parsedName, setParsedName] = useState('')
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([])
  const [parsedNegKeywords, setParsedNegKeywords] = useState<string[]>([])
  const [parsedFeedType, setParsedFeedType] = useState<FeedType>('news')

  const recognitionRef = useRef<any>(null)
  const store = useFeedStore()
  const { fetchFeed } = useFeedSearch()

  const explorePublicFeeds = useCallback(() => {
    PRESETS.forEach((preset) => {
      const freshness = preset.feedType === 'events' ? 'qdr:m' as const : 'qdr:d' as const
      const keywords = preset.description.split(' ').filter(w => w.length > 3).slice(0, 6)
      store.addFeed({
        name: preset.label,
        keywords,
        negativeKeywords: [],
        freshness,
        feedType: preset.feedType,
        naturalDescription: preset.description,
      })
    })
    store.completeOnboarding()
  }, [store])

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setDescription(preset.description)
    setParsedFeedType(preset.feedType)
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
      setParsedFeedType(config.feedType)
      setParsed(true)
    } finally {
      setIsParsing(false)
    }
  }, [description])

  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      const t = e.results[0]?.[0]?.transcript ?? ''
      if (t) setDescription((prev) => prev ? prev + ' ' + t : t)
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    rec.start()
    recognitionRef.current = rec
    setIsListening(true)
  }, [isListening])

  const createAndContinue = () => {
    if (!parsedName.trim() || parsedKeywords.length === 0) return
    const freshness = parsedFeedType === 'events' ? 'qdr:m' as const : 'qdr:d' as const
    const id = store.addFeed({
      name: parsedName.trim(),
      keywords: parsedKeywords,
      negativeKeywords: parsedNegKeywords,
      freshness,
      feedType: parsedFeedType,
      naturalDescription: description.trim(),
    })
    fetchFeed({ id, name: parsedName.trim(), keywords: parsedKeywords, negativeKeywords: parsedNegKeywords, freshness, feedType: parsedFeedType, naturalDescription: description.trim(), createdAt: Date.now() })
    setStep(2)
  }

  const finish = () => store.completeOnboarding()

  return (
    <div className="flex flex-col h-svh bg-background font-mono">
      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="flex flex-col items-start justify-center flex-1 px-8">
          <div className="mb-10">
            <div className="text-5xl font-mono font-medium text-primary mb-1 tracking-tight">
              [Z]
            </div>
            <div className="text-xs terminal-label mt-2">
              zenfeed // ai-powered feed aggregator
            </div>
          </div>

          <h1 className="text-2xl font-mono font-medium text-foreground mb-2 tracking-tight">
            ZenFeed<span className="text-primary animate-blink">_</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-10 max-w-sm">
            Describe any topic in plain language. Get a live, structured feed from the open web — events, news, funding rounds, anything.
          </p>

          <button
            className="w-full max-w-sm py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-4"
            onClick={() => setStep(1)}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={explorePublicFeeds}
            className="terminal-label text-muted-foreground hover:text-primary transition-colors"
          >
            &gt; skip — explore public feeds
          </button>

          <div className="mt-16 terminal-label opacity-40">
            powered by firecrawl + elevenlabs
          </div>
        </div>
      )}

      {/* Step 1: Create first feed */}
      {step === 1 && (
        <div className="flex flex-col flex-1 px-6 pt-10 pb-8 overflow-y-auto">
          <p className="terminal-label text-primary mb-1">&gt; configure_feed</p>
          <h1 className="text-xl font-mono font-medium text-foreground mb-1">What do you want to track?</h1>
          <p className="terminal-label mb-8">Describe it in plain language or pick a quick start.</p>

          {/* Presets */}
          <p className="terminal-label mb-2">quick start</p>
          <div className="grid grid-cols-2 gap-2 mb-8">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`p-3 border text-left transition-colors font-mono text-xs ${
                  description === p.description
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* NL input */}
          <p className="terminal-label mb-2">or describe what you want</p>
          <div className="relative mb-3">
            <textarea
              className="w-full min-h-[88px] border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none pr-10"
              placeholder='e.g. "Active web3 hackathons with prize money, no job listings"'
              value={description}
              onChange={(e) => { setDescription(e.target.value); setParsed(false) }}
            />
            <button
              onClick={toggleVoice}
              className={`absolute top-2.5 right-2.5 p-1.5 transition-colors ${
                isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-border font-mono text-xs uppercase tracking-wider text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors mb-4 disabled:opacity-30"
            onClick={handleGenerate}
            disabled={!description.trim() || isParsing}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {isParsing ? 'Generating...' : 'Generate Feed Config'}
          </button>

          {/* Parsed preview */}
          {parsed && (
            <div className="border border-primary/30 bg-primary/5 px-4 py-3 mb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-primary">{parsedName}</span>
                <span className="terminal-label border border-border px-2 py-0.5">{parsedFeedType}</span>
              </div>
              <p className="terminal-label">{parsedKeywords.join(' · ')}</p>
              {parsedNegKeywords.length > 0 && (
                <p className="terminal-label text-destructive/70">exclude: {parsedNegKeywords.join(' · ')}</p>
              )}
            </div>
          )}

          <div className="mt-auto">
            <button
              className="w-full py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-30"
              onClick={createAndContinue}
              disabled={!parsed || !parsedName.trim() || parsedKeywords.length === 0}
            >
              Create Feed <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Voice setup */}
      {step === 2 && (
        <div className="flex flex-col items-start justify-center flex-1 px-8">
          <p className="terminal-label text-primary mb-8">&gt; voice_setup</p>

          <div className="w-16 h-16 rounded-full border border-primary/40 flex items-center justify-center mb-8 bg-primary/5 shadow-[0_0_20px_rgba(57,211,83,0.15)]">
            <Mic className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-xl font-mono font-medium text-foreground mb-3">Enable voice</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm">
            Hands-free AI companion. Ask it to summarize your feed, add topics, or open articles.
          </p>
          <div className="border border-border px-4 py-3 mb-8 max-w-sm">
            <p className="terminal-label mb-1">try saying</p>
            <p className="font-mono text-xs text-foreground">"Summarize my feed"</p>
            <p className="font-mono text-xs text-foreground mt-1">"Add climate tech to my topics"</p>
          </div>

          <button
            className="w-full max-w-sm py-3 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-4"
            onClick={finish}
          >
            Enable Voice <Mic className="w-4 h-4" />
          </button>
          <button onClick={finish} className="terminal-label text-muted-foreground hover:text-foreground transition-colors">
            &gt; skip for now
          </button>
        </div>
      )}
    </div>
  )
}
