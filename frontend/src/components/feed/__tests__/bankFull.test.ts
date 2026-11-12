import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ApiError, ApiNetworkError } from '../../../api/apiError'
import { isTaskBankFull } from '../bankFull'

/**
 * #1598: the drop-to-accept trigger reads the error code, not English prose.
 * Matching `detail.includes("Task bank is full")` silently broke when the body
 * became `{code, message}`. The click path is hand-verified; the decision is
 * an exported predicate tested here.
 */

/** An `ApiError` as `api/client.ts` reports one (#1400). */
const apiError = (status: number, detail?: unknown) =>
  new ApiError(new Response(null, { status }), detail === undefined ? {} : { detail })

const BANK_FULL_PROSE = 'Task bank is full (20 in-progress praxes).'

describe('isTaskBankFull', () => {
  it('recognises the coded body every live backend path now sends', () => {
    // `services/praxis.py::respond_to_invite`.
    expect(
      isTaskBankFull(apiError(409, { code: 'TASK_BANK_FULL', message: BANK_FULL_PROSE }))
    ).toBe(true)
    // Duel and signup answer 400; status must not be part of the decision.
    expect(
      isTaskBankFull(apiError(400, { code: 'TASK_BANK_FULL', message: BANK_FULL_PROSE }))
    ).toBe(true)
  })

  it('recognises the code even with no prose attached', () => {
    expect(isTaskBankFull(apiError(409, { code: 'TASK_BANK_FULL' }))).toBe(true)
  })

  it('still recognises the bare-string body, for the deploy-skew window', () => {
    // Deploy skew: an older API may still answer prose (#1401).
    expect(isTaskBankFull(apiError(409, BANK_FULL_PROSE))).toBe(true)
  })

  it('does not fire on some other failure', () => {
    expect(
      isTaskBankFull(
        apiError(400, { code: 'INVITE_PRAXIS_SUBMITTED', message: 'Cannot join a submitted praxis.' })
      )
    ).toBe(false)
    expect(isTaskBankFull(apiError(403, 'This invite is not for you.'))).toBe(false)
    expect(isTaskBankFull(apiError(404, { code: 'TASK_LEVEL_TOO_LOW' }))).toBe(false)
    expect(isTaskBankFull(apiError(500))).toBe(false)
    expect(isTaskBankFull(new ApiNetworkError(new TypeError('Failed to fetch')))).toBe(false)
    expect(isTaskBankFull(undefined)).toBe(false)
  })
})

describe('the card decides through the predicate, not a raw body read', () => {
  it('FeedCardCollabInvite holds no second reader of response.data.detail', () => {
    const text = readFileSync(
      new URL('../FeedCardCollabInvite.tsx', import.meta.url),
      'utf8'
    )
    expect(text).not.toContain('response?: { data?: { detail?: unknown } }')
    expect(text).not.toContain('data?.detail')
    expect(text).toContain('isTaskBankFull(err)')
  })
})
