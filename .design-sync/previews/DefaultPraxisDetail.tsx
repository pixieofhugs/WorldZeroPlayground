// DefaultPraxisDetail mobile screen — renders the shared praxisDetail state
// in this faction's skin (slug 'na').
import { DefaultPraxisDetail } from 'worldzero-frontend'
import { praxisDetailState } from './_state'

export function Reading() {
  return <DefaultPraxisDetail state={praxisDetailState('na')} />
}
