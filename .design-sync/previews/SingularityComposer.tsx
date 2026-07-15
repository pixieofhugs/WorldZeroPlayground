// SingularityComposer mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'singularity').
import { SingularityComposer } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <SingularityComposer state={editPraxisState('singularity')} />
}
