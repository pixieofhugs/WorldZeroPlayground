// DefaultEditPraxis mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'na').
import { DefaultEditPraxis } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <DefaultEditPraxis state={editPraxisState('na')} />
}
