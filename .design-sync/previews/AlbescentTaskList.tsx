// AlbescentTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'albescent').
import { AlbescentTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <AlbescentTaskList state={tasksState('albescent')} />
}
