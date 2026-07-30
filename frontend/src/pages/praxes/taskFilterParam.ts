/**
 * `?task_id=` on the praxis feed (#1050) — the pure half.
 *
 * Task-detail surfaces have always linked "view all N praxis" to
 * `/praxis?task_id=${task.id}`, and the backend list route has always accepted
 * `task_id`. The feed hook read no search params at all, so the filter was built
 * by the linker and thrown away by the page it landed on: the player asked for
 * one task's proof and silently got the whole game's.
 *
 * The fix is this one read in `usePraxes`, not a change in every caller. It is
 * still worth having now that the task-details v2 skins expand their gallery in
 * place instead of linking out: `/praxis?task_id=N` is a URL people can share or
 * bookmark, and today it lies.
 *
 * The filter is strictly OPTIONAL — a bare `/praxis` is still the whole feed.
 *
 * Kept pure and separate from the hook so it is testable: the repo's harness is
 * `renderToStaticMarkup` only (no jsdom, effects never run), so a self-fetching
 * feed cannot be driven from a test. Same posture as `useSearchQueryParam`'s
 * `readSearchQuery` / `nextSearchQueryParams`.
 */

/** The URL param the praxis feed reads for its task filter. */
export const TASK_FILTER_PARAM = 'task_id'

/**
 * Navigation options for clearing the filter: replace, never push. The player
 * arrived here from the task itself, so Back should return to that task rather
 * than to the filtered feed they just dismissed. Matches the posture
 * `SEARCH_QUERY_NAV_OPTIONS` sets for `?q=`.
 */
export const TASK_FILTER_NAV_OPTIONS = { replace: true } as const

/**
 * Read the task filter out of the URL. `null` means "no filter" — which is
 * every malformed value too (`?task_id=abc`, `?task_id=3.5`, `?task_id=-1`,
 * `?task_id=`). A junk param must degrade to the unfiltered feed, never to a
 * request that asks the API about task `NaN`.
 */
export function readTaskIdParam(params: URLSearchParams): number | null {
  const raw = params.get(TASK_FILTER_PARAM)
  if (raw === null) return null
  const trimmed = raw.trim()
  // Digits only: ids are positive integers, and this rejects '3.5', '1e3',
  // '0x2', ' -1' and '' before Number() can coerce any of them into something
  // plausible-looking.
  if (!/^\d+$/.test(trimmed)) return null
  const taskId = Number(trimmed)
  return Number.isSafeInteger(taskId) && taskId > 0 ? taskId : null
}

/**
 * The next param set with the task filter dropped. Every other param — the
 * `?q=` search in particular — is carried through untouched, so clearing the
 * task filter doesn't also wipe a search the player typed while filtered.
 */
export function withoutTaskIdParam(previous: URLSearchParams): URLSearchParams {
  const nextParams = new URLSearchParams(previous)
  nextParams.delete(TASK_FILTER_PARAM)
  return nextParams
}
