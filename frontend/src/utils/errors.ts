import { ApiError } from '../api/apiError'
import i18n from '../i18n'
import errorsCatalog from '../locales/en/errors.json'

/** FastAPI validation failures arrive as a list of these. */
type ValidationDetail = { msg?: string }

/**
 * A coded backend error: a stable machine-readable `code`, player-facing prose
 * in `message`, and the runtime values that prose interpolates in `params`.
 *
 * `code` is what the copy catalog is keyed by and what callers branch on.
 * `message` is the backend's own prose, kept as the fallback for any code the
 * catalog does not know. `params` is absent whenever the raise site had nothing
 * to interpolate — see `backend/errors.py`.
 */
type CodedDetail = {
  code?: string
  message?: string
  params?: Record<string, unknown>
}

/** Where `backend/errors.py::ErrorCode` values are keyed in the copy catalog. */
const ERRORS_NAMESPACE = 'errors'
const CODE_KEY_PREFIX = 'codes'

/**
 * The codes `errors.json` actually carries — read off the catalog itself.
 *
 * i18next types keys as a literal union built from the resources, so a key
 * composed from an unconstrained `string` does not compile (the problem
 * `components/feed/feedItemLabels.ts` solves with a hand-written map of its 15
 * types). Deriving the union from the imported JSON solves it without a second
 * copy of the code list to drift: the catalog stays the single frontend
 * inventory, and `backend/tests/unit/test_i18n_catalog_coverage.py` is what
 * holds it level with the backend enum.
 */
type CatalogedCode = keyof typeof errorsCatalog.codes

function isCataloged(code: string): code is CatalogedCode {
  return code in errorsCatalog.codes
}

/** i18next interpolation placeholders, as written in the catalog values. */
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g

/**
 * The catalog value i18next will resolve for this code and context.
 *
 * Read so {@link hasEveryPlaceholder} can inspect the template *before*
 * rendering it. Mirrors i18next's own context resolution: prefer the
 * `<CODE>_<context>` sibling, fall back to the base key.
 */
function catalogTemplate(code: CatalogedCode, context: unknown): string {
  if (typeof context === 'string' && context) {
    const contextual = `${code}_${context}`
    if (isCataloged(contextual)) return errorsCatalog.codes[contextual]
  }
  return errorsCatalog.codes[code]
}

/**
 * Does `params` supply every value this catalog string interpolates?
 *
 * The guard that makes the catalog safe during a deploy skew. A backend that
 * predates the `params` channel still sends `{code, message}`, and a catalog
 * entry like "This task requires level {{level}}." would render as "This task
 * requires level ." — strictly worse than the prose it replaced, and on the
 * frontend-deploys-first path that has taken this site down before. When a
 * value is missing the catalog simply does not apply and `message` wins.
 */
function hasEveryPlaceholder(
  template: string,
  params: Record<string, unknown> | undefined
): boolean {
  for (const [, name] of template.matchAll(PLACEHOLDER_PATTERN)) {
    if (params?.[name] === undefined) return false
  }
  return true
}

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
  // ADR-0088: the XHR sign-in lanes (ATProto, public key) meet a 409 where the
  // OAuth redirect family would have been SENT to the gate; the lane navigates.
  returningPlayerConsentRequired: 'RETURNING_PLAYER_CONSENT_REQUIRED',
} as const

/**
 * The catalog's words for a coded error, or null if it has none (ADR-0031).
 *
 * This is the emit-keys half of #1401: the backend sends `code` + the `params`
 * its prose interpolates, and `errors.json` owns the wording. A code the
 * catalog has never heard of returns null so the caller falls back to the
 * backend's own `message` — which is how a newly-coded raise can ship before
 * its catalog entry does, and how a deploy-skewed client stays useful.
 *
 * Membership is checked before `t` rather than letting the lookup miss, because
 * `i18n.ts` installs a `missingKeyHandler` that THROWS in dev and test. An
 * unknown code here is an ordinary runtime condition — an older client meeting
 * a newer backend — not a build defect, so it must not take the error path down
 * with it.
 *
 * `params.context` is i18next's discriminator, not an interpolation value: it
 * resolves `<CODE>_<context>` for the handful of codes whose prose differs by
 * the surface that raised them, falling back to the base key when the catalog
 * has no such sibling. Spreading `params` passes both at once.
 */
function catalogMessage(detail: CodedDetail): string | null {
  const { code, params } = detail
  if (typeof code !== 'string' || !isCataloged(code)) return null
  if (!hasEveryPlaceholder(catalogTemplate(code, params?.context), params)) {
    return null
  }

  const rendered = i18n.t(`${ERRORS_NAMESPACE}:${CODE_KEY_PREFIX}.${code}`, {
    ...params,
  })
  return typeof rendered === 'string' && rendered ? rendered : null
}

/**
 * The catalog's words for a bare `ErrorCode` value, or null if it has none.
 *
 * For the one failure that arrives with no response body to read: an OAuth
 * callback is a top-level navigation, so `backend/routers/auth.py` hands its
 * code back in the `?login=` query param instead of a `detail` (#1773). Same
 * catalog and the same unknown-code safety as {@link extractError} — a code
 * this client has never heard of returns null rather than tripping the
 * throwing `missingKeyHandler`, so the caller can fall back to generic copy.
 */
export function messageForCode(code: string): string | null {
  return catalogMessage({ code })
}

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

  // Coded object. The catalog owns the words when it knows this code; the
  // backend's own prose is the fallback for every code it does not.
  const fromCatalog = catalogMessage(detail)
  if (fromCatalog) return fromCatalog

  // A bare code with no message is still not shown: a raw code reads worse to
  // a player than the caller's fallback does.
  const message = detail.message
  if (typeof message !== 'string' || message === GENERIC_SERVER_PROSE) return null
  return message || null
}

/** The body every failing route answers with — FastAPI's `detail` envelope. */
type ErrorBody = { detail?: ErrorDetail }

/**
 * What a failed request tells us (#1400).
 *
 * ONE transport reaches here now. `api/client.ts` throws {@link ApiError} for
 * every answer that arrived and was not 2xx, carrying the status and the parsed
 * body directly — where axios hung both off `err.response`, and this function
 * read both shapes for as long as both were live.
 *
 * Everything else is "no answer": an `ApiNetworkError` (fetch itself rejected —
 * offline, DNS, connection refused), or a throw that was never a request failure
 * at all. Neither has a status, and `extractError` keys its network branch off
 * exactly that absence — see the note there.
 */
function failureOf(err: unknown): {
  status: number | undefined
  body: ErrorBody | undefined
} {
  if (err instanceof ApiError) {
    return { status: err.status, body: err.data as ErrorBody | undefined }
  }
  return { status: undefined, body: undefined }
}

/**
 * Extracts a user-friendly error message from a failed request — an
 * {@link ApiError} from the API client, or anything else a `catch` caught.
 *
 * Priority:
 *   1. FastAPI `detail` from the response body (skip generic "Internal Server Error"), as either
 *      a plain string, a validation array (uses the first item's msg), or a
 *      coded `{ code, message, params }` object — which resolves the `errors.json`
 *      catalog by `code` first (interpolated with `params`) and falls back to
 *      `message` for any code the catalog does not carry
 *   2. Server error (5xx) with no useful detail — server-side problem message
 *   3. Network error (no response at all) — connection message
 *   4. Caller-provided fallback, or generic default
 */
export function extractError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const { status, body } = failureOf(err)

  // Surface meaningful detail from the backend (e.g. "Task requires level 3")
  const message = displayableDetail(body?.detail)
  if (message) return message

  // 5xx with no useful detail — the server hit an unhandled error
  if (status && status >= 500) {
    return 'The server ran into an unexpected problem. Try again in a moment.'
  }

  // Any other answer that ARRIVED — a 4xx with no usable detail, an unusual
  // status — is the caller's story to tell, not this module's.
  if (status !== undefined) return fallback

  // No status at all, so no answer at all: an `ApiNetworkError`, or a throw
  // from outside the transport. Keyed off the ABSENCE of a status rather than
  // `instanceof ApiNetworkError`, because the second case is real — a `catch`
  // here also receives ordinary bugs — and telling a player the request did not
  // get through is nearer the truth than the caller's "please try again", which
  // invites them to repeat something that never left the building.
  return 'Unable to reach the server. Check your connection and try again.'
}

/**
 * Extracts the machine-readable `code` from a failed request, or null.
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
  const detail = failureOf(err).body?.detail
  if (!detail || typeof detail === 'string' || Array.isArray(detail)) return null
  return typeof detail.code === 'string' ? detail.code : null
}
