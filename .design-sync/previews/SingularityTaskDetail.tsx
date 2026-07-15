// SingularityTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'singularity').
import { SingularityTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <SingularityTaskDetail state={taskDetailState('singularity')} />
}
