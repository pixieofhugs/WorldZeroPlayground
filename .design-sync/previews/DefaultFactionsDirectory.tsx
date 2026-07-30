// DefaultFactionsDirectory mobile — the factions grid. Presentation-only: it
// takes the whole directory as one `state` prop (it no longer self-fetches), so
// the preview hands it a populated roster of every live faction.
import { DefaultFactionsDirectory } from 'worldzero-frontend'
import { factionsDirectoryState } from './_state'

export function Directory() {
  return <DefaultFactionsDirectory state={factionsDirectoryState()} />
}
