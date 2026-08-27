/**
 * Albescent — the COMPOSER's tell (#2505, epic #2496). The seventh surface to
 * unfreeze, built to the rule the six before it followed: this is not a skin. It
 * renders {@link DefaultEditPraxis} whole — the same sheet, the same layout, the
 * same neutral `editPraxis.composer.*` copy an unaffiliated player writes into.
 * Strip the wrapper class and the two composers are byte-identical.
 *
 * ## Why there is no wash
 *
 * The design canvas draws a bloom behind the live textarea and flags it as the
 * one place the ground may need dialling back. Measured on the REAL composited
 * ground rather than the declared token (#2485's rule), the dial-back is to
 * nothing:
 *
 *   `ComposerGround` washes the seven-stop aurora under the whole content
 *   column, and the composer's quiet tier (`--faction-default-composer-faint` —
 *   the autosave line, the inactive Write/Preview tab, `Save draft`, `Drop`)
 *   already reads **3.67:1 in light and 3.02:1 in dark** on that composite,
 *   against flat-token readings of 4.86 and 4.61. The budget is overdrawn before
 *   Albescent adds anything, so any second layer under that column spends
 *   contrast this surface does not have.
 *
 * A composer is where people read their own words while typing. Legibility beats
 * the tell, so the tell is the sheet's EDGE, which is decorative chrome beside
 * no type at all and owes no ratio. (The text you are typing was never at
 * risk either way: `--faction-default-composer-field` is opaque, so the wash
 * does not reach inside the textarea. It is the labels ON the sheet that pay.)
 *
 * The shortfall above is na's own and predates this file; it is the #2485
 * family, on a fifth composer, and fixing it is not this issue.
 *
 * ## The mount
 *
 * There is nothing mounted. The wrapper div is a CASCADE HANDLE and paints
 * nothing at all; it is the same pair `AlbescentFieldDesk` uses, and it is what
 * the manifest dispatches (ADR-0083 §1).
 *
 * ## One carrier, and it is na's own (#2553)
 *
 * `.alb-composer-edge` — a 3px masked ring in `DefaultEditPraxis`'s `ornament`
 * slot — used to hang here. It came off. Two issues put a 3px na spectrum frame
 * on this one sheet without knowing about each other:
 *
 *   #2520 gave na's sheet a `3px solid transparent` border with the ramp painted
 *   into the border box (`sheetStyle` in `DefaultEditPraxis`), the same
 *   `border-box` idiom the task card, the praxis card and the seal wear.
 *
 *   #2505 added this ring, and #2519 widened it to 3px at full strength on the
 *   premise that it replaced na's MASTHEAD band. That band had already gone with
 *   #2520; the ring was doubling the sheet's new frame instead.
 *
 * So the composer wore two 3px spectrum frames, one just inside the other, which
 * is the doubling ADR-0083 §3b exists to stop. The owner's ruling on #2553 is
 * that na's sheet frame is the survivor, so the composer and the task card read
 * as the same object.
 *
 * WHY THE RING COULD NOT SIMPLY BE MOVED ONTO na's FRAME. On the task card the
 * ring hangs off a wrapper OUTSIDE the card, so `inset: 0` lands on the card's
 * border box and the ring covers na's border exactly — one frame, travelling.
 * Here the ornament has to be inside the sheet (#1028: `ComposerSheet`'s
 * `overflow: hidden` is what stops a composer ornament reaching the viewport),
 * and that same `overflow` clips every descendant to the PADDING box. A ring at
 * `inset: -3px` is clipped away entirely; at `inset: 0` it is a second frame.
 * The border belongs to the sheet element itself, so no descendant can travel on
 * it.
 *
 * ponytail: the composer's carrier is therefore STATIC, where the task card's
 * travels. That is consistent with ADR-0083 §3a — a padded ramp holding content
 * is a FRAME and frames stay still, and the ADR names this exact clip as one of
 * the three reasons — but it does leave this surface's delta as the ground and
 * the marks inside it rather than a moving edge. The upgrade path is a `frame`
 * slot on `ComposerSheet` rendering the ring as a SIBLING of the sheet inside
 * the `maxWidth` column: that box's padding box is the sheet's border box, so
 * `inset: 0` would cover na's frame the way it does on the task card, still
 * clipped to the column and never to the viewport. That is a change to na's
 * shared composer anatomy and belongs to its own issue.
 *
 * ONE MARK THE BOARD REMOVES IS STILL HERE, deliberately: the task slip's 2px
 * left ink rule. It is not a spectrum carrier, it is na's own dress
 * (`DEFAULT_COMPOSER_DRESS.slip`, an inline `borderLeft` on a shared component
 * with no class to reach), and the board takes it off na's composer as well as
 * Albescent's. That makes it #2520's half of this pass, not this file's.
 *
 * Stilled — reduced motion, or the deferred sheet not yet delivered — the sheet
 * is exactly what it is at rest: na's static 3px spectrum frame. Nothing here
 * carries meaning through motion alone (#911: a component may not inject a
 * stylesheet; #1003: an inline `animation:` would bypass the guard).
 *
 * Nothing is repainted in Albescent's own colours and no word is added, because
 * either would put the society back in the spectrum and un-hide it (ADR-0083 §1,
 * ADR-0027, WORLD_ZERO_STYLE §3).
 *
 * One responsive component, both widths (ADR-0065 §2) — no mobile twin, so
 * this one file covers the phone too.
 */
import DefaultEditPraxis from "./DefaultEditPraxis";
import { type EditPraxisState } from "../useEditPraxis";

export default function AlbescentEditPraxis({ state }: { state: EditPraxisState }) {
  return (
    <div className="alb-composer">
      <DefaultEditPraxis state={state} />
    </div>
  );
}
