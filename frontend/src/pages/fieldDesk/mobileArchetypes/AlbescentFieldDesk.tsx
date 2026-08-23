/**
 * Albescent — the MOBILE field desk's tell (#2505, epic #2496 ruling 5). The
 * phone plus a carried life, and the eighth surface to unfreeze on exactly the
 * rule the seven before it followed: this is not a skin. It renders
 * {@link DefaultFieldDesk} whole — the same unaffiliated home, slot for slot,
 * word for word — and the whole delta is that one static mark starts moving.
 *
 * MOBILE ONLY, AND THAT IS THE EPIC'S RULING, NOT AN OVERSIGHT. Ruling 5: the
 * desktop `/field-desk` page has no faction dispatch at all — one unskinned page
 * for all nine factions — and this issue does not add a seam for one. Desktop
 * follows this same wrapper pattern when it is needed; it is not frozen, it is
 * just not here.
 *
 * THE ORNAMENT IS A CASCADE, NOT A SPAN, and that is what "replace rather than
 * double up" required. The identity block already carries the na spectrum as a
 * 3px hairline across its top edge (`#1553`'s "one mark at three scales"), so a
 * travelling edge mounted as a sibling would have put a SECOND spectrum on a
 * band that already has one. `DefaultFieldDesk` marks that hairline
 * `.spectrum-rule` (#2497's linear cut), and `.alb-desk .spectrum-rule` in
 * index.css re-cuts the same ramp as the tiling loop — two classes, so it wins
 * from here without an `!important` and without a structural selector. na's own
 * hairline is untouched: strip `alb-desk` and the two homes are byte-identical.
 *
 * NOTHING WALKS A GRADIENT PARAMETER (epic technique ruling, enforced by
 * `__tests__/spectrumRingCollapse.test.ts` since #2498). The travel is
 * `alb-edge-travel` — a pre-painted `::before`, two tiles wide, slid by
 * `transform` inside the hairline's own `overflow: hidden`. No keyframe is
 * minted for this surface; it joins the rule six mounts already share.
 *
 * The rest state is in index.css and the travel in motion.ornament.css, behind
 * that sheet's `prefers-reduced-motion` gate — a component may not inject a
 * stylesheet (#911) and an inline `animation:` would bypass the guard (#1003).
 * Stranded (sheet undelivered, or reduced motion) there is no child at all and
 * the band is a still spectrum hairline, which is what an unaffiliated player
 * already sees there.
 *
 * Nothing is repainted in Albescent's own colours, because that would put the
 * society back in the spectrum and un-hide it (ADR-0048, ADR-0027). No copy is
 * added for the same reason.
 */
import DefaultFieldDesk from './DefaultFieldDesk'
import type { FieldDeskHomeState } from '../useFieldDeskHome'

export default function AlbescentFieldDesk({ state }: { state: FieldDeskHomeState }) {
  return (
    <div className="alb-desk">
      <DefaultFieldDesk state={state} />
    </div>
  )
}
