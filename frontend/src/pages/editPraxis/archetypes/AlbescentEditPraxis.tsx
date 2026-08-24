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
 * The ORNAMENT arrives through the `ornament` slot and not as a layer in the
 * wrapper below, because the light has to clip to the sheet — the epic's
 * pattern names exactly this case, and `ComposerSheet`'s `overflow: hidden` is
 * what enforces #1028's "no composer ornament reaches the viewport". A layer
 * hung outside `DefaultEditPraxis` would paint the page. The wrapper div is a
 * CASCADE HANDLE and paints nothing at all; it is the same pair
 * `AlbescentFieldDesk` uses, and every other Albescent surface has one.
 *
 * ## One carrier, not two (#2519)
 *
 * `.alb-composer-edge` shipped in #2505 declaring NOTHING of its own, so it took
 * the shared list's defaults — a 1px ring at 0.6 — and it took them BESIDE the
 * mark the design canvas removes. The board draws the composer's spectrum in the
 * sheet's edge alone: *"the masthead's own 3px spectrum rule goes with it — the
 * border carries the spectrum now."* So the ring is a 3px carrier at full
 * strength, in the block `.alb-task-edge` owns, and the wrapper class below is
 * what lets index.css take na's masthead band off this sheet
 * (`.alb-composer .ep-edge { display: none }`). One spectrum mark on the
 * composer, where there were two and the added one was the fainter.
 *
 * The band is na's own ornament and na keeps it: strip `alb-composer` and the
 * span, and the two composers are byte-identical.
 *
 * What the ring still takes from the shared list is geometry — the mask, the
 * 300% loop-cut tile, and `border-radius: inherit`, which reads the composer
 * sheet's own 10px corner straight off `ComposerSheet`. The travel is
 * `alb-edge-travel` in motion.ornament.css — a pre-painted child slid by
 * `transform`, never a walked gradient parameter (the epic's technique ruling).
 * Eight mounts share both rules; no keyframe is minted here.
 *
 * ONE MARK THE BOARD REMOVES IS STILL HERE, deliberately: the task slip's 2px
 * left ink rule. It is not a spectrum carrier, it is na's own dress
 * (`DEFAULT_COMPOSER_DRESS.slip`, an inline `borderLeft` on a shared component
 * with no class to reach), and the board takes it off na's composer as well as
 * Albescent's. That makes it #2520's half of this pass, not this file's.
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
    <div className="alb-composer">
      <DefaultEditPraxis
        state={state}
        ornament={<span aria-hidden="true" className="alb-composer-edge" />}
      />
    </div>
  );
}
