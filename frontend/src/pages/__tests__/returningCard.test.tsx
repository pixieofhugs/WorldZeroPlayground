/**
 * The returning-player consent gate (#2162, ADR-0081).
 *
 * WHAT THIS CAN TEST. The harness is `renderToStaticMarkup` — no DOM, no
 * events, effects never run — so the card's two pieces of real logic are
 * exported and exercised directly, exactly as `TermsCard.runTermsAccept` is.
 * What is left in the component is a `useState` and a `<p>`.
 *
 * Two things here would each be a silent regression:
 *
 *   1. **The date is off by one.** An ISO date-only string parses as UTC
 *      midnight, so every reader west of Greenwich would be told they deleted
 *      their account the day before they did. The date is the one fact this
 *      card states and it renders in the reader's timezone, so the guard has to
 *      hold in whatever timezone the runner happens to be in.
 *   2. **A failed confirm looks like a success.** `onDone` navigates into the
 *      onboarding arc; running it when the POST threw would drop the player
 *      into an arc with no session behind it.
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
  /**
   * The day the sentence names is the day in the string, in every timezone.
   *
   * Asserted as "the day number survives" rather than against one expected
   * string, because that is the actual invariant: a naive `new Date(iso)` gives
   * the right answer in UTC and the wrong one in New York, and a test that only
   * held on the CI runner would be a test of the runner.
   */
  it.each(['2026-03-03', '2026-01-01', '2025-12-31'])('%s keeps its day', (iso) => {
    const [dayRendered] = formatDeletedOn(iso, 'en-GB').split(' ')
    expect(Number(dayRendered)).toBe(Number(iso.split('-')[2]))
  })

  it('names the month and drops the year', () => {
    // Ninety days is the whole window, so a year would be noise every time.
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

    // `refetch` before `onDone`: the cookie is set by the POST, but nothing in
    // this tab knows whose it is until `/auth/me` answers — navigating first
    // would land the arc on a session it still believes is absent.
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
    // Falls back to the catalog's own line, never a bare stack or empty string.
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

    // No flash of a sentence with a hole in it — the interpolation is the whole
    // point of the sentence.
    expect(markup).not.toContain('data-testid="returning-body"')
    expect(markup).not.toContain('data-testid="returning-start-fresh"')
  })
})

describe('the copy the gate carries', () => {
  it('interpolates the date rather than hardcoding one', () => {
    expect(onboarding.returning.body).toContain('{{date}}')
  })

  it('offers a fresh start and never a restore', () => {
    // The owner ruling of 2026-08-17: consent to starting fresh, explicitly not
    // an offer of any old data. There is none — the tombstone blanked it.
    expect(onboarding.returning.body.toLowerCase()).not.toMatch(/restore|recover|bring back/)
  })
})
