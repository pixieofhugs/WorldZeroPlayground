// EphemeristsFactionPage mobile screen — renders the shared factionDetail state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsFactionPage } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Page() {
  return <EphemeristsFactionPage state={factionDetailState('ephemerists')} />
}
