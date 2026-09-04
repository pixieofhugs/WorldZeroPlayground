/**
 * The three rules the side-by-side reader owns that are not the phone ruling
 * (#1084). Each is a place a re-reading of the design goes wrong, and each is
 * one line in `../reader.ts` — which is the point: the caster gate in
 * particular MUST live in one file, because it is read twice (by the panel's
 * chrome and by the widget) and #1429 is what happened the last time two halves
 * of one predicate were derived separately.
 */
import { describe, it, expect } from 'vitest'
import { arrivedFromSide, casterVisible, readerMountsDuel } from '../reader'
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

/** Only the presence of a user matters to the predicate; the rest is irrelevant. */
const SOMEBODY = { id: 3 } as unknown as CurrentUser

describe('the reader draws OUTCOMES only — the same pair DuelCard draws', () => {
  it.each(['settled', 'resolved'] as const)('mounts on %s', (status) => {
    expect(readerMountsDuel(duel({ status }))).toBe(true)
  })

  it.each(['pending', 'active', 'declined'] as const)('refuses %s', (status) => {
    // `_duel_side_hidden_condition` (#999) keeps a live-incomplete side
    // author-only, and the run-up belongs to the composer (ADR-0059). A reader
    // that mounted here would draw one entry and a hole.
    expect(readerMountsDuel(duel({ status }))).toBe(false)
  })

  it('refuses a duel whose second side has no praxis', () => {
    // There is no second entry to read. The `DuelCard` row that links here is
    // gated on the same fact, so this is the route's half of one rule.
    const half = duel({ opponent: side({ character_id: 19, praxis_id: null }) })
    expect(readerMountsDuel(half)).toBe(false)
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
    // A hand-typed or stale `?from` must not silently mean "challenger": the
    // phone ruling's tail treats null and challenger differently on a tie.
    expect(arrivedFromSide(duel(), 999)).toBeNull()
  })
})

describe('the caster gate, written once and read by both halves', () => {
  it('draws while the era is open and the viewer may cast', () => {
    expect(casterVisible(duel(), SOMEBODY, true)).toBe(true)
  })

  it('is REMOVED on a resolved duel rather than disabled', () => {
    // Artboard 2e drops both vote panels: the era has closed, the figures are
    // the frozen finals, and a dead control is not the same statement as no
    // control.
    expect(casterVisible(duel({ status: 'resolved' }), SOMEBODY, true)).toBe(false)
  })

  it('hides on the entry the viewer wrote, so a duellist sees ONE caster', () => {
    expect(casterVisible(duel(), SOMEBODY, false)).toBe(false)
  })

  it('leaves an anonymous viewer the login gate on both entries', () => {
    // `voteRegionVisible`'s rule, inherited whole: the backend never sends
    // `viewer_can_vote: false` to a logged-out visitor, and the per-widget CTA
    // is deliberate (#855).
    expect(casterVisible(duel(), null, false)).toBe(true)
  })
})
