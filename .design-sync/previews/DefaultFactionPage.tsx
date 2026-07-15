// DefaultFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'na').
import { DefaultFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <DefaultFactionPage state={factionDetailState('na')} />
}
