// DefaultTasks mobile screen — renders the shared tasks state
// in this faction's skin (slug 'na').
import { DefaultTasks } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <DefaultTasks state={tasksState('na')} />
}
