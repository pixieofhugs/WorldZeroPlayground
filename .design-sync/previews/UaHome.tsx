// UaHome mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'ua').
import { UaHome } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <UaHome state={fieldDeskState('ua')} />
}
