// AlbescentComposer mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'albescent').
import { AlbescentComposer } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <AlbescentComposer state={editPraxisState('albescent')} />
}
