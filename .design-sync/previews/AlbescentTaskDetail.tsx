// AlbescentTaskDetail mobile screen — renders the shared taskDetail state
// in this faction's skin (slug 'albescent').
import { AlbescentTaskDetail } from 'worldzero-frontend'
import { taskDetailState } from './_state'

export function Detail() {
  return <AlbescentTaskDetail state={taskDetailState('albescent')} />
}
