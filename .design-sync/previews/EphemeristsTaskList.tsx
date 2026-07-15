// EphemeristsTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'ephemerists').
import { EphemeristsTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <EphemeristsTaskList state={tasksState('ephemerists')} />
}
