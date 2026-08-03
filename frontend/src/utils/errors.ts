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
 * The `backend/errors.py::ErrorCode` values this client actually branches on.
 *
 * A mirror, not a copy: only the codes some component switches behaviour on
 * belong here, and each one's string is the wire contract (renaming it on
 * either side is a break). Codes that are merely *displayed* need no entry —
 * `extractError` shows their `message` without knowing what they are.
 */
export const ErrorCode = {
  taskBankFull: 'TASK_BANK_FULL',
} as const

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

/**
 * Extracts the machine-readable `code` from an axios error, or null.
 *
 * The read side of `extractError`: that one answers "what do I show the
 * player", this one answers "which failure was it". Both go through the same
 * `detail` typing on purpose — the collab-invite card once reached past
 * `extractError` for a raw `detail` and substring-matched English prose, which
 * meant coding that raise would have silently killed its retry flow (#1598).
 * A second reader is how that drifted, so there is one, here.
 *
 * Returns null for every uncoded shape (string, validation array, absent), so
 * callers can compare against `ErrorCode.*` without narrowing first.
 */
export function extractErrorCode(err: unknown): string | null {
  const detail = (err as AxiosError<{ detail?: ErrorDetail }>)?.response?.data
    ?.detail
  if (!detail || typeof detail === 'string' || Array.isArray(detail)) return null
  return typeof detail.code === 'string' ? detail.code : null
}
