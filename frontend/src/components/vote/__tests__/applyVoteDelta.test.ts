/**
 * The merge arithmetic, exercised on BOTH payload shapes (#1142).
 *
 * The bug was a detail page merging the viewer's cast into its `VoteSummary`
 * while its score panel read the praxis object — so the guard has to be that one
 * delta reaches both, and that the praxis arm is read back through
 * `scoreBreakdown()`, the single row-selection authority (ADR-0053). Asserting
 * the merged fields alone would pass even if the resolver stopped reading them.
 *
 * Deliberately not a click test: the harness is `renderToStaticMarkup` with no
 * jsdom, effects never run, and `useSyncExternalStore`'s server snapshot is
 * always null (see voteOverrides.ts), so a rendered component can never observe
 * an active override. The resolver is what's testable, and it's what broke.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { PraxisCardOut, PraxisOut } from '../../../api/praxis'
import type { VoteSummary } from '../../../api/votes'
import { scoreBreakdown } from '../../praxisCard/scoreStamp/scoreBreakdown'
import { applyVoteDelta, applyVoteSummaryDelta } from '../useVotedPraxis'
import { __resetVoteOverrides, recordVote, tallyDelta } from '../voteOverrides'

const PRAXIS_ID = 7

/** A detail payload: `PraxisOut` carries no voter count. (base 12 + meta 0) × 1.0 + 4. */
const DETAIL: PraxisOut = {
  id: PRAXIS_ID,
  task_id: 2,
  task_title: 'Walk the ridge',
  task_point_value: 12,
  task_level_required: 1,
  task_faction_slug: null,
  type: 'solo',
  status: 'submitted',
  title: 'The Long Way Round',
  body_text: 'Walked the whole ridge before dark.',
  moderation_status: 'visible',
  admin_note: null,
  flagged_at: null,
  submitted_at: '2026-01-03T00:00:00Z',
  submit_proposed_at: null,
  created_by_id: 3,
  created_by_display_name: 'Ada',
  created_by_faction_slug: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
  members: [],
  invites: [],
  media_items: [],
  score: 16,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  is_top_for_task: false,
  duel_id: null,
  can_flag: true,
  applied_metatasks: [],
}

/** A card payload: same numbers, plus the voter count only cards carry. */
const CARD: PraxisCardOut = {
  id: PRAXIS_ID,
  task_id: 2,
  task_title: 'Walk the ridge',
  task_point_value: 12,
  task_level_required: 1,
  type: 'solo',
  status: 'submitted',
  title: 'The Long Way Round',
  moderation_status: 'visible',
  created_by_id: 3,
  created_by_display_name: 'Ada',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
  submitted_at: '2026-01-03T00:00:00Z',
  member_count: 1,
  score: 16,
  voter_count: 2,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  is_top_for_task: false,
  task_faction_slug: null,
}

const SUMMARY: VoteSummary = { praxis_id: PRAXIS_ID, total_votes: 2, total_score: 4 }

/** The delta a first cast of 5 publishes: +5 points, +1 voter. */
function firstCastOfFive() {
  recordVote(PRAXIS_ID, 5, null)
  const delta = tallyDelta(PRAXIS_ID)
  if (!delta) throw new Error('expected an active override')
  return delta
}

describe('applyVoteDelta on a detail payload (#1142)', () => {
  beforeEach(() => {
    __resetVoteOverrides()
  })

  it('moves the score panel the archetypes render, not just the vote line', () => {
    // The regression: every praxis-detail archetype mounts ScoreStamp, which
    // resolves its rows from the praxis object. Before the fix this stayed at
    // "+ 4 from votes" / total 16 until a refresh.
    const voted = applyVoteDelta(DETAIL, firstCastOfFive())
    expect(scoreBreakdown(voted)).toEqual({
      base: 12,
      mult: null,
      meta: null,
      votes: 9,
      total: 21,
    })
  })

  it('leaves the server payload untouched, so a re-render cannot compound it', () => {
    applyVoteDelta(DETAIL, firstCastOfFive())
    expect(scoreBreakdown(DETAIL)).toEqual(
      expect.objectContaining({ votes: 4, total: 16 }),
    )
  })

  it('invents no voter count on a payload that has none', () => {
    const voted = applyVoteDelta(DETAIL, firstCastOfFive())
    expect('voter_count' in voted).toBe(false)
  })

  it('reads the same numbers off a card as off a detail payload', () => {
    // One arithmetic for both shapes is the point: the card's stamp and the
    // detail page's stamp must never disagree about the same cast.
    const delta = firstCastOfFive()
    expect(scoreBreakdown(applyVoteDelta(CARD, delta))).toEqual(
      scoreBreakdown(applyVoteDelta(DETAIL, delta)),
    )
    expect(applyVoteDelta(CARD, delta).voter_count).toBe(3)
  })
})

describe('applyVoteSummaryDelta (#1142)', () => {
  beforeEach(() => {
    __resetVoteOverrides()
  })

  it('moves the votes-only summary by the same delta', () => {
    expect(applyVoteSummaryDelta(SUMMARY, firstCastOfFive())).toEqual({
      praxis_id: PRAXIS_ID,
      total_votes: 3,
      total_score: 9,
    })
  })

  it('agrees with the praxis merge about the vote points', () => {
    // Different baselines (a summary is votes-only, a praxis total is the lot),
    // so the check is that the MOVEMENT matches, not the absolute numbers.
    const delta = firstCastOfFive()
    const summaryMoved =
      applyVoteSummaryDelta(SUMMARY, delta).total_score - SUMMARY.total_score
    const praxisMoved =
      scoreBreakdown(applyVoteDelta(DETAIL, delta)).votes - scoreBreakdown(DETAIL).votes
    expect(summaryMoved).toBe(praxisMoved)
  })

  it('re-vote: moves the score with no new voter', () => {
    recordVote(PRAXIS_ID, 5, 3)
    const delta = tallyDelta(PRAXIS_ID)
    if (!delta) throw new Error('expected an active override')
    expect(applyVoteSummaryDelta(SUMMARY, delta)).toEqual({
      praxis_id: PRAXIS_ID,
      total_votes: 2,
      total_score: 6,
    })
    expect(scoreBreakdown(applyVoteDelta(DETAIL, delta)).total).toBe(18)
  })
})
