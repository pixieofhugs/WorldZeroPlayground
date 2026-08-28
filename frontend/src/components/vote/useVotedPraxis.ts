import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import type { PraxisCardOut } from '../../api/praxis'
import type { VoteTallyOut } from '../../api/votes'
import type { ScoredPraxis } from '../praxisCard/scoreStamp/scoreBreakdown'
import { useCastTally } from './castTallies'

/**
 * The praxis shape a fresh cast can be merged into: the score terms
 * `scoreBreakdown()` resolves (ADR-0053), plus the card-only voter count.
 *
 * Deliberately the resolver's OWN input set. The panel that reads a score is
 * `scoreBreakdown()`'s and nothing else's, so pinning the merge to those fields
 * makes "which numbers a cast moves" and "which numbers a stamp shows" one
 * decision instead of two that can drift. `voter_count` is optional because a
 * duel side carries none.
 */
type VoteScoredPraxis = ScoredPraxis & { voter_count?: number }

/**
 * Overwrite a payload's vote numbers with the tally the server returned (#1382).
 *
 * The arithmetic half, pulled out so it's testable without the hook:
 * `useSyncExternalStore`'s server snapshot is always null under
 * `renderToStaticMarkup` (see castTallies.ts), so a component-rendered test can
 * never observe a live cast. `castTally` + this function can.
 *
 * Generic over the payload (#1142) so the card's `PraxisCardOut` and the detail
 * page's `PraxisOut` share ONE copy of "what a cast does to a score". Two copies
 * is how the card and the detail page start disagreeing.
 *
 * `score` is the whole total — `(base + meta) × mult + votes` — so the votes
 * term is SWAPPED rather than added to: subtract the votes the payload was built
 * with, add the ones that now stand. A vote's points enter that sum unmultiplied,
 * which is what makes the swap exact. This used to add a delta, and a delta is
 * only right if the payload's own baseline never moved underneath it — the
 * assumption behind both #1142 and #1239.
 */
export function applyCastTally<T extends VoteScoredPraxis>(praxis: T, tally: VoteTallyOut): T {
  return {
    ...praxis,
    // Absent stays absent: a payload with no voter count never had one, and
    // inventing `NaN` there would print through a card's footer.
    ...(typeof praxis.voter_count === 'number' ? { voter_count: tally.voter_count } : {}),
    score: praxis.score - praxis.points_from_votes + tally.points_from_votes,
    points_from_votes: tally.points_from_votes,
  }
}

/** One duellist's row, moved by whatever was cast on THAT side's praxis. */
function applyDuelSideTally(side: DuelSideOut, tally: VoteTallyOut | null): DuelSideOut {
  if (!tally) return side
  return { ...side, points_from_votes: tally.points_from_votes }
}

/**
 * The same swap on the duel card's own payload (#1239).
 *
 * The second merge point, and the only one that takes TWO tallies:
 * `DuelDetailOut` carries a `points_from_votes` per side, so a page showing a
 * duel is showing two praxes' tallies at once and either may be the one just
 * voted. The reported case was a spectator voting the RIVAL side — which has no
 * praxis payload on this page at all, so nothing short of merging into the duel
 * can move it.
 *
 * The margin comes for free: `DuelCard` derives its verdict line by subtracting
 * one side's total from the other, so merging the pair moves the sentence too.
 *
 * Deliberately does NOT touch `challenger_final_points` /
 * `opponent_final_points` — era close froze those (ADR-0052) and a resolved duel
 * is done taking votes.
 *
 * Returns the payload unchanged when neither side has a fresh cast, so the
 * common case keeps its identity and the card doesn't re-render for nothing.
 */
export function applyDuelCastTally(
  duel: DuelDetailOut,
  tallies: { challenger: VoteTallyOut | null; opponent: VoteTallyOut | null },
): DuelDetailOut {
  if (!tallies.challenger && !tallies.opponent) return duel
  return {
    ...duel,
    challenger: applyDuelSideTally(duel.challenger, tallies.challenger),
    opponent: applyDuelSideTally(duel.opponent, tallies.opponent),
  }
}

/**
 * Merge the viewer's own just-cast vote into a praxis (#626).
 *
 * The card dispatcher (`PraxisCard`, one per faction on both form factors since
 * ADR-0067) calls this before picking a faction skin, so every slot below it —
 * the score stamp's breakdown and the VoteUI tally — reads one already-correct
 * object instead of each learning about the cast separately.
 *
 * Returns the praxis unchanged when there's no fresh cast, so the common case
 * keeps its identity and skins don't re-render for nothing.
 *
 * Kept out of castTallies.ts so the store stays free of api types: the api
 * layer imports the store to clear it, and a type-only cycle back is a trap.
 */
export function useVotedPraxis(praxis: PraxisCardOut): PraxisCardOut {
  const tally = useCastTally(praxis.id)
  if (!tally) return praxis
  return applyCastTally(praxis, tally)
}
