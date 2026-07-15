// UaTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'ua').
import { UaTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <UaTaskDetail state={taskDetailState('ua')} />
}
