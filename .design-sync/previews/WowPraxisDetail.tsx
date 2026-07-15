// WowPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'wow').
import { WowPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <WowPraxisDetail state={praxisDetailState('wow')} />
}
