import { useRef, useCallback } from 'react'
import { PULL_THRESHOLD_PX } from '@/lib/constants'

export function usePullToRefresh(onRefresh: () => void) {
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    pullingRef.current = false
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > PULL_THRESHOLD_PX) {
      pullingRef.current = true
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (pullingRef.current) {
      onRefresh()
    }
    startYRef.current = null
    pullingRef.current = false
  }, [onRefresh])

  return { onTouchStart, onTouchMove, onTouchEnd }
}
