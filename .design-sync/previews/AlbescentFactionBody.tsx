// AlbescentFactionBody preview (#2504, epic #2496, ADR-0048) — the faction
// page's body wearing Albescent's dress.
//
// A WRAPPER. It renders DefaultFactionBody whole — five plates, the same copy,
// the join block, the burn — and adds exactly two things: the wrapper class,
// which carries the prism ground on to the plates and every card inside them by
// overriding the na sheet token they all already read; and the plate ORNAMENT,
// a travelling spectrum ring handed to Default's frame.
//
// THE GROUND IS `.alb-prism`, THE CARDS' OWN (#2550) — in BOTH cascades. This
// class used to declare nothing in light and a fainter cut of its own in dark,
// which made the faction page and a task card beside it two drawings of one
// idea. The owner reversed that ruling: Albescent's backgrounds are in general
// the task and praxis cards'.
//
// No copy, no token of its own, no slot moved — a page that announced itself as
// Albescent would un-hide the society (ADR-0027, #783). A static capture shows
// the ornament standing: the same picture, at rest.
import { AlbescentFactionBody } from 'worldzero-frontend'
import { factionDetailState } from './_state'

export function Plates() {
  return <AlbescentFactionBody state={factionDetailState('albescent')} />
}
