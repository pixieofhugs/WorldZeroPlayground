// WowTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'wow').
import { WowTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <WowTaskList state={tasksState('wow')} />
}
