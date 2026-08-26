// AlbescentFieldDesk — the mobile home wearing Albescent's dress (epic #2496).
// A wrapper over the na desk: the same character header, stat tiles, quests and
// actions, with the surface class that carries the prism ground and sets the
// page's existing spectrum marks turning. Stilled, it is the na desk exactly.
import { AlbescentFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

/** A mid-level Albescent life with two active quests. */
export function Home() {
  return <AlbescentFieldDesk state={fieldDeskState('albescent')} />
}
