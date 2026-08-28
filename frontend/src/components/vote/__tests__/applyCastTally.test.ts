/**
 * The merge, exercised on EVERY payload shape a tally reaches (#1142, #1239).
 *
 * The bug was a detail page merging the viewer's cast into its `VoteSummary`
 * while its score panel read the praxis object — so the guard has to be that the
 * praxis arm is read back through `scoreBreakdown()`, the single row-selection
 * authority (ADR-0053). Asserting the merged fields alone would pass even if the
 * resolver stopped reading them. (The `VoteSummary` arm itself is gone: #1382
 * deleted the endpoint behind it, and nothing ever rendered it.)
 *
 * #1239 was the same gap one payload over: the duel card reads both sides'
 * `points_from_votes` off `DuelDetailOut`, a separate fetch, so a spectator's
 * cast left the tally AND the margin derived from the pair stale.
 *
 * Since #1382 the merge SWAPS the votes term for the tally the server returned
 * rather than adding a client-computed delta — so the guards below include
 * idempotence, which a delta could never satisfy.
 *
 * Deliberately not a click test: the harness is `renderToStaticMarkup` with no
 * jsdom, effects never run, and `useSyncExternalStore`'s server snapshot is
 * always null (see castTallies.ts), so a rendered component can never observe a
 * live cast. The resolver is what's testable, and it's what broke.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'
import type { VoteTallyOut } from '../../../api/votes'
import { scoreBreakdown, type ScoredPraxis } from '../../praxisCard/scoreStamp/scoreBreakdown'
import { applyCastTally, applyDuelCastTally } from '../useVotedPraxis'
import { __resetCastTallies, castTally, recordCastTally } from '../castTallies'
import { aPraxis, aPraxisCard } from '../../../test/fixtures'

const PRAXIS_ID = 7

/**
 * A detail payload. (base 12 + meta 0) × 1.0 + 4.
 *
 * This used to be introduced as "`PraxisOut` carries no voter count", which was
 * never true of the wire — `voter_count` has always been on the response, and
 * only the hand-written mirror omitted it. Since #1400 `PraxisOut` IS the
 * generated schema, so it is here.
 */
const DETAIL = aPraxis({
  id: PRAXIS_ID,
  task_id: 2,
  task_title: 'Walk the ridge',
  task_level_required: 1,
  created_by_id: 3,
  created_by_display_name: 'Ada',
  members: [],
  media_items: [],
})

/** A card payload: same numbers, plus the voter count only cards carry. */
const CARD = aPraxisCard({
  id: PRAXIS_ID,
  task_id: 2,
  task_title: 'Walk the ridge',
  task_level_required: 1,
  title: 'The Long Way Round',
  created_by_id: 3,
  created_by_display_name: 'Ada',
  updated_at: '2026-01-03T00:00:00Z',
  submitted_at: '2026-01-03T00:00:00Z',
  voter_count: 2,
})

/** The other side of the duel — the one a spectator's cast used to leave stale. */
const RIVAL_PRAXIS_ID = 8

const MINE_SIDE: DuelSideOut = {
  praxis_id: PRAXIS_ID,
  character_id: 3,
  display_name: 'Ada',
  faction_slug: 'coven',
  avatar_url: '',
  points_from_votes: 4,
  is_submitted: true,
  nudged_at: null,
}

const RIVAL_SIDE: DuelSideOut = {
  praxis_id: RIVAL_PRAXIS_ID,
  character_id: 4,
  display_name: 'Rax',
  faction_slug: 'snide',
  avatar_url: '',
  points_from_votes: 6,
  is_submitted: true,
  nudged_at: null,
}

const DUEL: DuelDetailOut = {
  id: 5,
  task_id: 2,
  status: 'settled',
  forfeited_by_character_id: null,
  challenger: MINE_SIDE,
  opponent: RIVAL_SIDE,
  winner_character_id: null,
  challenger_final_points: null,
  opponent_final_points: null,
}

/**
 * The tally the server returns when a first cast of 5 lands on a praxis that
 * already held 4 points from 2 voters. Published through the real store so the
 * test exercises the path the app does.
 */
function firstCastOfFive(): VoteTallyOut {
  recordCastTally(PRAXIS_ID, { points_from_votes: 9, voter_count: 3 })
  const tally = castTally(PRAXIS_ID)
  if (!tally) throw new Error('expected a published cast tally')
  return tally
}

describe('applyCastTally on a detail payload (#1142)', () => {
  beforeEach(() => {
    __resetCastTallies()
  })

  it('moves the score panel the archetypes render, not just the vote line', () => {
    // The regression: every praxis-detail archetype mounts ScoreStamp, which
    // resolves its rows from the praxis object. Before the fix this stayed at
    // "votes +4" / total 16 until a refresh.
    const voted = applyCastTally(DETAIL, firstCastOfFive())
    expect(scoreBreakdown(voted)).toEqual({
      base: 12,
      mult: null,
      meta: null,
      habit: null,
      votes: 9,
      // No multiplier on this payload, so no subtotal (#2634) — a cast tally
      // moves the votes row and nothing else.
      subtotal: null,
      total: 21,
    })
  })

  it('leaves the server payload untouched, so a re-render cannot compound it', () => {
    applyCastTally(DETAIL, firstCastOfFive())
    expect(scoreBreakdown(DETAIL)).toEqual(
      expect.objectContaining({ votes: 4, total: 16 }),
    )
  })

  it('invents no voter count on a payload that has none', () => {
    // The guard's real subject is `ScoredPraxis` — the five score terms and
    // nothing else — because that is what `applyCastTally` is generic over.
    // It used to be asserted against DETAIL on the belief that `PraxisOut`
    // carried no voter count; both live payloads do, so DETAIL could only ever
    // have proved the opposite branch. A bare `ScoredPraxis` is the shape that
    // reaches the `typeof praxis.voter_count === 'number'` test and fails it,
    // and inventing a `NaN` there is what would print through a card's footer.
    const scoreOnly: ScoredPraxis = {
      task_point_value: 12,
      metatask_points: 0,
      display_multiplier: 1.0,
      points_from_votes: 4,
      habit_bonus_points: 0,
      score: 16,
    }
    const voted = applyCastTally(scoreOnly, firstCastOfFive())
    expect('voter_count' in voted).toBe(false)
    expect(scoreBreakdown(voted)).toEqual(
      expect.objectContaining({ votes: 9, total: 21 }),
    )
  })

  it('carries a detail payload\'s voter count forward, because it has one', () => {
    const voted = applyCastTally(DETAIL, firstCastOfFive())
    expect(voted.voter_count).toBe(3)
  })

  it('applies the same tally twice without compounding', () => {
    // The property a swap has and a delta never did: an entry is server truth,
    // so re-applying it on a re-render is a no-op. #1142 and #1239 were both
    // this assumption failing for a delta.
    const tally = firstCastOfFive()
    const once = applyCastTally(DETAIL, tally)
    expect(scoreBreakdown(applyCastTally(once, tally))).toEqual(scoreBreakdown(once))
  })

  it('reads the same numbers off a card as off a detail payload', () => {
    // One arithmetic for both shapes is the point: the card's stamp and the
    // detail page's stamp must never disagree about the same cast.
    const tally = firstCastOfFive()
    expect(scoreBreakdown(applyCastTally(CARD, tally))).toEqual(
      scoreBreakdown(applyCastTally(DETAIL, tally)),
    )
    expect(applyCastTally(CARD, tally).voter_count).toBe(3)
  })

  it('re-vote: moves the score with no new voter', () => {
    // 3 -> 5, on a praxis whose only vote was the viewer's own.
    recordCastTally(PRAXIS_ID, { points_from_votes: 6, voter_count: 2 })
    const tally = castTally(PRAXIS_ID)
    if (!tally) throw new Error('expected a published cast tally')
    expect(applyCastTally(CARD, tally).voter_count).toBe(2)
    expect(scoreBreakdown(applyCastTally(DETAIL, tally)).total).toBe(18)
  })
})

describe('applyDuelCastTally (#1239)', () => {
  beforeEach(() => {
    __resetCastTallies()
  })

  /** The tally after a first cast of 5 on whichever side is being voted. */
  function firstCastOfFiveOn(praxisId: number): VoteTallyOut {
    const before =
      praxisId === PRAXIS_ID ? MINE_SIDE.points_from_votes : RIVAL_SIDE.points_from_votes
    recordCastTally(praxisId, { points_from_votes: before + 5, voter_count: 3 })
    const tally = castTally(praxisId)
    if (!tally) throw new Error('expected a published cast tally')
    return tally
  }

  /** What `DuelCard` derives its verdict line from: the difference of the pair. */
  function margin(duel: DuelDetailOut): number {
    return duel.challenger.points_from_votes - duel.opponent.points_from_votes
  }

  it('a spectator voting the RIVAL side moves the rival row and the margin', () => {
    // The reported case, and the one no praxis payload can cover: the rival
    // side has none on this page. Rax led by 2; a spectator's 5 for Rax has to
    // widen that to 7 the moment it lands, not on the next refetch.
    const merged = applyDuelCastTally(DUEL, {
      challenger: null,
      opponent: firstCastOfFiveOn(RIVAL_PRAXIS_ID),
    })
    expect(merged.opponent.points_from_votes).toBe(11)
    expect(merged.challenger.points_from_votes, 'the unvoted side is untouched').toBe(4)
    expect(margin(merged), 'the margin is as stale as the tally without this').toBe(-7)
  })

  it('a cast on THIS page\'s side moves that row instead', () => {
    const merged = applyDuelCastTally(DUEL, {
      challenger: firstCastOfFiveOn(PRAXIS_ID),
      opponent: null,
    })
    expect(merged.challenger.points_from_votes).toBe(9)
    expect(merged.opponent.points_from_votes).toBe(6)
    expect(margin(merged), 'a lead that changes hands').toBe(3)
  })

  it('moves a duel side by the same points as the praxis payload', () => {
    // One arithmetic across the three payloads is the whole point: the score
    // panel and the duel card sit on the same page and must never disagree
    // about the same cast.
    const tally = firstCastOfFiveOn(PRAXIS_ID)
    const duelMoved =
      applyDuelCastTally(DUEL, { challenger: tally, opponent: null }).challenger
        .points_from_votes - DUEL.challenger.points_from_votes
    // `votes` is null below 1 since ADR-0076 — both sides of this subtraction
    // are live casts, so the fallbacks are the compiler's, not the case's.
    const praxisMoved =
      (scoreBreakdown(applyCastTally(DETAIL, tally)).votes ?? 0) -
      (scoreBreakdown(DETAIL).votes ?? 0)
    expect(duelMoved).toBe(praxisMoved)
  })

  it('leaves the server payload untouched, so a re-render cannot compound it', () => {
    applyDuelCastTally(DUEL, {
      challenger: null,
      opponent: firstCastOfFiveOn(RIVAL_PRAXIS_ID),
    })
    expect(DUEL.opponent.points_from_votes).toBe(6)
  })

  it('hands back the same object when nobody has voted', () => {
    // Identity, not a clone: the duel card re-renders for nothing otherwise.
    expect(applyDuelCastTally(DUEL, { challenger: null, opponent: null })).toBe(DUEL)
  })

  it('never touches the frozen pair a resolved duel prints', () => {
    // Era close froze those figures (ADR-0052) and voting is over; a live
    // cast tally must not reach them even if one is somehow still around.
    const resolved: DuelDetailOut = {
      ...DUEL,
      status: 'resolved',
      challenger_final_points: 21,
      opponent_final_points: 24.5,
    }
    const merged = applyDuelCastTally(resolved, {
      challenger: firstCastOfFiveOn(PRAXIS_ID),
      opponent: null,
    })
    expect(merged.challenger_final_points).toBe(21)
    expect(merged.opponent_final_points).toBe(24.5)
  })
})
