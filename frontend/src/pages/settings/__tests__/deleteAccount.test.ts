/**
 * #2161 — the two decisions behind the danger zone.
 *
 * SEAM: the pure module, not the component. The dialog's chrome (focus trap,
 * Escape, portal) needs a DOM this harness does not have; what CAN be proven
 * without one is the gate that arms the destructive button and the order the
 * three effects fire in. Both are the parts that ship a bug silently — a gate
 * that lets a near-miss through, and a sign-out that fires before the
 * navigation and bounces the reader off `/settings` before the farewell page
 * can render.
 */
import { describe, it, expect, vi } from 'vitest'
import { emailAuthorises, runDeleteAccount } from '../deleteAccount'

const EMAIL = 'pilgrim@example.com'

describe('the confirm gate is the account email', () => {
  it('arms on the exact address', () => {
    expect(emailAuthorises(EMAIL, EMAIL)).toBe(true)
  })

  it('forgives the two things a phone keyboard does to it', () => {
    expect(emailAuthorises('  Pilgrim@Example.com ', EMAIL)).toBe(true)
  })

  it('stays disarmed on a near miss', () => {
    expect(emailAuthorises('pilgrim@example.co', EMAIL)).toBe(false)
    expect(emailAuthorises('pilgrimexample.com', EMAIL)).toBe(false)
    expect(emailAuthorises('pilgrim @example.com', EMAIL)).toBe(false)
    expect(emailAuthorises('', EMAIL)).toBe(false)
  })

  /** `CurrentUser.email` is `""` for an account with no OAuth row. An empty
   *  target would make an untouched field authorise the deletion. */
  it('can never be armed when the account has no email to type', () => {
    expect(emailAuthorises('', '')).toBe(false)
    expect(emailAuthorises('   ', '  ')).toBe(false)
  })
})

describe('the delete sequence', () => {
  function harness(endAccount: () => Promise<void>) {
    const order: string[] = []
    const signOut = vi.fn(async () => {
      order.push('signOut')
    })
    const land = vi.fn(() => {
      order.push('land')
    })
    const report = vi.fn()
    const run = runDeleteAccount(endAccount, signOut, land, report, () => 'described')
    return { order, signOut, land, report, run }
  }

  it('lands on the farewell BEFORE the session is dropped', async () => {
    const h = harness(async () => {})
    await h.run()
    expect(
      h.order,
      '/settings is a ProtectedRoute — signing out first bounces the reader to /?login=required',
    ).toEqual(['land', 'signOut'])
  })

  it('neither navigates nor signs out when the delete fails', async () => {
    const h = harness(async () => {
      throw new Error('boom')
    })
    await h.run()
    expect(h.land).not.toHaveBeenCalled()
    expect(h.signOut).not.toHaveBeenCalled()
    expect(h.report).toHaveBeenCalledWith('described')
  })

  it('reports nothing when the delete succeeds', async () => {
    const h = harness(async () => {})
    await h.run()
    expect(h.report).not.toHaveBeenCalled()
  })
})
