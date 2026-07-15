// UaPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'ua').
import { UaPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <UaPraxisDetail state={praxisDetailState('ua')} />
}
