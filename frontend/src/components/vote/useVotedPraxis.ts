import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import type { PraxisCardOut } from '../../api/praxis'
import type { VoteTallyOut } from '../../api/votes'
import type { ScoredPraxis } from '../praxisCard/scoreStamp/scoreBreakdown'
import { useCastTally } from './castTallies'

/**
 * `scoreBreakdown()`'s own inputs (ADR-0053), so what a cast moves and what a
 * stamp shows cannot drift; plus the optional voter count.
 */
type VoteScoredPraxis = ScoredPraxis & { voter_count?: number }

/**
 * Overwrite a payload's vote numbers with the server's tally (#1382). Pure, so
 * testable without SSR; generic so card and detail share one copy (#1142).
 * `score` is `(base + meta) × mult + votes` with votes unmultiplied, so the
 * votes term is SWAPPED exactly, never a delta (#1142, #1239).
 */
export function applyCastTally<T extends VoteScoredPraxis>(praxis: T, tally: VoteTallyOut): T {
  return {
    ...praxis,
    // Absent stays absent, or `NaN` prints in a card footer.
    ...(typeof praxis.voter_count === 'number' ? { voter_count: tally.voter_count } : {}),
    score: praxis.score - praxis.points_from_votes + tally.points_from_votes,
    points_from_votes: tally.points_from_votes,
  }
}

function applyDuelSideTally(side: DuelSideOut, tally: VoteTallyOut | null): DuelSideOut {
  if (!tally) return side
  return { ...side, points_from_votes: tally.points_from_votes }
}

/**
 * The same swap on the duel payload, per side (#1239): the rival side has no
 * praxis payload on the page. Leaves `*_final_points` alone (frozen at era
 * close, ADR-0052). Same object back when neither side has a cast.
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
 * Merge the viewer's just-cast vote into a praxis (#626), called by `PraxisCard`
 * before picking a skin. Same object back when there is no cast. Kept out of
 * castTallies.ts to avoid a type cycle with the api layer.
 */
export function useVotedPraxis(praxis: PraxisCardOut): PraxisCardOut {
  const tally = useCastTally(praxis.id)
  if (!tally) return praxis
  return applyCastTally(praxis, tally)
}
