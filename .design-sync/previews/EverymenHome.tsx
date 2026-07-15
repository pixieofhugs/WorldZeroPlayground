// EverymenHome mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'everymen').
import { EverymenHome } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <EverymenHome state={fieldDeskState('everymen')} />
}
