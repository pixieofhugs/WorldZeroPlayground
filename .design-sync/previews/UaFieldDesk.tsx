// UaFieldDesk mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'ua').
import { UaFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <UaFieldDesk state={fieldDeskState('ua')} />
}
