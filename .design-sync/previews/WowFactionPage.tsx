// WowFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'wow').
import { WowFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <WowFactionPage state={factionDetailState('wow')} />
}
