// EphemeristsFieldDesk mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <EphemeristsFieldDesk state={fieldDeskState('ephemerists')} />
}
