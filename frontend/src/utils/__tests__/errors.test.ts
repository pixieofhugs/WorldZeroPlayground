import { describe, it, expect } from 'vitest'
import { ApiError, ApiNetworkError } from '../../api/apiError'
import { ErrorCode, extractError, extractErrorCode } from '../errors'

/**
 * Every shape of the backend's `detail`. Misreading the coded `{ code, message }`
 * falls silently to the generic fallback, so these make it loud.
 */

/** A failed request as `api/client.ts` throws it (#1400). */
const apiError = (status: number, detail?: unknown) =>
  new ApiError(new Response(null, { status }), detail === undefined ? {} : { detail })

const FALLBACK = 'Custom fallback.'

describe('extractError — detail shapes', () => {
  it('reads a plain string detail', () => {
    expect(extractError(apiError(403, 'Task requires level 3'), FALLBACK)).toBe(
      'Task requires level 3'
    )
  })

  it('reads a FastAPI validation array, using the first item', () => {
    const detail = [
      { loc: ['body', 'title'], msg: 'Field required', type: 'missing' },
      { loc: ['body', 'body'], msg: 'String too short', type: 'too_short' },
    ]
    expect(extractError(apiError(422, detail), FALLBACK)).toBe('Field required')
  })

  it('reads a coded { code, message } object, preferring message', () => {
    const detail = { code: 'TASK_LEVEL_TOO_LOW', message: 'You need level 3 to claim this task.' }
    expect(extractError(apiError(403, detail), FALLBACK)).toBe(
      'You need level 3 to claim this task.'
    )
  })

  it('never shows a bare code to the player', () => {
    expect(extractError(apiError(403, { code: 'TASK_LEVEL_TOO_LOW' }), FALLBACK)).toBe(FALLBACK)
  })

  it('falls back for an unrecognised detail shape', () => {
    expect(extractError(apiError(400, 42), FALLBACK)).toBe(FALLBACK)
    expect(extractError(apiError(400, {}), FALLBACK)).toBe(FALLBACK)
    expect(extractError(apiError(400, []), FALLBACK)).toBe(FALLBACK)
    expect(extractError(apiError(400, [{ type: 'missing' }]), FALLBACK)).toBe(FALLBACK)
    expect(extractError(apiError(400), FALLBACK)).toBe(FALLBACK)
  })
})

describe('extractError — status and network fallbacks', () => {
  it('skips generic "Internal Server Error" prose in every shape', () => {
    const serverProse = 'The server ran into an unexpected problem. Try again in a moment.'
    expect(extractError(apiError(500, 'Internal Server Error'), FALLBACK)).toBe(serverProse)
    expect(
      extractError(apiError(500, { code: 'UNKNOWN', message: 'Internal Server Error' }), FALLBACK)
    ).toBe(serverProse)
  })

  it('reports a 5xx with no detail as a server-side problem', () => {
    expect(extractError(apiError(503), FALLBACK)).toBe(
      'The server ran into an unexpected problem. Try again in a moment.'
    )
  })

  /** No status (fetch rejected, or any other caught value): connection prose. */
  it('reports a request that got no answer as a connection failure', () => {
    expect(extractError(new ApiNetworkError(new TypeError('Failed to fetch')), FALLBACK)).toBe(
      'Unable to reach the server. Check your connection and try again.'
    )
    expect(extractError(undefined, FALLBACK)).toBe(
      'Unable to reach the server. Check your connection and try again.'
    )
  })

  it('uses the default fallback when the caller gives none', () => {
    expect(extractError(apiError(400))).toBe('Something went wrong. Please try again.')
  })
})

/** ADR-0031: `errors.json` owns the words; `message` covers unknown codes. */
describe('extractError — the errors.json catalog', () => {
  it('renders catalog copy for a code, interpolating params', () => {
    const detail = {
      code: 'TASK_LEVEL_TOO_LOW',
      message: 'This task requires level 3.',
      params: { level: 3 },
    }
    expect(extractError(apiError(403, detail), FALLBACK)).toBe(
      'This task requires level 3.'
    )
  })

  it('prefers the catalog over the backend prose', () => {
    const detail = {
      code: 'VOTE_BUDGET_EXHAUSTED',
      message: 'BACKEND PROSE',
    }
    expect(extractError(apiError(403, detail), FALLBACK)).toBe(
      'No votes remaining in your budget.'
    )
  })

  it('resolves the context sibling when the raise site names one', () => {
    const flagged = (context: string) => ({
      code: 'FLAG_LEVEL_TOO_LOW',
      message: 'BACKEND PROSE',
      params: { level: 2, context },
    })
    expect(extractError(apiError(403, flagged('comment')), FALLBACK)).toBe(
      'Must be level 2 or above to flag a comment.'
    )
    expect(extractError(apiError(403, flagged('praxis')), FALLBACK)).toBe(
      'Must be level 2 or above to flag a praxis.'
    )
  })

  it('falls back to the base key for an unknown context', () => {
    const detail = {
      code: 'FLAG_LEVEL_TOO_LOW',
      message: 'BACKEND PROSE',
      params: { level: 2, context: 'nonesuch' },
    }
    expect(extractError(apiError(403, detail), FALLBACK)).toBe(
      'Must be level 2 or above to flag.'
    )
  })

  it('falls back to message for a code the catalog does not carry', () => {
    const detail = { code: 'NOT_IN_THE_CATALOG', message: 'Backend prose wins.' }
    expect(extractError(apiError(403, detail), FALLBACK)).toBe('Backend prose wins.')
  })

  /** Deploy skew: no `params` would render "requires level ." */
  it('falls back to message when params for a placeholder are missing', () => {
    const detail = {
      code: 'TASK_LEVEL_TOO_LOW',
      message: 'This task requires level 3.',
    }
    expect(extractError(apiError(403, detail), FALLBACK)).toBe(
      'This task requires level 3.'
    )
    expect(
      extractError(
        apiError(403, { code: 'TASK_BANK_FULL', message: 'Task bank is full (20).' }),
        FALLBACK
      )
    ).toBe('Task bank is full (20).')
  })

  it('never renders a half-interpolated catalog string', () => {
    expect(extractError(apiError(403, { code: 'TASK_LEVEL_TOO_LOW' }), FALLBACK)).toBe(
      FALLBACK
    )
  })
})

/** Branch on the code, never on English prose (#1598). */
describe('extractErrorCode', () => {
  it('reads the code off a coded detail', () => {
    const detail = { code: 'TASK_BANK_FULL', message: 'Task bank is full (20 in-progress praxes).' }
    expect(extractErrorCode(apiError(409, detail))).toBe(ErrorCode.taskBankFull)
  })

  it('reads a bare code, which extractError deliberately will not show', () => {
    expect(extractErrorCode(apiError(409, { code: 'TASK_BANK_FULL' }))).toBe(
      ErrorCode.taskBankFull
    )
    expect(extractError(apiError(409, { code: 'TASK_BANK_FULL' }), FALLBACK)).toBe(FALLBACK)
  })

  it('returns null for every uncoded shape, so callers need no narrowing', () => {
    expect(extractErrorCode(apiError(409, 'Task bank is full (20 in-progress praxes).'))).toBeNull()
    expect(extractErrorCode(apiError(422, [{ msg: 'Field required' }]))).toBeNull()
    expect(extractErrorCode(apiError(400, {}))).toBeNull()
    expect(extractErrorCode(apiError(400, { message: 'no code here' }))).toBeNull()
    expect(extractErrorCode(apiError(400, { code: 42 }))).toBeNull()
    expect(extractErrorCode(apiError(400))).toBeNull()
    expect(extractErrorCode(new ApiNetworkError(new TypeError('Failed to fetch')))).toBeNull()
    expect(extractErrorCode(undefined)).toBeNull()
  })
})
