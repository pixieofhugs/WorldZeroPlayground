// DefaultProposeTask — the na form of Propose a Task, and the chassis every
// archetype in #2538's fan-out dresses. It shipped a floor card while its own
// pass-through wrapper (AlbescentProposeTask) had an authored preview; this is
// that gap closed.
//
// The slug is 'na': the page's real opening position, and the same default the
// repo's own `__tests__/proposeTaskState.ts` builds. An unaffiliated proposer
// is who this skin is FOR — the themed archetypes above cover the dressed case.
//
// ONE CELL: the form is one composition, and the variant axis (which faction is
// being proposed for) is what the seven archetype cards already sweep.
import { DefaultProposeTask } from 'worldzero-frontend'
import { proposeTaskState } from './_state'

export function Propose() {
  return <DefaultProposeTask state={proposeTaskState('na')} />
}
