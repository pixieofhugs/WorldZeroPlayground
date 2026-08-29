import { useSyncExternalStore } from 'react'
import type { VoteTallyOut } from '../../api/votes'
import { castTally, subscribeCastTallies } from '../../utils/castTallies'

/**
 * The React half of the cast-tally store (#2893). The store itself — what an
 * entry means, why it exists, `recordCastTally`/`clearCastTallies`/`castTally`
 * and the `__resetCastTallies` test seam — lives in `utils/castTallies.ts` now,
 * because `api/praxis.ts` and `api/duel.ts` need `clearCastTallies` and an api
 * module importing a component was the layering violation #2893 filed. This
 * file keeps only the one thing that belongs beside the vote UI: the
 * subscribing hook.
 */

/** Subscribing read for the merge points in useVotedPraxis.ts. */
export function useCastTally(praxisId: number): VoteTallyOut | null {
  const read = () => castTally(praxisId)
  // Third arg is the server snapshot: praxis cards render through
  // renderToStaticMarkup in the archetype tests, and useSyncExternalStore throws
  // without it. Nobody has voted during an SSR pass, so it's always null.
  return useSyncExternalStore(subscribeCastTallies, read, () => null)
}
