// EverymenTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'everymen').
import { EverymenTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <EverymenTaskDetail state={taskDetailState('everymen')} />
}
