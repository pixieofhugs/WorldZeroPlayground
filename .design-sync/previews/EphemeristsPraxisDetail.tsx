// EphemeristsPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <EphemeristsPraxisDetail state={praxisDetailState('ephemerists')} />
}
