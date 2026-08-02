import type { AxiosError } from 'axios'

/** FastAPI validation failures arrive as a list of these. */
type ValidationDetail = { msg?: string }

/**
 * A coded backend error: a stable machine-readable `code` plus player-facing
 * prose in `message`. `message` is what we display; `code` exists so callers
 * (and, later, an i18n catalog) can branch on the failure without matching prose.
 */
type CodedDetail = { code?: string; message?: string }

type ErrorDetail = string | ValidationDetail[] | CodedDetail

/** FastAPI's default 500 body — prose, but useless to a player. */
const GENERIC_SERVER_PROSE = 'Internal Server Error'

/**
 * Pulls the displayable prose out of a `detail` body, whatever shape it takes.
 * Returns null when there is nothing worth showing, so the caller falls through
 * to its status-based messages.
 */
function displayableDetail(detail: ErrorDetail | undefined): string | null {
  if (!detail) return null

  if (typeof detail === 'string') {
    return detail === GENERIC_SERVER_PROSE ? null : detail
  }

  if (Array.isArray(detail)) {
    return detail[0]?.msg || null
  }

  // Coded object — `message` carries the prose, `code` is for machines only.
  // A bare code with no message is not shown; a raw code reads worse to a
  // player than the caller's fallback does.
  const message = detail.message
  if (typeof message !== 'string' || message === GENERIC_SERVER_PROSE) return null
  return message || null
}

/**
 * Extracts a user-friendly error message from an axios error.
 *
 * Priority:
 *   1. FastAPI `detail` from the response body (skip generic "Internal Server Error"), as either
 *      a plain string, a validation array (uses the first item's msg), or a
 *      coded `{ code, message }` object (uses `message`)
 *   2. Server error (5xx) with no useful detail — server-side problem message
 *   3. Network error (no response at all) — connection message
 *   4. Caller-provided fallback, or generic default
 */
export function extractError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const e = err as AxiosError<{ detail?: ErrorDetail }>

  const status = e?.response?.status
  const detail = e?.response?.data?.detail

  // Surface meaningful detail from the backend (e.g. "Task requires level 3")
  const message = displayableDetail(detail)
  if (message) return message

  // 5xx with no useful detail — the server hit an unhandled error
  if (status && status >= 500) {
    return 'The server ran into an unexpected problem. Try again in a moment.'
  }

  // 4xx we didn't already handle (missing detail, unusual format)
  if (status && status >= 400) {
    return fallback
  }

  // No response object at all — genuine network failure
  if (e?.message === 'Network Error' || !e?.response) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  return fallback
}
