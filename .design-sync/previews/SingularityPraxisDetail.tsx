// SingularityPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'singularity').
import { SingularityPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <SingularityPraxisDetail state={praxisDetailState('singularity')} />
}
