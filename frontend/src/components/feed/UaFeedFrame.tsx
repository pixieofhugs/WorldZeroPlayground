import { UaSigil } from '../cards/UaSigil'
import FeedChassisBand from './FeedChassisBand'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * UA feed frame (per-faction surface #12, kit §12, #851).
 *
 * A thin presentational WRAPPER: it dresses the neutral feed card (`children`)
 * as a UA row and reimplements none of the card's internals, which arrive as
 * children and keep their slot order (ADR-0016).
 *
 * The dress is two things: a 3px orange rule down the left edge and one small
 * ensō as the faction mark. No mandala — a feed is a dense, text-heavy surface
 * and the pattern is ABSENT there (brief §5). No gilt sandwich, no gold liner,
 * no engraved masthead: the salon is dead, and a feed row was the worst place
 * it lived.
 *
 * #1194: a CHASSIS BAND sits above the row, carrying the kicker, the tag, the
 * time and the dismiss control. It is inset on the right so it clears the ensō
 * rather than moving the faction mark: a functional control must not land under
 * an ornament. The dress is otherwise unchanged; UA's dress issue restyles it.
 *
 * Both themes come from the `[data-theme="dark"]` cascade.
 */
export default function UaFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--faction-ua-card-bg)',
        color: 'var(--faction-ua-card-text)',
        border: '1px solid var(--faction-ua-rule)',
        borderLeft: '3px solid var(--faction-ua)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg) var(--space-xl)',
      }}
    >
      {/* the faction mark — one of the ensō's two sanctioned uses (brief §4) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 10,
          top: 10,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <UaSigil width={18} height={18} />
      </span>

      {/* chassis band — inset on the right so the ✕ clears the ensō */}
      <div
        style={{
          color: 'var(--faction-ua-card-text)',
          paddingRight: 'var(--space-xl)',
          borderBottom: '1px solid var(--faction-ua-rule)',
          paddingBottom: 'var(--space-xs)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        <FeedChassisBand kicker={kicker} time={time} tag={tag} archive={archive} />
      </div>

      {children}
    </div>
  )
}
