import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VoterDetail } from '../../../api/votes'

/**
 * #1895 — deferred casting with an optimistic voter row.
 *
 * THE SEAM IS THIS MODULE, not a rendered vote control. The frontend harness is
 * `renderToStaticMarkup`: there is no DOM and effects never run, so a debounce
 * driven through a component could not be observed at all. Every rule the issue
 * states — one POST for three mind-changes, a row that appears before the
 * server answers, a score that does NOT move until it does, a rollback that
 * says why — is a rule about the store, so the store is where they are pinned.
 *
 * #3093 amended the first of those: the FIRST cast is sent at once and only a
 * change of mind is debounced, so three mind-changes now cost two POSTs. Same
 * seam, for the same reason.
 */

const mocks = vi.hoisted(() => ({
  castVote: vi.fn(),
}))

vi.mock('../../../api/votes', () => ({ castVote: mocks.castVote }))

import { castTally, __resetCastTallies } from '../../../utils/castTallies'
import {
  applyPendingCast,
  flushPendingCast,
  flushPendingCasts,
  pendingCast,
  queueCast,
  __resetPendingCasts,
} from '../pendingCasts'

const PRAXIS = 42

const ADA = {
  character_id: 9,
  display_name: 'Ada',
  avatar_url: '/ada.png',
  faction_slug: 'coven',
}

/** Somebody else's row, already on the list the mount fetch returned. */
const BRAM: VoterDetail = {
  character_id: 4,
  display_name: 'Bram',
  avatar_url: '/bram.png',
  faction_slug: 'ephemerists',
  value: 5,
}

/** What the POST answers: the server's own post-write truth (#1382). */
function serverCast(value: number, tally = { points_from_votes: 12, voter_count: 3 }) {
  return {
    id: 1,
    praxis_id: PRAXIS,
    value,
    viewer_vote: value,
    voter_character_id: ADA.character_id,
    tally,
    viewer_stats: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

/** Let the flush's promise chain settle without advancing the clock. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('pendingCasts', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    __resetPendingCasts()
    __resetCastTallies()
    mocks.castVote.mockReset()
    mocks.castVote.mockImplementation(async (_id: number, value: number) => serverCast(value))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the viewer their own star at once, before the server has answered', () => {
    queueCast(PRAXIS, 4, ADA)
    expect(pendingCast(PRAXIS)?.value).toBe(4)
    expect(pendingCast(PRAXIS)?.settled).toBeNull()
  })

  describe('the first cast goes at once; only a change of mind waits (#3093)', () => {
    it('sends a lone cast immediately, and only once', async () => {
      queueCast(PRAXIS, 4, ADA)
      // No clock has moved: the request is already out.
      expect(mocks.castVote).toHaveBeenCalledTimes(1)
      expect(mocks.castVote).toHaveBeenCalledWith(PRAXIS, 4)

      await settle()
      expect(castTally(PRAXIS)).toEqual({ points_from_votes: 12, voter_count: 3 })

      // The window closing with nothing new to say sends nothing.
      await vi.advanceTimersByTimeAsync(10_000)
      expect(mocks.castVote).toHaveBeenCalledTimes(1)
    })

    it('debounces a change of mind into one follow-up, and the total settles on it', async () => {
      mocks.castVote.mockImplementation(async (_id: number, value: number) =>
        serverCast(value, { points_from_votes: value * 10, voter_count: 3 }),
      )
      queueCast(PRAXIS, 1, ADA)
      await vi.advanceTimersByTimeAsync(400)
      expect(castTally(PRAXIS)).toEqual({ points_from_votes: 10, voter_count: 3 })

      queueCast(PRAXIS, 5, ADA)
      // Debounced as #1895 ruled: nothing more goes until the window is quiet.
      await vi.advanceTimersByTimeAsync(1_999)
      expect(mocks.castVote).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(1)
      expect(mocks.castVote).toHaveBeenCalledTimes(2)
      expect(mocks.castVote).toHaveBeenLastCalledWith(PRAXIS, 5)
      expect(castTally(PRAXIS)).toEqual({ points_from_votes: 50, voter_count: 3 })
      expect(pendingCast(PRAXIS)?.value).toBe(5)
    })

    it('collapses three further mind-changes into ONE follow-up of the last', async () => {
      queueCast(PRAXIS, 1, ADA)
      // A fast server: each answer is back long before the next star, which is
      // exactly when "idle means immediate" would have sent all four.
      await vi.advanceTimersByTimeAsync(400)
      queueCast(PRAXIS, 5, ADA)
      await vi.advanceTimersByTimeAsync(400)
      queueCast(PRAXIS, 2, ADA)
      await vi.advanceTimersByTimeAsync(400)
      queueCast(PRAXIS, 3, ADA)

      await vi.advanceTimersByTimeAsync(2_000)

      expect(mocks.castVote.mock.calls).toEqual([
        [PRAXIS, 1],
        [PRAXIS, 3],
      ])
    })

    it('goes back to sending at once after the window has closed', async () => {
      queueCast(PRAXIS, 1, ADA)
      await vi.advanceTimersByTimeAsync(2_000)
      queueCast(PRAXIS, 4, ADA)

      expect(mocks.castVote).toHaveBeenCalledTimes(2)
      expect(mocks.castVote).toHaveBeenLastCalledWith(PRAXIS, 4)
    })

    it('never lets an earlier answer land after a later one', async () => {
      // The first request is slow — slower than the whole debounce window.
      const answers: Array<() => void> = []
      mocks.castVote.mockImplementation(
        (_id: number, value: number) =>
          new Promise((resolve) => {
            answers.push(() =>
              resolve(serverCast(value, { points_from_votes: value * 10, voter_count: 3 })),
            )
          }),
      )
      queueCast(PRAXIS, 1, ADA)
      queueCast(PRAXIS, 5, ADA)
      await vi.advanceTimersByTimeAsync(2_000)

      // The window is over and 5 is owed, but 1 is still out. Two requests in
      // the air is the only way an old answer could arrive last, so the second
      // is held until the first is home.
      expect(mocks.castVote).toHaveBeenCalledTimes(1)
      expect(castTally(PRAXIS)).toBeNull()
      // The star never flinches back to the value in flight.
      expect(pendingCast(PRAXIS)?.value).toBe(5)

      answers[0]()
      await settle()
      expect(pendingCast(PRAXIS)?.value).toBe(5)
      expect(mocks.castVote).toHaveBeenCalledTimes(2)
      expect(mocks.castVote).toHaveBeenLastCalledWith(PRAXIS, 5)

      answers[1]()
      await settle()
      expect(castTally(PRAXIS)).toEqual({ points_from_votes: 50, voter_count: 3 })
      expect(pendingCast(PRAXIS)?.settled).toBe(5)
    })

    it('sends a waiting change of mind when the viewer leaves, without the wait', async () => {
      queueCast(PRAXIS, 1, ADA)
      await settle()
      queueCast(PRAXIS, 5, ADA)
      flushPendingCast(PRAXIS)
      await settle()

      expect(mocks.castVote).toHaveBeenCalledTimes(2)
      expect(mocks.castVote).toHaveBeenLastCalledWith(PRAXIS, 5)
    })

    it('goes straight after the answer when the viewer left mid-flight', async () => {
      let answer = () => {}
      mocks.castVote.mockImplementationOnce(
        () => new Promise((resolve) => (answer = () => resolve(serverCast(1)))),
      )
      queueCast(PRAXIS, 1, ADA)
      queueCast(PRAXIS, 5, ADA)
      flushPendingCast(PRAXIS)
      answer()
      await settle()

      expect(mocks.castVote).toHaveBeenCalledTimes(2)
      expect(mocks.castVote).toHaveBeenLastCalledWith(PRAXIS, 5)
    })
  })

  describe('a choice the server already has is not sent again', () => {
    it('sends one request for a double-click on the same star', async () => {
      queueCast(PRAXIS, 4, ADA)
      await vi.advanceTimersByTimeAsync(150)
      queueCast(PRAXIS, 4, ADA)

      await vi.advanceTimersByTimeAsync(10_000)
      expect(mocks.castVote.mock.calls).toEqual([[PRAXIS, 4]])
      expect(pendingCast(PRAXIS)?.value).toBe(4)
    })

    it('sends one request for a double-click that lands mid-flight', async () => {
      let answer = () => {}
      mocks.castVote.mockImplementationOnce(
        () => new Promise((resolve) => (answer = () => resolve(serverCast(4)))),
      )
      queueCast(PRAXIS, 4, ADA)
      queueCast(PRAXIS, 4, ADA)
      answer()

      await vi.advanceTimersByTimeAsync(10_000)
      expect(mocks.castVote.mock.calls).toEqual([[PRAXIS, 4]])
      expect(pendingCast(PRAXIS)?.value).toBe(4)
    })

    it('cancels a held change of mind when the viewer comes back to the star in flight', async () => {
      let answer = () => {}
      mocks.castVote.mockImplementationOnce(
        () => new Promise((resolve) => (answer = () => resolve(serverCast(4)))),
      )
      queueCast(PRAXIS, 4, ADA)
      queueCast(PRAXIS, 5, ADA)
      queueCast(PRAXIS, 4, ADA)
      answer()

      await vi.advanceTimersByTimeAsync(10_000)
      // The 5 was never sent, and nor was a second 4.
      expect(mocks.castVote.mock.calls).toEqual([[PRAXIS, 4]])
      expect(pendingCast(PRAXIS)?.value).toBe(4)
      expect(pendingCast(PRAXIS)?.settled).toBe(4)
    })

    it('still sends a real change of mind', async () => {
      queueCast(PRAXIS, 4, ADA)
      queueCast(PRAXIS, 5, ADA)

      await vi.advanceTimersByTimeAsync(10_000)
      expect(mocks.castVote.mock.calls).toEqual([
        [PRAXIS, 4],
        [PRAXIS, 5],
      ])
    })
  })

  it('flushes every praxis on a navigation, not just the one being read', async () => {
    queueCast(PRAXIS, 2, ADA)
    queueCast(99, 4, ADA)
    await settle()
    // Both first casts sent themselves. What a flush is FOR is the change of
    // mind still waiting out its window on each.
    queueCast(PRAXIS, 3, ADA)
    queueCast(99, 5, ADA)
    expect(mocks.castVote).toHaveBeenCalledTimes(2)

    flushPendingCasts()
    await settle()

    expect(mocks.castVote.mock.calls.slice(2)).toEqual([
      [PRAXIS, 3],
      [99, 5],
    ])
  })

  it('does not stir again when the window shuts on a lone vote', async () => {
    queueCast(PRAXIS, 4, ADA)
    await settle()
    const answered = pendingCast(PRAXIS)

    // Nothing the viewer can see changes when the window shuts, so nothing may
    // be re-emitted: the snapshot `useSyncExternalStore` compares is the entry.
    await vi.advanceTimersByTimeAsync(10_000)
    expect(pendingCast(PRAXIS)).toBe(answered)
  })

  it('keeps the window open across a remount between quick clicks', async () => {
    queueCast(PRAXIS, 1, ADA)
    await settle()
    // The control unmounts and remounts (a list re-keying, a route reconcile):
    // its cleanup flushes, owing nothing. The clicks that follow are still
    // changes of mind, not three more first casts.
    flushPendingCast(PRAXIS)
    queueCast(PRAXIS, 5, ADA)
    await vi.advanceTimersByTimeAsync(300)
    queueCast(PRAXIS, 2, ADA)
    await vi.advanceTimersByTimeAsync(300)
    queueCast(PRAXIS, 3, ADA)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(mocks.castVote.mock.calls).toEqual([
      [PRAXIS, 1],
      [PRAXIS, 3],
    ])
  })

  it('never moves the score until the server answers, then takes its number', async () => {
    queueCast(PRAXIS, 5, ADA)
    // The whole of ruling 2: the row is the client's to move, the score is not.
    // `points_from_votes` is a server aggregate `_resolve_card_scoring` splits
    // across collab members — the arithmetic #1382 deleted.
    expect(castTally(PRAXIS)).toBeNull()

    await vi.advanceTimersByTimeAsync(2_000)

    expect(castTally(PRAXIS)).toEqual({ points_from_votes: 12, voter_count: 3 })
  })

  it('settles on the star the server says stands, not the one we sent', async () => {
    mocks.castVote.mockImplementation(async () => serverCast(3))
    queueCast(PRAXIS, 5, ADA)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(pendingCast(PRAXIS)?.value).toBe(3)
  })

  it('sends the newer star when the viewer changes their mind mid-flight', async () => {
    let answer = () => {}
    mocks.castVote.mockImplementationOnce(
      () => new Promise((resolve) => (answer = () => resolve(serverCast(2)))),
    )
    queueCast(PRAXIS, 2, ADA)
    await vi.advanceTimersByTimeAsync(300)
    // The first request is still out when the viewer picks again.
    queueCast(PRAXIS, 4, ADA)
    expect(mocks.castVote).toHaveBeenCalledTimes(1)

    answer()
    await settle()
    // The answer to 2 must not pull the star back off 4.
    expect(pendingCast(PRAXIS)?.value).toBe(4)
    expect(mocks.castVote).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2_000)
    expect(mocks.castVote).toHaveBeenCalledTimes(2)
    expect(mocks.castVote).toHaveBeenLastCalledWith(PRAXIS, 4)
    expect(pendingCast(PRAXIS)?.value).toBe(4)
  })

  describe('a rejected cast', () => {
    it('rolls the star back and carries the failure for the control to render', async () => {
      mocks.castVote.mockRejectedValue(new Error('vote budget exhausted'))
      queueCast(PRAXIS, 4, ADA)
      await vi.advanceTimersByTimeAsync(2_000)

      const entry = pendingCast(PRAXIS)
      expect(entry?.value).toBeNull()
      expect(entry?.failure).toBeInstanceOf(Error)
      expect(applyPendingCast([BRAM], entry)).toEqual([BRAM])
    })

    it('rolls back to the last star the server accepted, not to nothing', async () => {
      queueCast(PRAXIS, 2, ADA)
      await vi.advanceTimersByTimeAsync(2_000)
      mocks.castVote.mockRejectedValue(new Error('nope'))
      queueCast(PRAXIS, 5, ADA)
      await vi.advanceTimersByTimeAsync(2_000)

      expect(pendingCast(PRAXIS)?.value).toBe(2)
    })

    it('sends a change of mind made mid-flight even though the first cast failed', async () => {
      let reject = () => {}
      mocks.castVote.mockImplementationOnce(
        () => new Promise((_resolve, fail) => (reject = () => fail(new Error('nope')))),
      )
      queueCast(PRAXIS, 1, ADA)
      queueCast(PRAXIS, 5, ADA)
      reject()
      await settle()

      // 5 is what the viewer wants now. The failure of a star they have already
      // left is not a reason to drop it, nor theirs to be told about.
      expect(pendingCast(PRAXIS)?.value).toBe(5)
      expect(pendingCast(PRAXIS)?.failure).toBeUndefined()

      await vi.advanceTimersByTimeAsync(2_000)
      expect(mocks.castVote.mock.calls).toEqual([
        [PRAXIS, 1],
        [PRAXIS, 5],
      ])
      expect(pendingCast(PRAXIS)?.settled).toBe(5)
    })

    it('rolls back only when the LATEST value is the one refused', async () => {
      mocks.castVote.mockRejectedValue(new Error('nope'))
      queueCast(PRAXIS, 1, ADA)
      queueCast(PRAXIS, 5, ADA)
      await vi.advanceTimersByTimeAsync(2_000)

      expect(mocks.castVote).toHaveBeenCalledTimes(2)
      expect(pendingCast(PRAXIS)?.value).toBeNull()
      expect(pendingCast(PRAXIS)?.failure).toBeInstanceOf(Error)
    })

    it('holds the clicks after a refusal instead of sending each one', async () => {
      // A viewer with no vote budget still has the control. Mashing it must not
      // cost a request per click.
      mocks.castVote.mockRejectedValue(new Error('vote budget exhausted'))
      queueCast(PRAXIS, 4, ADA)
      await vi.advanceTimersByTimeAsync(200)
      expect(pendingCast(PRAXIS)?.failure).toBeInstanceOf(Error)

      queueCast(PRAXIS, 4, ADA)
      await vi.advanceTimersByTimeAsync(200)
      queueCast(PRAXIS, 3, ADA)
      await vi.advanceTimersByTimeAsync(200)
      queueCast(PRAXIS, 5, ADA)
      expect(mocks.castVote).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(2_000)
      expect(mocks.castVote.mock.calls).toEqual([
        [PRAXIS, 4],
        [PRAXIS, 5],
      ])
    })

    it('clears the failure when the viewer tries again', async () => {
      mocks.castVote.mockRejectedValueOnce(new Error('nope'))
      queueCast(PRAXIS, 4, ADA)
      await vi.advanceTimersByTimeAsync(2_000)
      queueCast(PRAXIS, 4, ADA)

      expect(pendingCast(PRAXIS)?.failure).toBeUndefined()
    })
  })

  describe('applyPendingCast', () => {
    it('puts a first-time voter at the head, where the server would', () => {
      queueCast(PRAXIS, 4, ADA)
      const merged = applyPendingCast([BRAM], pendingCast(PRAXIS))
      // `list_voters` orders by `Vote.created_at DESC`, so the newest is first.
      expect(merged.map((v) => v.character_id)).toEqual([ADA.character_id, BRAM.character_id])
      expect(merged[0].value).toBe(4)
      expect(merged[0].display_name).toBe('Ada')
    })

    it('updates the existing row in place rather than adding a second', () => {
      const adaAlready: VoterDetail = { ...ADA, value: 1 }
      queueCast(PRAXIS, 5, ADA)
      const merged = applyPendingCast([adaAlready, BRAM], pendingCast(PRAXIS))

      expect(merged.map((v) => v.character_id)).toEqual([ADA.character_id, BRAM.character_id])
      expect(merged[0].value).toBe(5)
    })

    it('hands back the very same list when there is nothing to merge', () => {
      const voters = [BRAM]
      expect(applyPendingCast(voters, null)).toBe(voters)
    })

    it('leaves the list alone when the viewer has no character to draw a row from', () => {
      const voters = [BRAM]
      queueCast(PRAXIS, 4, null)
      expect(applyPendingCast(voters, pendingCast(PRAXIS))).toBe(voters)
    })
  })

  it('does not reimplement the scoring formula', () => {
    // An acceptance criterion of #1895, and the thing #1142/#1239 both were.
    // The store hands the server's tally through whole; it must never name a
    // scoring field, because naming one is how the arithmetic came back twice.
    const source = readFileSync(
      fileURLToPath(new URL('../pendingCasts.ts', import.meta.url)),
      'utf8',
    ).replace(/^\s*\*.*$/gm, '')
    expect(source).not.toMatch(/points_from_votes|voter_count/)
  })
})
