// EverymenFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'everymen').
import { EverymenFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <EverymenFactionPage state={factionDetailState('everymen')} />
}
