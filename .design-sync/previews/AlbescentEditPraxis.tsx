// AlbescentEditPraxis — the praxis composer wearing Albescent's dress
// (epic #2496). A wrapper over the na composer: same slots, same copy, with the
// surface class carrying the prism ground. Stilled, it is the na screen exactly.
import { AlbescentEditPraxis } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <AlbescentEditPraxis state={editPraxisState('albescent')} />
}
