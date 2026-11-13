/**
 * Binds a feed's search box to `?q=` (#660), used by `usePraxes` and `useTasks`.
 * Only search rides in the URL (the one filter people share); other filters stay
 * local. The URL is the single source of truth; empty removes the param; writes
 * `replace` so back doesn't walk keystrokes. Debounce is at the call site.
 */
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export const SEARCH_QUERY_PARAM = 'q'

export const SEARCH_QUERY_NAV_OPTIONS = { replace: true } as const

export type SearchParamsSetter = (
  updater: (previous: URLSearchParams) => URLSearchParams,
  options: { replace: boolean },
) => void

/** Missing param → empty string, never `null`. */
export function readSearchQuery(params: URLSearchParams): string {
  return params.get(SEARCH_QUERY_PARAM) ?? ''
}

/** Empty value removes `q`; other params pass through. */
export function nextSearchQueryParams(
  previous: URLSearchParams,
  next: string,
): URLSearchParams {
  const nextParams = new URLSearchParams(previous)
  if (next) nextParams.set(SEARCH_QUERY_PARAM, next)
  else nextParams.delete(SEARCH_QUERY_PARAM)
  return nextParams
}

/** Functional updater so a param set between renders isn't clobbered. */
export function writeSearchQuery(setSearchParams: SearchParamsSetter, next: string): void {
  setSearchParams(
    (previous) => nextSearchQueryParams(previous, next),
    SEARCH_QUERY_NAV_OPTIONS,
  )
}

type SearchQueryBinding = [query: string, setQuery: (next: string) => void]

export function useSearchQueryParam(): SearchQueryBinding {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = readSearchQuery(searchParams)

  const setQuery = useCallback(
    (next: string) => writeSearchQuery(setSearchParams as SearchParamsSetter, next),
    [setSearchParams],
  )

  return [query, setQuery]
}
