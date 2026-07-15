// WowEditPraxis mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'wow').
import { WowEditPraxis } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <WowEditPraxis state={editPraxisState('wow')} />
}
