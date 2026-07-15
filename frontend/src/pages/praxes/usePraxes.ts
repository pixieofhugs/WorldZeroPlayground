/**
 * usePraxes — the praxis-feed data lift shared by the desktop list and the
 * mobile stream (#499). Extracted verbatim from the old inline Praxes.tsx body
 * so both form factors read the same 3-way (solo / collab / duel) fetch; the
 * desktop page renders exactly as before. Collab + duel are merged into one
 * `collabItems` bucket, matching the pre-extraction behaviour.
 */
import { listPraxes, type PraxisCardOut } from '../../api/praxis'
import { useResource } from '../../hooks/useResource'

export interface PraxesFeedState {
  /** Solo submitted praxes. */
  soloItems: PraxisCardOut[]
  /** Collab + duel submitted praxes, concatenated (collab first). */
  collabItems: PraxisCardOut[]
  loading: boolean
  error: Error | null
  /** True when neither bucket has any entry (drives the empty state). */
  isEmpty: boolean
}

export function usePraxes(): PraxesFeedState {
  const { data, loading, error } = useResource(
    () =>
      Promise.all([
        listPraxes({ type: 'solo', status: 'submitted' }),
        listPraxes({ type: 'collab', status: 'submitted' }),
        listPraxes({ type: 'duel', status: 'submitted' }),
      ]),
    [],
  )
  const soloItems = data ? data[0] : []
  const collabItems = data ? [...data[1], ...data[2]] : []
  const isEmpty = soloItems.length === 0 && collabItems.length === 0

  return { soloItems, collabItems, loading, error, isEmpty }
}
