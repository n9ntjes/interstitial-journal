import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/** Spec §5.7 — visible tab / window */
export const REFETCH_INTERVAL_VISIBLE_MS = 3_000

/** Spec §5.7 — background tab or otherwise hidden document */
export const REFETCH_INTERVAL_HIDDEN_MS = 10_000

export function refetchIntervalByVisibility(): number {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return REFETCH_INTERVAL_HIDDEN_MS
  }
  return REFETCH_INTERVAL_VISIBLE_MS
}

/**
 * §5.7 — Single app-level poll scheduler.
 *
 * We do **not** use `defaultOptions.queries.refetchInterval`: React Query runs
 * that per `QueryObserver`, so multiple observers (e.g. dev StrictMode or any
 * duplicate subscription) each register an interval and the same query can
 * fetch twice per tick. One timer + `refetchQueries({ type: 'active' })` runs
 * each active query at most once per poll.
 */
export function VisibilityRefetchBridge() {
  const qc = useQueryClient()
  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
        timeoutId = undefined
      }
    }

    const scheduleNext = () => {
      clearTimer()
      if (cancelled) return
      timeoutId = setTimeout(runTick, refetchIntervalByVisibility())
    }

    const runTick = () => {
      if (cancelled) return
      void qc.refetchQueries({ type: 'active' }).finally(() => {
        if (!cancelled) scheduleNext()
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void qc.refetchQueries({ type: 'active' })
      }
      scheduleNext()
    }

    document.addEventListener('visibilitychange', onVisibility)
    scheduleNext()

    return () => {
      cancelled = true
      clearTimer()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [qc])
  return null
}
