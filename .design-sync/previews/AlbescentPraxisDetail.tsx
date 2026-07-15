// AlbescentPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'albescent').
import { AlbescentPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <AlbescentPraxisDetail state={praxisDetailState('albescent')} />
}
