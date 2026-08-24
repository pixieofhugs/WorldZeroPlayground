import DefaultScoreStamp from "./DefaultScoreStamp";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * Albescent — the score stamp's tell (#2501, epic #2496).
 *
 * The LAST faction with a roster to claim this surface. Seven factions register
 * `scoreStamp`; Albescent did not, so a member's praxis showed the bare `na`
 * stamp while every other faction's was dressed — the one surface where the
 * secret society was indistinguishable by ACCIDENT rather than by design.
 *
 * ## It is a wrapper, not an eighth skin
 *
 * The whole component is {@link DefaultScoreStamp} plus one class. Epic ruling 4
 * is "upgrade, never replace": strip `alb-stamp` and the two stamps are
 * byte-identical, which is the property a hand-copied skin could never keep and
 * the reason a change to `scoreBreakdown()`'s row selection (ADR-0053), to the
 * crown, or to the #1444 unscored gate reaches Albescent with no edit here.
 * `scoreStamp.test.tsx` asserts that equality directly.
 *
 * Nothing is repainted. A `--faction-albescent-*` hue would put the society back
 * in the spectrum and un-hide it (ADR-0027, WORLD_ZERO_STYLE §3), so the delta is
 * MOTION only: the two na spectra this object already carries start to move. The
 * stamp's own docstring names them — the 2px band across its top edge, and the
 * points ring's annulus — and since #2497 each carries a shared class
 * (`.spectrum-rule`, `.spectrum-dial`), so the cascade reaches both. THAT IS WHY
 * THIS WRAPPER HOLDS NO ORNAMENT SPAN: there is nothing to add, only two things
 * already drawn here to set moving.
 *
 * ## Why the class is not the design canvas's answer
 *
 * The canvas rules that no `AlbescentScoreStamp` is written and the kit reuses
 * `AlbescentVote` on this mount. That is a component SWAP, and it conflates two
 * objects: a vote widget is an INPUT (five petals, "3 of 5"), a score stamp is a
 * READOUT (a total and its working out). The canvas's own CSS dresses the stamp
 * — `ss-turn` on the 96px ring, `ss-travel` on the band — so the CSS is built and
 * the prose is not (owner ruling on #2501).
 *
 * ## The wrapper is a bare `<div>`
 *
 * No `position: relative`, unlike the epic's sketch: that exists so a sibling
 * ornament span has something to anchor to, and there is no span here. No
 * `flex-shrink` and no width either — the stamp is size-agnostic by contract
 * (`ScoreStamp.tsx`: "NO SKIN DECLARES `flex-shrink: 0`"), and a block wrapper at
 * `width: auto` hands its flex parent the same content-based basis and the same
 * `min-width: auto` floor the stamp itself was handing it.
 *
 * index.css owns the two spectra's resting form and `motion.ornament.css` owns
 * their motion; a component may not inject a stylesheet (#911). Stilled — reduced
 * motion, or the deferred sheet not yet delivered — this is the static spectrum
 * stamp an unaffiliated player sees, so nothing here carries meaning through
 * motion alone.
 *
 * One row covers every mount: the praxis cards, the nine praxis-detail rails, the
 * composer's task slip and its waiting surface all reach this through the single
 * `ScoreStamp` dispatcher (ADR-0049).
 */
export default function AlbescentScoreStamp(props: ScoreStampProps) {
  return (
    <div className="alb-stamp alb-moves">
      <DefaultScoreStamp {...props} />
    </div>
  );
}
