// SingularityFieldDesk mobile screen — renders the shared fieldDesk state
// in this faction's skin (slug 'singularity').
import { SingularityFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

export function Home() {
  return <SingularityFieldDesk state={fieldDeskState('singularity')} />
}
