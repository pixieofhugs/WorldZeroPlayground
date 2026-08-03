import { describe, it, expect } from 'vitest'
import { ErrorCode, extractError, extractErrorCode } from '../errors'

/**
 * `extractError` has to read every shape the backend's `detail` field can take.
 * The coded-object case is the load-bearing one: when the backend starts
 * emitting `{ code, message }`, a client that only understands strings quietly
 * falls through to the generic fallback — the player is told "something went
 * wrong" instead of why, and no test fails, because the fallback is legitimate
 * behaviour. These cases make that regression loud.
 */

const axiosError = (status: number, detail?: unknown) => ({
  message: 'Request failed',
  response: { status, data: detail === undefined ? {} : { detail } },
})

const FALLBACK = 'Custom fallback.'

describe('extractError — detail shapes', () => {
  it('reads a plain string detail', () => {
    expect(extractError(axiosError(403, 'Task requires level 3'), FALLBACK)).toBe(
      'Task requires level 3'
    )
  })

  it('reads a FastAPI validation array, using the first item', () => {
    const detail = [
      { loc: ['body', 'title'], msg: 'Field required', type: 'missing' },
      { loc: ['body', 'body'], msg: 'String too short', type: 'too_short' },
    ]
    expect(extractError(axiosError(422, detail), FALLBACK)).toBe('Field required')
  })

  it('reads a coded { code, message } object, preferring message', () => {
    const detail = { code: 'TASK_LEVEL_TOO_LOW', message: 'You need level 3 to claim this task.' }
    expect(extractError(axiosError(403, detail), FALLBACK)).toBe(
      'You need level 3 to claim this task.'
    )
  })

  it('never shows a bare code to the player', () => {
    expect(extractError(axiosError(403, { code: 'TASK_LEVEL_TOO_LOW' }), FALLBACK)).toBe(FALLBACK)
  })

  it('falls back for an unrecognised detail shape', () => {
    expect(extractError(axiosError(400, 42), FALLBACK)).toBe(FALLBACK)
    expect(extractError(axiosError(400, {}), FALLBACK)).toBe(FALLBACK)
    expect(extractError(axiosError(400, []), FALLBACK)).toBe(FALLBACK)
    expect(extractError(axiosError(400, [{ type: 'missing' }]), FALLBACK)).toBe(FALLBACK)
    expect(extractError(axiosError(400), FALLBACK)).toBe(FALLBACK)
  })
})

describe('extractError — status and network fallbacks', () => {
  it('skips generic "Internal Server Error" prose in every shape', () => {
    const serverProse = 'The server ran into an unexpected problem. Try again in a moment.'
    expect(extractError(axiosError(500, 'Internal Server Error'), FALLBACK)).toBe(serverProse)
    expect(
      extractError(axiosError(500, { code: 'UNKNOWN', message: 'Internal Server Error' }), FALLBACK)
    ).toBe(serverProse)
  })

  it('reports a 5xx with no detail as a server-side problem', () => {
    expect(extractError(axiosError(503), FALLBACK)).toBe(
      'The server ran into an unexpected problem. Try again in a moment.'
    )
  })

  it('reports a missing response as a connection failure', () => {
    expect(extractError({ message: 'Network Error' }, FALLBACK)).toBe(
      'Unable to reach the server. Check your connection and try again.'
    )
    expect(extractError(undefined, FALLBACK)).toBe(
      'Unable to reach the server. Check your connection and try again.'
    )
  })

  it('uses the default fallback when the caller gives none', () => {
    expect(extractError(axiosError(400))).toBe('Something went wrong. Please try again.')
  })
})

/**
 * The ADR-0031 half of #1401: `errors.json` owns the words, the backend emits a
 * `code` plus the `params` its prose interpolates, and `message` is what a code
 * the catalog has never heard of still renders.
 */
describe('extractError — the errors.json catalog', () => {
  it('renders catalog copy for a code, interpolating params', () => {
    const detail = {
      code: 'TASK_LEVEL_TOO_LOW',
      message: 'This task requires level 3.',
      params: { level: 3 },
    }
    expect(extractError(axiosError(403, detail), FALLBACK)).toBe(
      'This task requires level 3.'
    )
  })

  it('prefers the catalog over the backend prose', () => {
    // Same code, deliberately divergent prose: whichever string comes back
    // proves which side won.
    const detail = {
      code: 'VOTE_BUDGET_EXHAUSTED',
      message: 'BACKEND PROSE',
    }
    expect(extractError(axiosError(403, detail), FALLBACK)).toBe(
      'No votes remaining in your budget.'
    )
  })

  it('resolves the context sibling when the raise site names one', () => {
    const flagged = (context: string) => ({
      code: 'FLAG_LEVEL_TOO_LOW',
      message: 'BACKEND PROSE',
      params: { level: 2, context },
    })
    expect(extractError(axiosError(403, flagged('comment')), FALLBACK)).toBe(
      'Must be level 2 or above to flag a comment.'
    )
    expect(extractError(axiosError(403, flagged('praxis')), FALLBACK)).toBe(
      'Must be level 2 or above to flag a praxis.'
    )
  })

  it('falls back to the base key for an unknown context', () => {
    const detail = {
      code: 'FLAG_LEVEL_TOO_LOW',
      message: 'BACKEND PROSE',
      params: { level: 2, context: 'nonesuch' },
    }
    expect(extractError(axiosError(403, detail), FALLBACK)).toBe(
      'Must be level 2 or above to flag.'
    )
  })

  it('falls back to message for a code the catalog does not carry', () => {
    const detail = { code: 'NOT_IN_THE_CATALOG', message: 'Backend prose wins.' }
    expect(extractError(axiosError(403, detail), FALLBACK)).toBe('Backend prose wins.')
  })

  /**
   * The deploy-skew guard. A backend that predates the `params` channel sends
   * `{code, message}` for a code whose catalog entry interpolates — rendering
   * it would produce "This task requires level ." at the player.
   */
  it('falls back to message when params for a placeholder are missing', () => {
    const detail = {
      code: 'TASK_LEVEL_TOO_LOW',
      message: 'This task requires level 3.',
    }
    expect(extractError(axiosError(403, detail), FALLBACK)).toBe(
      'This task requires level 3.'
    )
    expect(
      extractError(
        axiosError(403, { code: 'TASK_BANK_FULL', message: 'Task bank is full (20).' }),
        FALLBACK
      )
    ).toBe('Task bank is full (20).')
  })

  it('never renders a half-interpolated catalog string', () => {
    // No message either — the caller's fallback beats broken copy.
    expect(extractError(axiosError(403, { code: 'TASK_LEVEL_TOO_LOW' }), FALLBACK)).toBe(
      FALLBACK
    )
  })
})

/**
 * `extractErrorCode` exists so a caller can branch on *which* failure happened
 * without reaching past this module for a raw `detail` and matching English
 * prose — the exact drift that made a coded raise a silent UI break (#1598).
 */
describe('extractErrorCode', () => {
  it('reads the code off a coded detail', () => {
    const detail = { code: 'TASK_BANK_FULL', message: 'Task bank is full (20 in-progress praxes).' }
    expect(extractErrorCode(axiosError(409, detail))).toBe(ErrorCode.taskBankFull)
  })

  it('reads a bare code, which extractError deliberately will not show', () => {
    expect(extractErrorCode(axiosError(409, { code: 'TASK_BANK_FULL' }))).toBe(
      ErrorCode.taskBankFull
    )
    expect(extractError(axiosError(409, { code: 'TASK_BANK_FULL' }), FALLBACK)).toBe(FALLBACK)
  })

  it('returns null for every uncoded shape, so callers need no narrowing', () => {
    expect(extractErrorCode(axiosError(409, 'Task bank is full (20 in-progress praxes).'))).toBeNull()
    expect(extractErrorCode(axiosError(422, [{ msg: 'Field required' }]))).toBeNull()
    expect(extractErrorCode(axiosError(400, {}))).toBeNull()
    expect(extractErrorCode(axiosError(400, { message: 'no code here' }))).toBeNull()
    expect(extractErrorCode(axiosError(400, { code: 42 }))).toBeNull()
    expect(extractErrorCode(axiosError(400))).toBeNull()
    expect(extractErrorCode({ message: 'Network Error' })).toBeNull()
    expect(extractErrorCode(undefined)).toBeNull()
  })
})
