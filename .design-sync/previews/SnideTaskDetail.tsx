// SnideTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'snide').
import { SnideTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <SnideTaskDetail state={taskDetailState('snide')} />
}
