// UaFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'ua').
import { UaFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <UaFactionPage state={factionDetailState('ua')} />
}
