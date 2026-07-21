import type { PraxisCardOut } from '../../api/praxis'
import { useVoteOverride } from './voteOverrides'

/**
 * Merge the viewer's own just-cast vote into a praxis (#626).
 *
 * Both card dispatchers (desktop PraxisCard, mobile MobilePraxisCard) call this
 * before picking a faction skin, so every slot below them — the score stamp's
 * breakdown, PraxisFooterMeta's score, and the VoteUI tally — reads one
 * already-correct object instead of each learning about the cast separately.
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
  return {
    ...praxis,
    score: praxis.score + delta.score,
    voter_count: praxis.voter_count + delta.voters,
  }
}
