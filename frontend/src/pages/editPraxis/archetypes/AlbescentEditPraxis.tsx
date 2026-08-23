/**
 * Albescent — the COMPOSER's tell (#2505, epic #2496). The seventh surface to
 * unfreeze, built to the rule the six before it followed: this is not a skin. It
 * renders {@link DefaultEditPraxis} whole — the same sheet, the same layout, the
 * same neutral `editPraxis.composer.*` copy an unaffiliated player writes into —
 * and hands it one inert ornament layer. Strip the span and the two composers
 * are byte-identical.
 *
 * ## Why it is one span and not a wash
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
 * the tell, so the tell moved to the sheet's EDGE, which is decorative chrome
 * beside no type at all and owes no ratio. (The text you are typing was never at
 * risk either way: `--faction-default-composer-field` is opaque, so the wash
 * does not reach inside the textarea. It is the labels ON the sheet that pay.)
 *
 * The shortfall above is na's own and predates this file; it is the #2485
 * family, on a fifth composer, and fixing it is not this issue.
 *
 * ## The mount
 *
 * `ornament` rather than a wrapper span, because the light has to clip to the
 * sheet — the epic's pattern names exactly this case, and `ComposerSheet`'s
 * `overflow: hidden` is what enforces #1028's "no composer ornament reaches the
 * viewport". A layer hung outside `DefaultEditPraxis` would paint the page.
 *
 * `.alb-composer-edge` DECLARES NOTHING OF ITS OWN. It joins
 * `.spectrum-frame::before`'s shared selector list in index.css and takes every
 * default: 1px inset, 0.6 opacity, the 300% loop-cut tile, and `border-radius:
 * inherit`, which reads the composer sheet's own 10px corner straight off
 * `ComposerSheet`. The travel is `alb-edge-travel` in motion.ornament.css —
 * a pre-painted child slid by `transform`, never a walked gradient parameter
 * (the epic's technique ruling). Six mounts share both rules; this is the
 * seventh, and it added two selector lines.
 *
 * Stilled — reduced motion, or the deferred sheet not yet delivered — there is
 * no travelling child and the ring is a static na spectrum hairline just inside
 * the sheet's own border. Nothing here carries meaning through motion alone
 * (#911: a component may not inject a stylesheet; #1003: an inline `animation:`
 * would bypass the guard).
 *
 * Nothing is repainted in Albescent's own colours and no word is added, because
 * either would put the society back in the spectrum and un-hide it (ADR-0048,
 * ADR-0027, WORLD_ZERO_STYLE §3).
 *
 * One responsive component, both widths (ADR-0065 §2) — there is no
 * `mobileEditPraxis` surface, so this one row covers the phone too.
 */
import DefaultEditPraxis from "./DefaultEditPraxis";
import { type EditPraxisState } from "../useEditPraxis";

export default function AlbescentEditPraxis({ state }: { state: EditPraxisState }) {
  return (
    <DefaultEditPraxis
      state={state}
      ornament={<span aria-hidden="true" className="alb-composer-edge" />}
    />
  );
}
