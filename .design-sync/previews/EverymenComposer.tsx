// EverymenComposer mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'everymen').
import { EverymenComposer } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <EverymenComposer state={editPraxisState('everymen')} />
}
