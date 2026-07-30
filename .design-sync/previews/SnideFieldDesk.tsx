// SnideFieldDesk mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'snide').
import { SnideFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <SnideFieldDesk state={fieldDeskState('snide')} />
}
