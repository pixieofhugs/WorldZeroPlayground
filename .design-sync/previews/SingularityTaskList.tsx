// SingularityTaskList mobile screen — renders the shared tasks state
// in this faction's skin (slug 'singularity').
import { SingularityTaskList } from 'worldzero-frontend'
import { tasksState } from './_state'

export function Browse() {
  return <SingularityTaskList state={tasksState('singularity')} />
}
