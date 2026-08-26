// AlbescentFactionHero preview (#2504, epic #2496, ADR-0048) — the faction
// page's frontispiece wearing Albescent's dress.
//
// A WRAPPER, like the eight before it: it renders DefaultFactionHero whole —
// same plate, same five slots, same words — and adds one class. Strip
// `.alb-faction-hero` and the two heroes are byte-identical.
//
// WHAT THE CLASS BUYS, all of it in index.css and motion.ornament.css: the
// prism sheet (a token override, per epic ruling 2, so the na plate repaints
// itself rather than being selector-surgeried), and the labyrinth turning —
// `alb-spin`, the repo's cheap idiom of a rotate on a static mark rather than a
// walked gradient parameter.
//
// THE GROUND IS `.alb-prism`, THE CARDS' OWN (#2550). This class used to declare
// a fainter ground of its own, so the faction page and a task card beside it
// were two drawings of one idea; the owner reversed that, and Albescent's
// backgrounds are in general the task and praxis cards'.
//
// THE MARK IS NOT THIS FILE'S — FactionSigil resolves the labyrinth from the
// slug the page passes.
import { AlbescentFactionHero } from 'worldzero-frontend'

export function Prism() {
  return (
    <AlbescentFactionHero slug="albescent" name="Albescent" members={9} tasks={12} praxes={31} />
  )
}
