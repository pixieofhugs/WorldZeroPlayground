// EphemeristsHome mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsHome } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <EphemeristsHome state={fieldDeskState('ephemerists')} />
}
