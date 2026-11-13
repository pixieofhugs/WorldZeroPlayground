import { DefaultComment } from '../CommentThread'
import type { CommentProps } from '../shared'
import { ALBESCENT_FACTION_SLUG, isFactionRedacted } from '../../../utils/factions'

/**
 * Albescent's comment voice — reveal-gated wrapper (#2732, ADR-0088 §3). Revealed:
 * na's sheet ringed by the travelling spectrum edge, no cap; unrevealed: na's sheet.
 *
 * Not a pass-through: the sheet's cap is `factionFill(slug, 'bar')` inline, so no
 * class can move it; na's `Sheet` grew an `edge` slot instead (reverses #2531).
 * Mentions stay still `.rainbow-ink` — moving a text clip needs a gradient walk (#2498).
 * The gate is ADR-0082's `isFactionRedacted`; both modes wear it so a post does not
 * change dress on submit. Motion is behind reduced-motion in `motion.ornament.css`.
 */
export default function AlbescentComment(props: CommentProps) {
  // The constant, not the payload's slug, so no caller can make it dress a foreign leaf.
  if (isFactionRedacted(ALBESCENT_FACTION_SLUG)) return <DefaultComment {...props} />
  return (
    <DefaultComment
      {...props}
      // Shared ring (#2407); all paint is the class's.
      edge={<span aria-hidden="true" className="alb-comment-edge" />}
    />
  )
}
