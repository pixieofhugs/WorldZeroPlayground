// EverymenPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'everymen').
import { EverymenPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <EverymenPraxisDetail state={praxisDetailState('everymen')} />
}
