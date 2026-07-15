// EphemeristsComposer mobile screen — renders the shared editPraxis state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsComposer } from 'worldzero-frontend'
import { editPraxisState } from './_state'

export function Composer() {
  return <EphemeristsComposer state={editPraxisState('ephemerists')} />
}
