import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VoterDetail } from '../../../api/votes'

/**
 * #1895: deferred casting with an optimistic voter row. Pinned on the store, not
 * a component, since SSR runs no effects. #3093: the first cast goes at once;
 * only a change of mind is debounced.
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

const BRAM: VoterDetail = {
  character_id: 4,
  display_name: 'Bram',
  avatar_url: '/bram.png',
  faction_slug: 'ephemerists',
  value: 5,
}

/** The POST's post-write truth (#1382). */
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
      expect(mocks.castVote).toHaveBeenCalledTimes(1)
      expect(mocks.castVote).toHaveBeenCalledWith(PRAXIS, 4)

      await settle()
      expect(castTally(PRAXIS)).toEqual({ points_from_votes: 12, voter_count: 3 })

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
      // A fast server: "idle means immediate" would have sent all four.
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

      // 5 is held until 1 is home: two in flight could land out of order.
      expect(mocks.castVote).toHaveBeenCalledTimes(1)
      expect(castTally(PRAXIS)).toBeNull()
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
    // A flush is for the changes of mind still waiting out their window.
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

    // `useSyncExternalStore` compares the entry, so it must not be re-emitted.
    await vi.advanceTimersByTimeAsync(10_000)
    expect(pendingCast(PRAXIS)).toBe(answered)
  })

  it('keeps the window open across a remount between quick clicks', async () => {
    queueCast(PRAXIS, 1, ADA)
    await settle()
    // A remount's cleanup flush must not make later clicks count as first casts.
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
    // The row is the client's to move, the score is not: it is a server
    // aggregate split across collab members (#1382).
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
    queueCast(PRAXIS, 4, ADA)
    expect(mocks.castVote).toHaveBeenCalledTimes(1)

    answer()
    await settle()
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

      // A failure on a star already left is neither a reason to drop 5 nor news.
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
      // A viewer with no budget mashing the control must not cost a request each.
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
      // `list_voters` orders by `Vote.created_at DESC`.
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
    // #1895: the store passes the server tally through whole and never names a
    // scoring field. Strips `*` doc lines only, so `//` comments count.
    const source = readFileSync(
      fileURLToPath(new URL('../pendingCasts.ts', import.meta.url)),
      'utf8',
    ).replace(/^\s*\*.*$/gm, '')
    expect(source).not.toMatch(/points_from_votes|voter_count/)
  })
})
