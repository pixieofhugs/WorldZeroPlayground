import { useCallback, useEffect, useState, type DependencyList } from 'react'

interface UseResourceResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface ResourceHandlers<T> {
  onStart: () => void
  onData: (data: T) => void
  onError: (error: Error) => void
  onSettle: () => void
}

/**
 * Pure async orchestration behind {@link useResource}, extracted so the state
 * machine is testable without a DOM (the repo tests hooks via extracted pure
 * functions). Order: `onStart` first (flip loading, clear prior error), then
 * exactly one of `onData` / `onError`, then `onSettle` — all after-fetch
 * callbacks skipped once `isCancelled()` is true (dep change / unmount race).
 */
export async function runResource<T>(
  fetchFn: () => Promise<T>,
  handlers: ResourceHandlers<T>,
  isCancelled: () => boolean = () => false,
): Promise<void> {
  handlers.onStart()
  try {
    const result = await fetchFn()
    if (!isCancelled()) handlers.onData(result)
  } catch (err: unknown) {
    if (!isCancelled()) {
      handlers.onError(err instanceof Error ? err : new Error(String(err)))
    }
  } finally {
    if (!isCancelled()) handlers.onSettle()
  }
}

/**
 * Fetch state for a simple read-once page: runs `fetchFn` on mount, whenever
 * `deps` change, and on `refetch()`. Every run flips `loading` true and clears
 * any prior `error` first — the correct-on-edge default several call sites
 * currently forget.
 *
 * `error` is the raw Error; each page renders its own copy (e.g. via
 * `extractError`). No enabled/skip guard, no error-swallow mode, no
 * pagination — a site that needs those stays hand-rolled.
 */
export function useResource<T>(
  fetchFn: () => Promise<T>,
  deps: DependencyList,
): UseResourceResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const refetch = useCallback(() => setReloadNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    void runResource(
      fetchFn,
      {
        onStart: () => {
          setLoading(true)
          setError(null)
        },
        onData: setData,
        onError: setError,
        onSettle: () => setLoading(false),
      },
      () => cancelled,
    )
    return () => {
      cancelled = true
    }
    // fetchFn is an inline closure per call site; `deps` is the explicit re-run
    // key (mirrors the pages this replaces).
  }, [...deps, reloadNonce])

  return { data, loading, error, refetch }
}
