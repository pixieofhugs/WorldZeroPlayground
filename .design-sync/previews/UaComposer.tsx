// UaComposer mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'ua').
import { UaComposer } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <UaComposer state={editPraxisState('ua')} />
}
