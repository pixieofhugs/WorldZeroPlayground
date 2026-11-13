import { useSyncExternalStore } from 'react'
import type { VoteTallyOut } from '../../api/votes'
import { castTally, subscribeCastTallies } from '../../utils/castTallies'

/** React half of the cast-tally store; the store is `utils/castTallies.ts` (#2893). */
export function useCastTally(praxisId: number): VoteTallyOut | null {
  const read = () => castTally(praxisId)
  // Server snapshot: required for SSR tests, and always null there.
  return useSyncExternalStore(subscribeCastTallies, read, () => null)
}
