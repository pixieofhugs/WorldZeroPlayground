/**
 * useSearchQueryParam — binds a feed's free-text search box to the `?q=` URL
 * param (#660). Adopted by BOTH feed hooks in the same change (`usePraxes`,
 * `useTasks`); a one-page-only adoption is the inconsistency #660 was filed to
 * avoid.
 *
 * Deliberately narrow. Only the SEARCH query rides in the URL — faction, level,
 * status, sort, type and voted stay component-local `useState`. Search is the
 * one filter you'd paste to someone ("here's the praxis I mean"); there is no
 * equivalent urge for "level 3+ tasks". Named for what it does rather than the
 * issue's aspirational `useFilterParams`, and NOT generalised "for later" — it
 * can grow a second axis when one is actually wanted.
 *
 * Three decisions baked in:
 *
 * 1. The URL is the single source of truth for the value, so a shared or
 *    refreshed link hydrates the box on mount for free — no mirrored `useState`
 *    to drift out of sync.
 * 2. Non-default values only. `?q=` never appears empty; clearing the box
 *    removes the param outright rather than leaving `?q=` noise behind.
 * 3. `replace: true`, never a push. A debounced search field would otherwise
 *    write one history entry per keystroke and the back button would need 40
 *    presses to escape. Back should leave the feed, not walk the search letter
 *    by letter.
 *
 * The debounce lives at the call site (`useDebouncedValue`, 200ms): this hook
 * holds the raw box value, and the debounced copy keys the fetch as before.
 *
 * The two decisions worth pinning live in the pure {@link nextSearchQueryParams}
 * and {@link writeSearchQuery} below, so they are testable without a DOM (the
 * repo has no jsdom/renderHook — same posture as `usePagedResource`).
 */
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** The URL param this hook owns. */
export const SEARCH_QUERY_PARAM = 'q'

/**
 * Navigation options for every search write: replace, never push (decision 3).
 * Exported so the "no history entry per keystroke" rule is assertable.
 */
export const SEARCH_QUERY_NAV_OPTIONS = { replace: true } as const

/** The `setSearchParams` shape this hook depends on (the react-router setter). */
export type SearchParamsSetter = (
  updater: (previous: URLSearchParams) => URLSearchParams,
  options: { replace: boolean },
) => void

/**
 * Read the current search value out of the URL — the hydrate-on-mount path.
 * A missing param is an empty box, never `null`.
 */
export function readSearchQuery(params: URLSearchParams): string {
  return params.get(SEARCH_QUERY_PARAM) ?? ''
}

/**
 * The next param set for a given search value (decision 2): a non-empty value
 * is set, an empty one is REMOVED rather than left as `?q=` noise. Every other
 * param is carried through untouched.
 */
export function nextSearchQueryParams(
  previous: URLSearchParams,
  next: string,
): URLSearchParams {
  const nextParams = new URLSearchParams(previous)
  if (next) nextParams.set(SEARCH_QUERY_PARAM, next)
  else nextParams.delete(SEARCH_QUERY_PARAM)
  return nextParams
}

/**
 * Perform the write. Uses the functional updater form so a fast typist can't
 * clobber a param another surface set between renders, and always replaces.
 */
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
