// SnideHome mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'snide').
import { SnideHome } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <SnideHome state={fieldDeskState('snide')} />
}
