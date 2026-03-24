import { useState, useRef, useCallback } from 'react'
import { ArrowRight, Mic, MicOff, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFeedStore } from '@/store/useFeedStore'
import { useFeedSearch } from '@/hooks/useFeedSearch'
import { parseFeedDescription } from '@/api/claude'
import type { FeedType } from '@/types/feed'

const PRESETS: { label: string; description: string; feedType: FeedType }[] = [
  { label: 'VC & Fundraising', feedType: 'news', description: 'Latest Series A and venture capital funding rounds and startup news' },
  { label: 'AI & Tech', feedType: 'news', description: 'Artificial intelligence, LLM and machine learning tech news' },
  { label: 'Web3 Hackathons', feedType: 'events', description: 'Find active web3 blockchain hackathons with prizes, no job postings or past winners' },
  { label: 'AI Competitions', feedType: 'events', description: 'Find active AI and machine learning hackathons and competitions with prize money' },
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
    <div className="flex flex-col h-svh bg-background">
      {/* Step 0: Welcome */}
      {step === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -inset-3 rounded-3xl bg-primary/20 animate-pulse -z-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">Welcome to ZenFeed</h1>
          <p className="text-muted-foreground leading-relaxed mb-10">
            Your personalized AI news companion. Create custom feeds on any topic and let your voice guide you through the latest.
          </p>
          <Button className="w-full h-14 text-base rounded-2xl" onClick={() => setStep(1)}>
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Powered by Firecrawl + ElevenLabs</p>
        </div>
      )}

      {/* Step 1: Create first feed */}
      {step === 1 && (
        <div className="flex flex-col flex-1 px-6 pt-12 pb-8 overflow-y-auto">
          <h1 className="text-2xl font-bold text-foreground mb-1">What do you want to track?</h1>
          <p className="text-muted-foreground text-sm mb-6">Describe it in plain language or pick a quick start.</p>

          {/* Presets */}
          <p className="text-xs font-medium text-muted-foreground mb-2">Quick start</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`p-3 rounded-2xl border text-left transition-colors text-sm font-medium ${
                  description === p.description
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* NL input */}
          <p className="text-xs font-medium text-muted-foreground mb-2">Or describe what you want</p>
          <div className="relative mb-3">
            <textarea
              className="w-full min-h-[88px] rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none pr-10"
              placeholder='e.g. "Active web3 hackathons with prize money, no job listings or past winners"'
              value={description}
              onChange={(e) => { setDescription(e.target.value); setParsed(false) }}
            />
            <button
              onClick={toggleVoice}
              className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg transition-colors ${
                isListening ? 'bg-destructive/10 text-destructive animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 mb-4"
            onClick={handleGenerate}
            disabled={!description.trim() || isParsing}
          >
            <Wand2 className="w-4 h-4" />
            {isParsing ? 'Generating…' : 'Generate Feed Config'}
          </Button>

          {/* Parsed preview */}
          {parsed && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{parsedName}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{parsedFeedType}</span>
              </div>
              <p className="text-xs text-muted-foreground">{parsedKeywords.join(', ')}</p>
              {parsedNegKeywords.length > 0 && (
                <p className="text-xs text-destructive/70">exclude: {parsedNegKeywords.join(', ')}</p>
              )}
            </div>
          )}

          <div className="mt-auto">
            <Button
              className="w-full h-14 text-base rounded-2xl"
              onClick={createAndContinue}
              disabled={!parsed || !parsedName.trim() || parsedKeywords.length === 0}
            >
              Create Feed <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Voice setup */}
      {step === 2 && (
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl">
              <Mic className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="absolute -inset-3 rounded-full bg-primary/20 animate-pulse-ring -z-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Enable voice</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            ZenFeed works hands-free. Your AI voice companion can read your feed, answer questions, and update your topics — just ask.
          </p>
          <p className="text-xs text-muted-foreground bg-muted px-4 py-3 rounded-xl mb-8">
            Try saying: <span className="font-medium text-foreground">"Summarize my feed"</span> or <span className="font-medium text-foreground">"Add climate tech to my topics"</span>
          </p>
          <Button className="w-full h-14 text-base rounded-2xl mb-3" onClick={finish}>
            Enable Voice <Mic className="ml-2 w-5 h-5" />
          </Button>
          <button onClick={finish} className="text-sm text-muted-foreground">Skip for now</button>
        </div>
      )}
    </div>
  )
}
