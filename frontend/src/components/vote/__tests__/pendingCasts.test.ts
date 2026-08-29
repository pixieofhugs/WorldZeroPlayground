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

  it('shows the viewer their own star at once, without asking the server', () => {
    queueCast(PRAXIS, 4, ADA)
    expect(pendingCast(PRAXIS)?.value).toBe(4)
    expect(mocks.castVote).not.toHaveBeenCalled()
  })

  it('collapses three mind-changes in the window into one POST of the last', async () => {
    queueCast(PRAXIS, 1, ADA)
    vi.advanceTimersByTime(400)
    queueCast(PRAXIS, 5, ADA)
    vi.advanceTimersByTime(400)
    queueCast(PRAXIS, 3, ADA)

    await vi.advanceTimersByTimeAsync(2_000)

    expect(mocks.castVote).toHaveBeenCalledTimes(1)
    expect(mocks.castVote).toHaveBeenCalledWith(PRAXIS, 3)
  })

  it('records the vote when the viewer leaves before the window elapses', async () => {
    queueCast(PRAXIS, 2, ADA)
    // The vote control's unmount cleanup — closing the page must not lose it.
    flushPendingCast(PRAXIS)
    await settle()

    expect(mocks.castVote).toHaveBeenCalledWith(PRAXIS, 2)
  })

  it('flushes every praxis on a navigation, not just the one being read', async () => {
    queueCast(PRAXIS, 2, ADA)
    queueCast(99, 4, ADA)
    flushPendingCasts()
    await settle()

    expect(mocks.castVote).toHaveBeenCalledTimes(2)
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
    queueCast(PRAXIS, 2, ADA)
    await vi.advanceTimersByTimeAsync(2_000)
    queueCast(PRAXIS, 4, ADA)
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
