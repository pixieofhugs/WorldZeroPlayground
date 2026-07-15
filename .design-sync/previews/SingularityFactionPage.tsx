// SingularityFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'singularity').
import { SingularityFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <SingularityFactionPage state={factionDetailState('singularity')} />
}
