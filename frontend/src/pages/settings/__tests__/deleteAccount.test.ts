/**
 * #2161 — the danger zone's pure logic: the gate that arms delete, and the effect
 * order (sign-out before navigation would bounce the reader off `/settings`).
 */
import { describe, it, expect, vi } from 'vitest'
import {
  FAREWELL_WAIT_MS,
  emailAuthorises,
  livesEnding,
  runDeleteAccount,
} from '../deleteAccount'

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

  /** No OAuth row = `""` email; an empty target must not authorise. */
  it('can never be armed when the account has no email to type', () => {
    expect(emailAuthorises('', '')).toBe(false)
    expect(emailAuthorises('   ', '  ')).toBe(false)
  })
})

describe('the lives the dialog has to name', () => {
  it('names the one life on a single-life account', () => {
    expect(livesEnding(['WZ Pilgrim'])).toEqual({ kind: 'only', name: 'WZ Pilgrim' })
  })

  it('names the carried life and keeps the rest so they can be listed', () => {
    expect(livesEnding(['WZ Pilgrim', 'Bramble', 'Ninefold'])).toEqual({
      kind: 'more',
      name: 'WZ Pilgrim',
      others: ['Bramble', 'Ninefold'],
    })
  })

  it('says so rather than naming nobody when the account carries none', () => {
    expect(livesEnding([])).toEqual({ kind: 'none' })
  })
})

describe('the delete sequence', () => {
  function harness(
    endAccount: () => Promise<void>,
    loadFarewell: () => Promise<unknown> = async () => {},
  ) {
    const order: string[] = []
    const signOut = vi.fn(async () => {
      order.push('signOut')
    })
    const land = vi.fn(() => {
      order.push('land')
    })
    const report = vi.fn()
    const onDeleted = vi.fn()
    const run = runDeleteAccount(
      endAccount,
      signOut,
      loadFarewell,
      land,
      report,
      () => 'described',
      { current: false },
      onDeleted,
    )
    return { order, signOut, land, report, run, onDeleted }
  }

  it('lands on the farewell BEFORE the session is dropped', async () => {
    const h = harness(async () => {})
    await h.run()
    expect(
      h.order,
      '/settings is a ProtectedRoute — signing out first lets the guard send the reader to /',
    ).toEqual(['land', 'signOut'])
  })

  it('closes the dialog once the delete lands, even when the farewell and sign-out both fail', async () => {
    const onDeleted = vi.fn()
    const run = runDeleteAccount(
      async () => {},
      async () => {
        throw new Error('logout down')
      },
      () => Promise.reject(new Error('chunk')),
      vi.fn(),
      vi.fn(),
      () => 'described',
      { current: false },
      onDeleted,
    )
    await run().catch(() => {})
    expect(onDeleted).toHaveBeenCalledTimes(1)
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

  /** #3134: `/goodbye` is a lazy chunk; a fast logout would redirect to `/`. */
  it('does not start the sign-out until the farewell chunk has loaded', async () => {
    let chunkArrived = () => {}
    const chunk = new Promise<void>((resolve) => {
      chunkArrived = resolve
    })
    const h = harness(async () => {}, () => chunk)
    const running = h.run()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(h.signOut, 'the session was dropped with the farewell still loading').not.toHaveBeenCalled()
    chunkArrived()
    await running
    expect(h.order).toEqual(['land', 'signOut'])
  })

  /** A live cookie on a dead account is worse than a missed farewell. */
  it('still signs out when the farewell chunk fails to load', async () => {
    const h = harness(
      async () => {},
      async () => {
        throw new Error('chunk')
      },
    )
    await h.run()
    expect(h.signOut).toHaveBeenCalledTimes(1)
    expect(h.land, 'a page that could not be loaded is not one to navigate to').not.toHaveBeenCalled()
    expect(h.report).not.toHaveBeenCalled()
  })

  it('reports nothing when the delete succeeds', async () => {
    const h = harness(async () => {})
    await h.run()
    expect(h.report).not.toHaveBeenCalled()
  })

  /** A stalled import must not hold the sign-out forever. */
  it('signs out when the farewell chunk never settles', async () => {
    vi.useFakeTimers()
    try {
      const h = harness(async () => {}, () => new Promise(() => {}))
      const running = h.run()
      await vi.advanceTimersByTimeAsync(FAREWELL_WAIT_MS)
      await running
      expect(h.signOut).toHaveBeenCalledTimes(1)
      expect(h.land, 'a page that has not loaded is not one to navigate to').not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  /** A second `DELETE` would 401 and lose the farewell. */
  it('does not delete twice when confirmed again while one is in flight', async () => {
    let deleted = () => {}
    const endAccount = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          deleted = resolve
        }),
    )
    const h = harness(endAccount)
    const first = h.run()
    await h.run()
    deleted()
    await first
    await h.run()
    expect(endAccount, 'the account is gone — there is nothing left to delete').toHaveBeenCalledTimes(1)
    expect(h.signOut).toHaveBeenCalledTimes(1)
    expect(h.report).not.toHaveBeenCalled()
  })

  it('can be tried again after a delete that failed', async () => {
    const endAccount = vi.fn(async () => {
      throw new Error('boom')
    })
    const h = harness(endAccount)
    await h.run()
    await h.run()
    expect(endAccount).toHaveBeenCalledTimes(2)
  })
})
