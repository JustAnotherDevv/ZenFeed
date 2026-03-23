import { useState } from 'react'
import { X, Trash2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, List, Search } from 'lucide-react'
import { useDebugStore, type DebugEntry } from '@/store/useDebugStore'

function statusIcon(status: DebugEntry['status']) {
  switch (status) {
    case 'accepted': return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
    case 'discarded': return <XCircle className="w-4 h-4 text-red-400 shrink-0" />
    case 'timeout':
    case 'error': return <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
    case 'list': return <List className="w-4 h-4 text-blue-400 shrink-0" />
  }
}

function statusColor(status: DebugEntry['status']) {
  switch (status) {
    case 'accepted': return 'bg-green-500/10 text-green-600 border-green-500/20'
    case 'discarded': return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'timeout':
    case 'error': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    case 'list': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  }
}

function EntryRow({ entry }: { entry: DebugEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hostname = (() => { try { return new URL(entry.url).hostname.replace('www.', '') } catch { return entry.url } })()

  return (
    <div className={`rounded-lg border p-2.5 text-xs ${statusColor(entry.status)}`}>
      <div className="flex items-start gap-2">
        {statusIcon(entry.status)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono truncate opacity-70">{hostname}</span>
            <span className="shrink-0 opacity-50 text-[10px]">{entry.phase}</span>
          </div>
          <p className="mt-0.5 leading-relaxed opacity-90">{entry.reason}</p>
        </div>
        {(entry.reasoning || entry.extracted) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-current/10 space-y-2">
          {entry.reasoning && (
            <div>
              <p className="font-semibold opacity-60 mb-0.5">AI reasoning</p>
              <p className="opacity-80 leading-relaxed">{entry.reasoning}</p>
            </div>
          )}
          {entry.extracted && Object.keys(entry.extracted).length > 0 && (
            <div>
              <p className="font-semibold opacity-60 mb-0.5">Extracted</p>
              <pre className="text-[10px] opacity-70 whitespace-pre-wrap break-all overflow-auto max-h-40">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(entry.extracted).filter(([k]) =>
                      ['name','status','deadline','endDate','startDate','prizes','isEvent','isEventList'].includes(k)
                    )
                  ),
                  null, 2
                )}
              </pre>
            </div>
          )}
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block underline opacity-60 hover:opacity-100 truncate"
          >
            {entry.url}
          </a>
        </div>
      )}
    </div>
  )
}

export function DebugPanel() {
  const entries = useDebugStore((s) => s.entries)
  const intent = useDebugStore((s) => s.intent)
  const queries = useDebugStore((s) => s.queries)
  const isOpen = useDebugStore((s) => s.isOpen)
  const [queriesExpanded, setQueriesExpanded] = useState(false)
  const { clear, setOpen } = useDebugStore()

  if (!isOpen) return null

  const accepted = entries.filter(e => e.status === 'accepted').length
  const discarded = entries.filter(e => e.status === 'discarded').length
  const timeouts = entries.filter(e => e.status === 'timeout' || e.status === 'error').length
  const lists = entries.filter(e => e.status === 'list').length

  return (
    <div className="fixed inset-y-0 right-0 w-80 max-w-[90vw] bg-background border-l border-border z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
        <div className="flex-1 min-w-0 mr-2">
          <span className="font-semibold text-sm">Extraction Debug</span>
          {intent && (
            <p className="text-xs text-primary/80 bg-primary/8 rounded-lg px-2 py-1 mt-1.5 leading-relaxed">
              "{intent}"
            </p>
          )}
          {queries.length > 0 && (
            <div className="mt-1.5">
              <button
                onClick={() => setQueriesExpanded(!queriesExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Search className="w-3 h-3" />
                {queries.length} search queries
                {queriesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {queriesExpanded && (
                <div className="mt-1 space-y-1">
                  {queries.map((q, i) => (
                    <p key={i} className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-2 py-1 truncate">
                      {q}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {accepted > 0 && <span className="text-green-600">{accepted} accepted</span>}
            {accepted > 0 && discarded > 0 && <span className="text-muted-foreground"> · </span>}
            {discarded > 0 && <span className="text-red-500">{discarded} discarded</span>}
            {(timeouts > 0 || lists > 0) && <span className="text-muted-foreground"> · {timeouts + lists} other</span>}
            {entries.length === 0 && <span>No entries yet — refresh a feed</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clear}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-muted-foreground">Refresh a Discovery feed to see extraction logs.</p>
          </div>
        ) : (
          entries.map(entry => <EntryRow key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  )
}
