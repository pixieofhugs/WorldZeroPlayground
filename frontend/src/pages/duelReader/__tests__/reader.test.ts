/** The reader's shared rules in `../reader.ts` (#1084, #1429). */
import { describe, it, expect } from 'vitest'
import {
  arrivedFromSide,
  casterVisible,
  readablePraxisId,
  readerMountsDuel,
} from '../reader'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import type { CurrentUser } from '../../../api/auth'

function side(overrides: Partial<DuelSideOut> = {}): DuelSideOut {
  return {
    avatar_url: '',
    character_id: 1,
    display_name: 'Wren Ashgrove',
    faction_slug: 'na',
    is_submitted: true,
    nudged_at: null,
    win_multiplier: 1,
    loss_multiplier: 1,
    tie_multiplier: 1,
    points_from_votes: 0,
    praxis_id: 601,
    ...overrides,
  }
}

function duel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 44,
    task_id: 101,
    status: 'settled',
    forfeited_by_character_id: null,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    challenger: side({ character_id: 7, praxis_id: 601 }),
    opponent: side({ character_id: 19, praxis_id: 602 }),
    ...overrides,
  }
}

/** Only the presence of a user matters. */
const SOMEBODY = { id: 3 } as unknown as CurrentUser

describe('the reader draws OUTCOMES only — the same pair DuelCard draws', () => {
  it.each(['settled', 'resolved'] as const)('mounts on %s', (status) => {
    expect(readerMountsDuel(duel({ status }))).toBe(true)
  })

  it.each(['pending', 'active', 'declined'] as const)('refuses %s', (status) => {
    // A live side is author-only (#999); the run-up is the composer's (ADR-0059).
    expect(readerMountsDuel(duel({ status }))).toBe(false)
  })

  it('refuses a duel whose second side has no praxis', () => {
    const half = duel({ opponent: side({ character_id: 19, praxis_id: null }) })
    expect(readerMountsDuel(half)).toBe(false)
  })

  it('STILL mounts a forfeit, whose thrown side keeps its id and loses its body', () => {
    // Forfeit: `praxis_id` set, `is_submitted` false. The page must still draw.
    const forfeited = duel({
      forfeited_by_character_id: 7,
      challenger: side({ character_id: 7, praxis_id: 601, is_submitted: false }),
    })
    expect(readerMountsDuel(forfeited)).toBe(true)
  })

  it('refuses a duel with no readable body at all', () => {
    const gone = duel({
      challenger: side({ character_id: 7, praxis_id: 601, is_submitted: false }),
      opponent: side({ character_id: 19, praxis_id: 602, is_submitted: false }),
    })
    expect(readerMountsDuel(gone)).toBe(false)
  })
})

describe('only a submitted side may be fetched', () => {
  it('gives the id for a submitted side', () => {
    expect(readablePraxisId(side({ praxis_id: 601, is_submitted: true }))).toBe(601)
  })

  it('withholds the id of a forfeited side, which would 403', () => {
    expect(readablePraxisId(side({ praxis_id: 601, is_submitted: false }))).toBeNull()
  })
})

describe('the side you arrived from is resolved from the praxis, not the viewer', () => {
  it('names the challenger when the link came off the challenger page', () => {
    expect(arrivedFromSide(duel(), 601)).toBe('challenger')
  })

  it('names the opponent when the link came off the opponent page', () => {
    expect(arrivedFromSide(duel(), 602)).toBe('opponent')
  })

  it('is null on a deep link with no ?from at all', () => {
    expect(arrivedFromSide(duel(), null)).toBeNull()
  })

  it('is null for a praxis that is not either side of this duel', () => {
    // A stale `?from` must not mean "challenger": the tie tail differs.
    expect(arrivedFromSide(duel(), 999)).toBeNull()
  })
})

describe('the caster gate, written once and read by both halves', () => {
  it('draws while the era is open and the viewer may cast', () => {
    expect(casterVisible(duel(), SOMEBODY, true)).toBe(true)
  })

  it('is REMOVED on a resolved duel rather than disabled', () => {
    expect(casterVisible(duel({ status: 'resolved' }), SOMEBODY, true)).toBe(false)
  })

  it('hides for a duellist — who sees ZERO casters here, not one', () => {
    // `viewer_can_vote` is false on BOTH sides for a participant (ADR-0041).
    const live = duel()
    expect(casterVisible(live, SOMEBODY, false)).toBe(false)
    expect(casterVisible(live, SOMEBODY, false)).toBe(false)
  })

  it('leaves an anonymous viewer the login gate on both entries', () => {
    // Logged-out visitors keep the per-widget login CTA (#855).
    expect(casterVisible(duel(), null, false)).toBe(true)
  })
})
