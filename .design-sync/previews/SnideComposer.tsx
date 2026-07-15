// SnideComposer mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'snide').
import { SnideComposer } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <SnideComposer state={editPraxisState('snide')} />
}
