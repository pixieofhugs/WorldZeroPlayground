// EverymenTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'everymen').
import { EverymenTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <EverymenTaskList state={tasksState('everymen')} />
}
