// SnideTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'snide').
import { SnideTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <SnideTaskList state={tasksState('snide')} />
}
