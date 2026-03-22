import { create } from 'zustand'
import { generateId } from '@/lib/utils'

export interface DebugEntry {
  id: string
  url: string
  phase: 'search' | 'scrape' | 'sublink'
  status: 'accepted' | 'discarded' | 'timeout' | 'error' | 'list'
  reason: string
  reasoning?: string
  extracted?: Record<string, unknown>
  ts: number
}

interface DebugStore {
  entries: DebugEntry[]
  isOpen: boolean
  log: (entry: Omit<DebugEntry, 'id' | 'ts'>) => void
  clear: () => void
  setOpen: (v: boolean) => void
}

export const useDebugStore = create<DebugStore>((set) => ({
  entries: [],
  isOpen: false,
  log: (entry) =>
    set((s) => ({
      entries: [{ ...entry, id: generateId(), ts: Date.now() }, ...s.entries].slice(0, 200),
    })),
  clear: () => set({ entries: [] }),
  setOpen: (v) => set({ isOpen: v }),
}))
