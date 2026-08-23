/**
 * Albescent — the MOBILE field desk's tell (#2505, re-cut by #2519, epic #2496
 * ruling 5). The phone plus a carried life, and the eighth surface to unfreeze
 * on exactly the rule the seven before it followed: this is not a skin. It
 * renders {@link DefaultFieldDesk} whole — the same unaffiliated home, slot for
 * slot, word for word — and adds one inert span.
 *
 * MOBILE ONLY, AND THAT IS THE EPIC'S RULING, NOT AN OVERSIGHT. Ruling 5: the
 * desktop `/field-desk` page has no faction dispatch at all — one unskinned page
 * for all nine factions — and this issue does not add a seam for one. Desktop
 * follows this same wrapper pattern when it is needed; it is not frozen, it is
 * just not here.
 *
 * ONE CARRIER PER OBJECT, and that is what #2519 corrected. The identity card
 * already carried the na spectrum as a 3px hairline across its top edge
 * (#1553's "one mark at three scales"), and #2505 read "replace rather than
 * double up" as re-cutting THAT BAR and setting it travelling. The design
 * canvas draws the opposite move: the bar comes off and the card's own
 * travelling border does the work, *"one carrier per object, the rule the
 * faction page settled on"*. So the ornament is a masked 3px spectrum ring
 * around the card, at full strength — the same rule the task card, the praxis
 * card, the composer and the faction plates wear — and `.alb-desk
 * .spectrum-rule` in index.css is now the `display: none` that takes the
 * hairline off. na's home is untouched either way: strip this wrapper and the
 * two are byte-identical.
 *
 * THE SPAN GOES IN THROUGH A SLOT, not around the component, because the ring
 * has to clip to the CARD's rounded box and a layer hung outside would clip to
 * the page. `identityOrnament` is the epic's own name for that slot
 * (`AlbescentProfileBody` uses it for the same job); na hands nothing and draws
 * no ornament markup at all. The wrapper class stays, because it is what the
 * `display: none` above hangs off.
 *
 * NOTHING WALKS A GRADIENT PARAMETER (epic technique ruling, enforced by
 * `__tests__/spectrumRingCollapse.test.ts` since #2498). The travel is
 * `alb-edge-travel` — a pre-painted `::before`, two tiles wide, slid by
 * `transform` inside the ring's own `overflow: hidden`. No keyframe is minted
 * for this surface; it joins the rule eight mounts already share.
 *
 * The rest state is in index.css and the travel in motion.ornament.css, behind
 * that sheet's `prefers-reduced-motion` gate — a component may not inject a
 * stylesheet (#911) and an inline `animation:` would bypass the guard (#1003).
 * Stranded (sheet undelivered, or reduced motion) there is no child at all and
 * the card wears a still 3px spectrum frame, which is the same mark standing
 * where the hairline used to.
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
      <DefaultFieldDesk
        state={state}
        identityOrnament={<span aria-hidden="true" className="alb-desk-edge" />}
      />
    </div>
  )
}
