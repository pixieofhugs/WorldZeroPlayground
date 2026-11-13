import { ApiError } from '../api/apiError'
import i18n from '../i18n'
import errorsCatalog from '../locales/en/errors.json'

type ValidationDetail = { msg?: string }

/** `message` is the fallback for codes the catalog lacks; see `backend/errors.py`. */
type CodedDetail = {
  code?: string
  message?: string
  params?: Record<string, unknown>
}

const ERRORS_NAMESPACE = 'errors'
const CODE_KEY_PREFIX = 'codes'

/**
 * Derived from the catalog so i18next's typed keys compile without a second
 * code list; `backend/tests/unit/test_i18n_catalog_coverage.py` holds it level.
 */
type CatalogedCode = keyof typeof errorsCatalog.codes

function isCataloged(code: string): code is CatalogedCode {
  return code in errorsCatalog.codes
}

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g

/** Mirrors i18next context resolution: `<CODE>_<context>`, else the base key. */
function catalogTemplate(code: CatalogedCode, context: unknown): string {
  if (typeof context === 'string' && context) {
    const contextual = `${code}_${context}`
    if (isCataloged(contextual)) return errorsCatalog.codes[contextual]
  }
  return errorsCatalog.codes[code]
}

/** Deploy-skew guard: an older backend omits `params`, so a missing value lets `message` win. */
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

/** FastAPI's default 500 body. */
const GENERIC_SERVER_PROSE = 'Internal Server Error'

/** Only the `backend/errors.py::ErrorCode` values the client branches on; strings are wire contract. */
export const ErrorCode = {
  taskBankFull: 'TASK_BANK_FULL',
  taskNotFound: 'TASK_NOT_FOUND',
  factionAlreadyMember: 'FACTION_ALREADY_MEMBER',
} as const

/**
 * Catalog wording for a coded error (ADR-0031, #1401), or null so the caller
 * falls back to `message`. Membership is checked first because `i18n.ts`'s
 * `missingKeyHandler` throws in dev/test, and an unknown code is ordinary skew.
 * `params.context` selects a `<CODE>_<context>` sibling.
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

/** For a bare code, e.g. the OAuth callback's `?login=` param (#1773). Null if unknown. */
export function messageForCode(code: string): string | null {
  return catalogMessage({ code })
}

/** Null when nothing is worth showing, so the caller falls to status-based messages. */
function displayableDetail(detail: ErrorDetail | undefined): string | null {
  if (!detail) return null

  if (typeof detail === 'string') {
    return detail === GENERIC_SERVER_PROSE ? null : detail
  }

  if (Array.isArray(detail)) {
    return detail[0]?.msg || null
  }

  const fromCatalog = catalogMessage(detail)
  if (fromCatalog) return fromCatalog

  // A bare code is never shown; the caller's fallback reads better.
  const message = detail.message
  if (typeof message !== 'string' || message === GENERIC_SERVER_PROSE) return null
  return message || null
}

type ErrorBody = { detail?: ErrorDetail }

/** {@link ApiError} = an answer arrived; anything else has no status (#1400). */
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
 * Priority: backend `detail` (string, first validation msg, or coded → catalog
 * then `message`); 5xx message; caller fallback for other answers; else network.
 */
export function extractError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const { status, body } = failureOf(err)

  const message = displayableDetail(body?.detail)
  if (message) return message

  if (status && status >= 500) {
    return 'The server ran into an unexpected problem. Try again in a moment.'
  }

  if (status !== undefined) return fallback

  // Keyed off the absence of a status, not `instanceof ApiNetworkError`: a
  // `catch` also receives ordinary bugs, and "did not get through" is nearer the truth.
  return 'Unable to reach the server. Check your connection and try again.'
}

/** The one reader of `detail.code` (#1598: never substring-match prose). Null when uncoded. */
export function extractErrorCode(err: unknown): string | null {
  const detail = failureOf(err).body?.detail
  if (!detail || typeof detail === 'string' || Array.isArray(detail)) return null
  return typeof detail.code === 'string' ? detail.code : null
}
