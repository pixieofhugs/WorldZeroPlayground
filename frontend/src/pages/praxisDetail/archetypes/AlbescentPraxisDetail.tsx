import DefaultPraxisDetail from './DefaultPraxisDetail'
import type { PraxisDetailState } from '../usePraxisDetail'

/**
 * Albescent — the praxis detail's tell (#1140, epic #1085; design project
 * bebdf7c7, `Albescent Praxis Detail.dc.html`). The FOURTH Albescent surface to
 * unfreeze, after the praxis card (#821), the task card (#1023) and the task
 * detail (#1038), and built to the same rule as all three: **this is not an
 * eighth skin.**
 *
 * It renders the exact {@link DefaultPraxisDetail} an unaffiliated player sees
 * and washes light over it. Strip the three ornament spans and the page is
 * `Default` byte for byte — the property a hand-copied skin could never keep,
 * and the reason a change to the shared layout or to the praxis-detail contract
 * reaches Albescent with no edit here.
 *
 * ### Why a wrapper and not a skin
 *
 * Albescent is a secret society hiding in plain sight (ADR-0027), so it has no
 * `--faction-albescent-*` token block and `isKnownFaction('albescent')` is false
 * on purpose (WORLD_ZERO_STYLE §3). ADR-0048 makes "frozen" mean "frozen UNTIL
 * DESIGNED" and releases surfaces one at a time as `Default` PLUS a flourish;
 * ADR-0046's registration freeze was reversed for this epic (#1151), which
 * changes *whether* this row may exist, not *what shape* it takes.
 *
 * The design agrees. Its dress is Lora + Courier Prime + Bebas Neue — the site's
 * own three faces, not a faction face — and its palette is na's spectrum. Every
 * delta is MOTION: an aurora drifting under the vellum, a prism ring turning
 * slowly behind the sheet, and the spectrum edge coming alive. A shimmer reveals
 * the society to someone already looking; a colour would put it back in the
 * spectrum and un-hide it.
 *
 * ### The words are cut
 *
 * The design is voiced throughout — "the ask", "what was attended", "entered
 * together by", "metatasks kept", "base / witness / meta", "bear witness", "who
 * has read it", "said quietly", "enter it", "revise the account". **None of it
 * is built** (owner ruling on #1140, 2026-07-28): this skin is dress only and
 * registers no `detail.albescent.*` block, so the page speaks the shared neutral
 * `detail.*` copy — ADR-0061's standing rule for every skin. An amendment that
 * would have let a faction voice the content slots was written and withdrawn the
 * same day (2026-07-28); ADR-0027 is why Albescent would have declined it anyway. A per-faction WORD is as
 * identifying as a per-faction hue, and it renders to every viewer — the same
 * ruling the task detail took (#1038) and the same one that deleted Albescent's
 * vote vocabulary and comment dialect in #783.
 *
 * That includes the score rail. The design labels its rows "base / witness /
 * meta"; the rail is `ScoreStamp`'s since #1091 and `scoreBreakdown()` is the
 * single row-selection authority (ADR-0053), so the stamp ships as-is. Nothing
 * here re-derives what a praxis is worth.
 *
 * ### Where the light sits
 *
 * THE GROUND IS IN THE SHEET (#2499, epic #2496 ruling 2). `.alb-praxis-aurora`
 * was seven blooms blended over the column — the third of five hand-drawn washes
 * across this kit, all the same idea drawn differently because each was invented
 * at its own mount. `.alb-prism` on this wrapper replaces all five with one value
 * on the na card's own sheet token, which `DefaultPraxisDetail` composes through
 * `factionSheet()`. A background layer sits behind every word by construction, so
 * the ground needs none of the blending argument the ornaments below still do.
 *
 * WHAT IS LEFT IS INSIDE THE SHEET, ON TOP, BLENDED. `DefaultPraxisDetail` paints
 * an OPAQUE column, so an ornament layered behind it is invisible — `z-index: -1`
 * is not a position available here (§5). The two layers go through the shared
 * component's optional `ornament` slot rather than being wrapped around it from
 * outside, because the breadcrumb above the sheet is variable-height and no
 * fixed inset would land on the sheet's top edge. Mounted there they inherit the
 * sheet's `overflow: hidden` and 18px radius, so the light is clipped to the
 * COMPONENT and the site background still shows around it (the #1028 ruling).
 * `isolation: isolate` on the wrapper keeps the blend from reaching the page.
 *
 * index.css owns every class here, both theme halves, the reduced-motion gate and
 * the reduced-motion REST FRAME; a component may not inject a stylesheet (#911).
 * Stilled, the page is a static prism ground, a static ring and a static edge —
 * and the ground DEEPENS for that reader rather than merely standing still
 * (#2499, epic ruling 6), so "Albescent" and "the motion sheet has not arrived"
 * are no longer the same picture.
 *
 * No `useFormFactor()` call and no mobile sibling: praxis detail is one
 * responsive component (ADR-0063), and the responsive half lives in
 * `DefaultPraxisDetail`, which this forwards to whole. The light is the same
 * light at both widths.
 */
export default function AlbescentPraxisDetail({ state }: { state: PraxisDetailState }) {
  return (
    <div className="alb-praxis alb-moves alb-prism">
      <DefaultPraxisDetail
        state={state}
        ornament={
          <>
            <span aria-hidden="true" className="alb-praxis-ring" />
            <span aria-hidden="true" className="alb-praxis-edge" />
          </>
        }
      />
    </div>
  )
}
