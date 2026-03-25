interface EmptyFeedStateProps {
  feedName: string
  onRetry: () => void
}

export function EmptyFeedState({ feedName, onRetry }: EmptyFeedStateProps) {
  return (
    <div className="flex flex-col items-start py-20 px-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-6">
        {feedName} // no results
      </p>
      <div className="font-mono text-sm text-muted-foreground space-y-1 mb-8">
        <p className="text-foreground/40">$ scanning web for relevant content...</p>
        <p className="text-foreground/20">$ <span className="animate-blink">_</span></p>
      </div>
      <button
        onClick={onRetry}
        className="terminal-label text-primary hover:text-primary/70 transition-colors"
      >
        &gt; retry fetch
      </button>
    </div>
  )
}
