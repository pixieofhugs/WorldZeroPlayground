// EphemeristsTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <EphemeristsTaskDetail state={taskDetailState('ephemerists')} />
}
