// AlbescentFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'albescent').
import { AlbescentFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <AlbescentFactionPage state={factionDetailState('albescent')} />
}
