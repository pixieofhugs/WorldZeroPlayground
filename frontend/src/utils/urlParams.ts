/**
 * Reading untrusted URL params — the one whitelist both browse pages share
 * (#1537).
 *
 * A URL is a user-facing surface, not an API call. The list routes 422 on an
 * unrecognised enumerated value (`GET /tasks` since #1443, `GET /praxes` from
 * the start), which is right for a caller sending garbage and wrong for a
 * player following a link: a bookmark saved before a value was renamed should
 * degrade to the default view, not to an error page.
 *
 * This lived module-private in `pages/praxes/feedFilterParams.ts` while the task
 * browse read its three axes with a bare `params.get(key) || default` and
 * forwarded whatever the address bar said. Promoted rather than copied —
 * a second implementation is how the two pages drifted apart in the first place.
 */

/**
 * The value `raw` names, or `fallback` when it names nothing in `allowed`.
 *
 * Absent (`null`) and present-but-blank (`?sort=`) both miss the whitelist and
 * so both land on the fallback, which is what a missing axis has always meant.
 */
export function readOneOf<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback
}
