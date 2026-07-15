// SingularityHome mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'singularity').
import { SingularityHome } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <SingularityHome state={fieldDeskState('singularity')} />
}
