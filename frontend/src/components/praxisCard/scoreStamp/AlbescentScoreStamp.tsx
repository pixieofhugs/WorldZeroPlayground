import DefaultScoreStamp from "./DefaultScoreStamp";
import type { ScoreStampProps } from "./ScoreStamp";

/**
 * Albescent — the score stamp's tell (#2501).
 *
 * A wrapper, not a skin: {@link DefaultScoreStamp} plus one class ("upgrade,
 * never replace"), so strip `alb-stamp` and the two are byte-identical
 * (`scoreStamp.test.tsx`), and row-selection/crown/#1444 changes reach it free.
 * No `--faction-albescent-*` hue: colour would un-hide the society (ADR-0027),
 * so the delta is MOTION only: the na points ring (`.spectrum-dial`) and the
 * working-out rule (`.spectrum-rule`) start to move. No ornament span is needed.
 *
 * A bare `<div>`: no positioning (nothing to anchor), no width or
 * `flex-shrink` (the stamp is size-agnostic, see `ScoreStamp.tsx`). Resting form
 * is index.css, motion is `motion.ornament.css` (#911); stilled, it is the plain
 * na stamp, so no meaning rides on motion.
 */
export default function AlbescentScoreStamp(props: ScoreStampProps) {
  return (
    <div className="alb-stamp alb-moves">
      <DefaultScoreStamp {...props} />
    </div>
  );
}
