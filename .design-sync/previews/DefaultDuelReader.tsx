// DefaultDuelReader — the side-by-side duel reader (#1084), na's row and, until a
// faction's own dress lands, everybody's. It passes nothing: the chassis spreads
// `factionRoleVars(groundSlug, 'duel-reader')` from the TASK's faction, so the
// ground already follows whoever owns the task.
//
// Two cells, the two states the page is built around (both from the repo's own
// `duelReaderFrame.test.tsx`): a settled duel with both entries readable, and a
// forfeit, where the thrown side has no body and its column prints from the duel
// payload alone.
import { DefaultDuelReader } from 'worldzero-frontend'
import { duelReaderState } from './_state'

export function Settled() {
  return <DefaultDuelReader state={duelReaderState(null)} />
}

export function Forfeit() {
  return <DefaultDuelReader state={duelReaderState(null, true)} />
}
