// EverymenFieldDesk mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'everymen').
import { EverymenFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <EverymenFieldDesk state={fieldDeskState('everymen')} />
}
