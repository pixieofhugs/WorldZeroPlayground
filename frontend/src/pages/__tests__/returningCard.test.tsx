/**
 * The returning-player consent gate (#2162, ADR-0081). Its logic is exported
 * and tested directly (SSR runs no effects). Guards: an ISO date-only string
 * parses as UTC midnight (off by one west of Greenwich), and a failed confirm
 * must not walk into the arc with no session.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../i18n'
import onboarding from '../../locales/en/onboarding.json'

vi.mock('../../api/auth', () => ({
  getReturningPlayer: () => new Promise(() => {}),
  startFresh: () => Promise.resolve(),
}))

import ReturningCard, { formatDeletedOn, runStartFresh } from '../onboarding/ReturningCard'

describe('the deletion date the gate states', () => {
  /** Timezone-independent: a test that only held in UTC tests the runner. */
  it.each(['2026-03-03', '2026-01-01', '2025-12-31'])('%s keeps its day', (iso) => {
    const [dayRendered] = formatDeletedOn(iso, 'en-GB').split(' ')
    expect(Number(dayRendered)).toBe(Number(iso.split('-')[2]))
  })

  it('names the month and drops the year', () => {
    // The window is ninety days, so a year is noise.
    expect(formatDeletedOn('2026-03-03', 'en-GB')).toBe('3 March')
  })
})

describe('consenting to start fresh', () => {
  it('signs in, then learns who that is, then moves on — in that order', async () => {
    const calls: string[] = []
    const done = vi.fn(() => calls.push('done'))

    await runStartFresh(
      async () => { calls.push('consent') },
      async () => { calls.push('refetch') },
      done,
      () => { throw new Error('should not fail') },
    )()

    // Navigating before `/auth/me` answers lands on a "missing" session.
    expect(calls).toEqual(['consent', 'refetch', 'done'])
    expect(done).toHaveBeenCalledOnce()
  })

  it('reports a failure instead of walking on', async () => {
    const done = vi.fn()
    const failed = vi.fn()

    await runStartFresh(
      () => Promise.reject(new Error('nope')),
      async () => {},
      done,
      failed,
    )()

    expect(done).not.toHaveBeenCalled()
    expect(failed).toHaveBeenCalledOnce()
    expect(failed.mock.calls[0][0]).toBeTruthy()
  })
})

describe('the card before the gate answers', () => {
  it('shows nothing of the sentence until it has the date', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ReturningCard />
      </MemoryRouter>,
    )

    expect(markup).not.toContain('data-testid="returning-body"')
    expect(markup).not.toContain('data-testid="returning-start-fresh"')
  })
})

describe('the copy the gate carries', () => {
  it('interpolates the date rather than hardcoding one', () => {
    expect(onboarding.returning.body).toContain('{{date}}')
  })

  it('offers a fresh start and never a restore', () => {
    // Owner ruling: the tombstone blanked the old data; never offer it.
    expect(onboarding.returning.body.toLowerCase()).not.toMatch(/restore|recover|bring back/)
  })
})
