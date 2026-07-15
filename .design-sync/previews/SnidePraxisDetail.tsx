// SnidePraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'snide').
import { SnidePraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <SnidePraxisDetail state={praxisDetailState('snide')} />
}
