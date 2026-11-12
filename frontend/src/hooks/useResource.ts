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
 * Pure core of {@link useResource}: `onStart`, then one of `onData`/`onError`,
 * then `onSettle`; post-fetch callbacks skipped once `isCancelled()`.
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
 * Runs `fetchFn` on mount, on `deps` change and on `refetch()`; each run sets
 * loading and clears the prior error. `error` is raw; pages render their own copy.
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
    // fetchFn is an inline closure; `deps` is the explicit re-run key.
  }, [...deps, reloadNonce])

  return { data, loading, error, refetch }
}
