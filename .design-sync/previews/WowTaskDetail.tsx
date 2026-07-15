// WowTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'wow').
import { WowTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <WowTaskDetail state={taskDetailState('wow')} />
}
