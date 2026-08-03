import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ApiError, ApiNetworkError } from '../../../api/apiError'
import { isTaskBankFull } from '../bankFull'

/**
 * #1598 — the drop-to-accept trigger stops depending on English prose.
 *
 * THE BUG THIS PINS. `FeedCardCollabInvite` decided whether to open the
 * drop-a-praxis modal by reading `err.response.data.detail` raw and asking
 * `typeof detail === "string" && detail.includes("Task bank is full")`. The
 * moment that raise gained a `{code, message}` body the test suite stayed
 * green and the modal stopped opening: the player hit a full bank, got a bare
 * error, and had no way forward. Nothing failed because the branch is a UI
 * affordance rather than an assertion.
 *
 * WHAT THIS HARNESS CAN PROVE. `renderToStaticMarkup` in the `node`
 * environment has no DOM and runs no effects, so the click that reaches this
 * predicate cannot be driven here — the modal actually opening is hand-
 * verified. What *is* mechanical is the decision itself, which is why it is a
 * standalone exported function: every `detail` shape the backend can answer
 * with, in and out.
 */

/**
 * A failed request, as `api/client.ts` reports one: an `ApiError` carrying the
 * status and the parsed body (#1400). These cases were written against an
 * axios-shaped literal and are unchanged apart from the constructor.
 */
const apiError = (status: number, detail?: unknown) =>
  new ApiError(new Response(null, { status }), detail === undefined ? {} : { detail })

const BANK_FULL_PROSE = 'Task bank is full (20 in-progress praxes).'

describe('isTaskBankFull', () => {
  it('recognises the coded body every live backend path now sends', () => {
    // `services/praxis.py::respond_to_invite` — the collab accept this card drives.
    expect(
      isTaskBankFull(apiError(409, { code: 'TASK_BANK_FULL', message: BANK_FULL_PROSE }))
    ).toBe(true)
    // The duel twin and the shared signup denial answer 400, same code. The
    // status is not part of the decision and must not become part of it.
    expect(
      isTaskBankFull(apiError(400, { code: 'TASK_BANK_FULL', message: BANK_FULL_PROSE }))
    ).toBe(true)
  })

  it('recognises the code even with no prose attached', () => {
    expect(isTaskBankFull(apiError(409, { code: 'TASK_BANK_FULL' }))).toBe(true)
  })

  it('still recognises the bare-string body, for the deploy-skew window', () => {
    // Frontend and API deploy separately. Until no running API predates the
    // coded raise, this bundle can be talking to one that answers prose — the
    // window #1401 is sequenced client-first to survive.
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
    // The literal shape of the bug: any reach past utils/errors for the body.
    expect(text).not.toContain('response?: { data?: { detail?: unknown } }')
    expect(text).not.toContain('data?.detail')
    expect(text).toContain('isTaskBankFull(err)')
  })
})
