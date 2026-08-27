import { DefaultComment } from '../CommentThread'
import type { CommentProps } from '../shared'
import { ALBESCENT_FACTION_SLUG, isFactionRedacted } from '../../../utils/factions'

/**
 * Albescent's comment voice — a RE-CUTTING wrapper, reveal-gated (#2732,
 * ADR-0088 §3).
 *
 * A revealed viewer sees the leaf ringed in the shared travelling spectrum edge
 * and wearing NO cap. An unrevealed viewer sees na's sheet, cap and all, exactly
 * as before — this file is the gate, and `<DefaultComment>` with the slot left
 * empty is byte-identical to what shipped yesterday.
 *
 * ── THIS FILE USED TO ARGUE THE OPPOSITE, AND THE ARGUMENT IS OVERRULED ──────
 *
 * It was a pass-through, and forty lines explaining that it could never be
 * anything else. The FINDING it rested on is still true and is worth keeping:
 *
 *   THE SHEET'S CAP IS CONDITIONAL, SO IT HAS NO CLASS. The 3px stripe across
 *   the top of every sheet is `factionFill(slug, 'bar')` inline — the ramp is
 *   COMPUTED FROM THE SLUG (a rainbow for na, a solid hue for a themed slug that
 *   registered no voice) — so `.spectrum-rule` may not be conditional and the
 *   dresser `.alb-moves` feeds reaches nothing here.
 *
 * What that finding actually proves is that a WRAPPER cannot do it, which is
 * what #2531 concluded. ADR-0088 takes the next step instead of stopping: na's
 * `Sheet` grew an `edge` slot, filling it suppresses the cap, and this file
 * fills it. **#1192 decision 13 and #2531 are both REVERSED for this surface.**
 * Do not restore the pass-through from a docblock; the reasoning that would ask
 * you to is above, and it has been answered.
 *
 * ── WHAT IS STILL NOT TOUCHED ───────────────────────────────────────────────
 *
 * Resolved @mentions stay `.rainbow-ink`. #2531's SECOND reason holds unchanged:
 * a `background-clip: text` fill can only be moved by walking a gradient
 * parameter, which is the one technique the epic forbids (#2498), and it is a
 * player's own words — the last ink in the app that should start moving under
 * them. The ring is chrome; the ink is not.
 *
 * ── THE THREE DECISIONS THIS FILE MAKES ─────────────────────────────────────
 *
 * **IT DRIFTS**, with the other nine (#2404: all Albescent borders move slowly).
 * This is the surface that had been the exception, on #2502's objection — which
 * was written about a 24px avatar disc turning inside a grid of forty. A thread
 * is a short column of wide leaves, where a slow edge reads as that person's
 * card rather than as a beacon. The motion lives in `motion.ornament.css`,
 * behind `prefers-reduced-motion`, and stilling it is a one-line retreat noted
 * at that mount.
 *
 * **THE GATE IS THE REDACTION**, not a second predicate. `isFactionRedacted` is
 * ADR-0082's, the same answer the select tile and the leaderboard lane read
 * (#2409); a mark this file gated on anything else would eventually disagree
 * with the words beside it.
 *
 * **BOTH MODES, ONE SHEET.** The composer is the same leaf with a draft in it,
 * and an Albescent member reading her own thread would otherwise watch her post
 * change dress the moment she submitted it. It is also the smaller diff: the
 * slot goes into `DefaultComment`, which mounts one `Sheet` per mode.
 */
export default function AlbescentComment(props: CommentProps) {
  // The slug is the constant and not `props`: this voice is dispatched on
  // `albescent` in both modes, and reading it off the payload would let a future
  // caller hand this component a leaf it must not dress.
  if (isFactionRedacted(ALBESCENT_FACTION_SLUG)) return <DefaultComment {...props} />
  return (
    <DefaultComment
      {...props}
      // The tenth mount of the shared ring (#2407 → index.css). A bare span, no
      // paint of its own: colour and geometry are the class's, `aria-hidden`
      // because it is chrome, and the corner comes from `border-radius: inherit`
      // reading the sheet's own.
      edge={<span aria-hidden="true" className="alb-comment-edge" />}
    />
  )
}
