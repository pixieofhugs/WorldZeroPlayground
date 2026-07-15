// AlbescentHome mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'albescent').
import { AlbescentHome } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <AlbescentHome state={fieldDeskState('albescent')} />
}
