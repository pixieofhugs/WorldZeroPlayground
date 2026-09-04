/**
 * The three rules the side-by-side reader owns that are not the phone ruling
 * (#1084). Each is a place a re-reading of the design goes wrong, and each is
 * one line in `../reader.ts` — which is the point: the caster gate in
 * particular MUST live in one file, because it is read twice (by the panel's
 * chrome and by the widget) and #1429 is what happened the last time two halves
 * of one predicate were derived separately.
 */
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

  it('STILL mounts a forfeit, whose thrown side keeps its id and loses its body', () => {
    // The bug this row exists for. Throwing a settled duel drops that praxis to
    // `in_progress` while the duel stays `settled` and keeps pointing at it, so
    // `praxis_id` is set and `is_submitted` is not. The page must draw — the
    // design has a whole frame for a forfeit.
    const forfeited = duel({
      forfeited_by_character_id: 7,
      challenger: side({ character_id: 7, praxis_id: 601, is_submitted: false }),
    })
    expect(readerMountsDuel(forfeited)).toBe(true)
  })

  it('refuses a duel with no readable body at all', () => {
    // Both sides withdrawn: nothing to compare, and two empty columns is not a
    // reading surface.
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
    // `praxis_id` is not permission to read: an `in_progress` praxis is visible
    // to its members alone (`praxis_visibility_condition`), so asking for this
    // one fails for every reader but its author — and a `Promise.all` over both
    // sides turns that into an error page for the whole duel.
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

  it('hides for a duellist — who sees ZERO casters here, not one', () => {
    // The backend sets `viewer_can_vote: false` on BOTH sides for either
    // participant (`test_duel_participant_cannot_vote_on_either_side`), because
    // anti-self-voting is enforced at the ACCOUNT level (ADR-0041) and blocks
    // the whole contest rather than just your own entry. There is no payload in
    // which exactly one side is votable, so both columns are asserted.
    const live = duel()
    expect(casterVisible(live, SOMEBODY, false)).toBe(false)
    expect(casterVisible(live, SOMEBODY, false)).toBe(false)
  })

  it('leaves an anonymous viewer the login gate on both entries', () => {
    // `voteRegionVisible`'s rule, inherited whole: the backend never sends
    // `viewer_can_vote: false` to a logged-out visitor, and the per-widget CTA
    // is deliberate (#855).
    expect(casterVisible(duel(), null, false)).toBe(true)
  })
})
