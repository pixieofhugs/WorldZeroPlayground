// SnideFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'snide').
import { SnideFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <SnideFactionPage state={factionDetailState('snide')} />
}
