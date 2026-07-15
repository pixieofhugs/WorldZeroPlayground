// UaTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'ua').
import { UaTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <UaTaskList state={tasksState('ua')} />
}
