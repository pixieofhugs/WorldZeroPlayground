/**
 * Albescent editing a character (#2537) — A RE-CUTTING WRAPPER, the twin of
 * `AlbescentCreateCharacter` and built the same way: it renders
 * `DefaultEditCharacter` — the na kit, slot for slot, word for word — inside one
 * classed div.
 *
 * THIS IS NOT THE FAN-OUT. The seven faction edit archetypes are gated on the
 * owner looking at this PR's two new slots on screen. Albescent is here because
 * `surfaceDispatch.test.ts` requires a row for EVERY key in `SURFACE_KEYS` the
 * moment the key exists (#2531): "an ABSENT row is not 'renders the Default', it
 * is a reader left to guess which of those two was meant." A wrapper is six
 * lines and settles that; a dress is not.
 *
 * WHAT IS RE-CUT. na draws the conic spectrum on this page at TWO mounts — the
 * phone column's photo ring and the desktop portrait ring — and both now wear
 * `.spectrum-dial` (#2497) rather than the ramp inline, which is what makes them
 * reachable at all. `.alb-moves` is the dresser that class was minted for, so
 * both rings TURN here and stand still on every other slug. No markup is added,
 * no colour, no copy, no keyframe: the marks are na's already and this only sets
 * them moving.
 *
 * The desktop hero BAND keeps its 90deg linear ramp and is untouched — a band is
 * not a dial (#1127), and `.alb-moves .spectrum-dial` reaches only the conic cut.
 *
 * NO NEW CSS AT ALL. `.alb-moves .spectrum-dial` and its `::before` rim are in
 * index.css and motion.ornament.css already, behind that sheet's
 * `prefers-reduced-motion` gate. Stranded — reduced motion, or the sheet not yet
 * delivered — the rings are the still rainbow an unaffiliated player sees, so
 * nothing here carries meaning through motion alone.
 *
 * ONE CLASS, NOT TWO, for the reason its create twin gives: this wrapper writes
 * no rule of its own, and a class nothing declares is scaffolding for later.
 * ADR-0027's edge is untouched — strip `alb-moves` and this page is
 * byte-identical to na's.
 */
import DefaultEditCharacter from './DefaultEditCharacter'
import type { EditCharacterState } from '../useEditCharacter'

export default function AlbescentEditCharacter({ state }: { state: EditCharacterState }) {
  return (
    <div className="alb-moves">
      <DefaultEditCharacter state={state} />
    </div>
  )
}
