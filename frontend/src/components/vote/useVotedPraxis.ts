import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import type { PraxisCardOut } from '../../api/praxis'
import type { VoteSummary } from '../../api/votes'
import type { ScoredPraxis } from '../praxisCard/scoreStamp/scoreBreakdown'
import { useVoteOverride, type VoteDelta } from './voteOverrides'

/**
 * The praxis shape a pending vote can be merged into: the score terms
 * `scoreBreakdown()` resolves (ADR-0053), plus the card-only voter count.
 *
 * Deliberately the resolver's OWN input set. The panel that reads a score is
 * `scoreBreakdown()`'s and nothing else's, so pinning the merge to those fields
 * makes "which numbers a cast moves" and "which numbers a stamp shows" one
 * decision instead of two that can drift. `voter_count` is optional because only
 * `PraxisCardOut` carries one — a detail page counts voters from its voters list.
 */
export type VoteScoredPraxis = ScoredPraxis & { voter_count?: number }

/**
 * The arithmetic half of the merge, pulled out so it's testable without the
 * hook: `useSyncExternalStore`'s server snapshot is always null under
 * `renderToStaticMarkup` (see voteOverrides.ts), so a component-rendered test
 * can never observe an active override. `tallyDelta` + this function can.
 *
 * Generic over the payload (#1142) so the card's `PraxisCardOut` and the detail
 * page's `PraxisOut` share ONE copy of "how a pending vote adjusts a score".
 * Two copies is how the card and the detail page start disagreeing.
 *
 * `score` and `points_from_votes` both move by the same points: a praxis total
 * is `(base + meta) × mult + votes`, and a vote's points enter that sum
 * unmultiplied, so the total moves by exactly what the votes row moves by.
 */
export function applyVoteDelta<T extends VoteScoredPraxis>(praxis: T, delta: VoteDelta): T {
  return {
    ...praxis,
    // Absent stays absent: a payload with no voter count never had one, and
    // inventing `NaN` there would print through a card's footer.
    ...(typeof praxis.voter_count === 'number'
      ? { voter_count: praxis.voter_count + delta.voters }
      : {}),
    score: praxis.score + delta.score,
    points_from_votes: praxis.points_from_votes + delta.score,
  }
}

/**
 * The same delta on the votes-only summary a detail page fetches (#1142).
 *
 * A separate function, not a separate arithmetic: `VoteSummary.total_score` is a
 * votes-only baseline while a praxis `score` is the whole total (see
 * voteOverrides.ts on why no baseline is shared), so the two shapes cannot share
 * one signature — but both take their numbers from the same {@link VoteDelta},
 * and they live side by side here so a change to one is visibly a change to both.
 */
export function applyVoteSummaryDelta(votes: VoteSummary, delta: VoteDelta): VoteSummary {
  return {
    ...votes,
    total_score: votes.total_score + delta.score,
    total_votes: votes.total_votes + delta.voters,
  }
}

/** One duellist's row, moved by whatever was cast on THAT side's praxis. */
function applyDuelSideDelta(side: DuelSideOut, delta: VoteDelta | null): DuelSideOut {
  if (!delta) return side
  return { ...side, points_from_votes: side.points_from_votes + delta.score }
}

/**
 * The same delta on the duel card's own payload (#1239).
 *
 * The third merge point, and the only one that takes TWO deltas: `DuelDetailOut`
 * carries a `points_from_votes` per side, so a page showing a duel is showing
 * two praxes' tallies at once and either may be the one just voted. The reported
 * case was a spectator voting the RIVAL side — which has no praxis payload on
 * this page at all, so nothing short of merging into the duel can move it.
 *
 * The margin comes for free: `DuelCard` derives its verdict line by subtracting
 * one side's total from the other, so merging the pair moves the sentence too.
 *
 * Deliberately does NOT touch `challenger_final_points` / `opponent_final_points`
 * — era close froze those (ADR-0052) and a resolved duel is done taking votes.
 *
 * No voter count to move: a duel side carries none. Returns the payload
 * unchanged when neither side has a pending cast, so the common case keeps its
 * identity and the card doesn't re-render for nothing.
 */
export function applyDuelVoteDelta(
  duel: DuelDetailOut,
  deltas: { challenger: VoteDelta | null; opponent: VoteDelta | null },
): DuelDetailOut {
  if (!deltas.challenger && !deltas.opponent) return duel
  return {
    ...duel,
    challenger: applyDuelSideDelta(duel.challenger, deltas.challenger),
    opponent: applyDuelSideDelta(duel.opponent, deltas.opponent),
  }
}

/**
 * Merge the viewer's own just-cast vote into a praxis (#626).
 *
 * The card dispatcher (`PraxisCard`, one per faction on both form factors since
 * ADR-0067) calls this before picking a faction skin, so every slot below it —
 * the score stamp's
 * breakdown and the VoteUI tally — reads one already-correct object instead of
 * each learning about the cast separately.
 *
 * Returns the praxis unchanged when there's no override, so the common case
 * keeps its identity and skins don't re-render for nothing.
 *
 * Kept out of voteOverrides.ts so the store stays free of api types: the api
 * layer imports the store to clear it, and a type-only cycle back is a trap.
 */
export function useVotedPraxis(praxis: PraxisCardOut): PraxisCardOut {
  const delta = useVoteOverride(praxis.id)
  if (!delta) return praxis
  return applyVoteDelta(praxis, delta)
}
