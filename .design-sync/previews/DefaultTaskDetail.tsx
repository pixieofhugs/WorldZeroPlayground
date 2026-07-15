// DefaultTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'na').
import { DefaultTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <DefaultTaskDetail state={taskDetailState('na')} />
}
