import { EphemeristsSigil, Foxing } from '../cards/ephemeristsAtoms'
import FeedChassisBand from './FeedChassisBand'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Ephemerists feed-card FRAME (surface #12, SPEC-faction-ui-profile.md).
 *
 * A thin presentational wrapper that dresses the neutral feed card (`children`)
 * as a leaf torn from the faction's ephemeris: foxed-vellum stock, an iron-gall
 * ink hairline, a gold-ruled running edge, and a rubric marginal sigil. The card
 * internals (avatar / actor / badge) are untouched — they arrive via
 * `{children}` and render in the content area.
 *
 * #1194: the leaf gains a CHASSIS BAND above the content — a ruled running head
 * carrying the kicker, the tag, the time and the dismiss control in iron-gall
 * ink. The stock is otherwise unchanged; Ephemerists' dress issue restyles it.
 *
 * Theme-aware through the --eph-* cascade; no document-theme mutation, no hex.
 */
export default function EphemeristsFeedFrame({
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
        marginBottom: 'var(--space-lg)',
        padding: 'var(--space-md) var(--space-md) var(--space-md) var(--space-lg)',
        background:
          'linear-gradient(170deg, var(--eph-vellum), var(--eph-vellum-deep))',
        border: '1px solid color-mix(in srgb, var(--eph-vellum-text) 30%, transparent)',
        boxShadow:
          'inset 3px 0 0 -1px color-mix(in srgb, var(--eph-gold) 70%, transparent), 0 8px 20px -16px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
      }}
    >
      {/* age-foxing stains over the vellum stock */}
      <Foxing opacity={0.35} />

      {/* rubric marginal ornament — the watching-wanderer sigil in the gutter */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 3,
          top: 9,
          zIndex: 1,
          opacity: 0.5,
          color: 'var(--eph-rubric)',
          pointerEvents: 'none',
        }}
      >
        <EphemeristsSigil size={12} color="var(--eph-rubric)" stroke={1.2} />
      </div>

      {/* chassis band — the leaf's running head, ruled off the content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          color: 'var(--eph-vellum-text)',
          borderBottom:
            '1px solid color-mix(in srgb, var(--eph-vellum-text) 22%, transparent)',
          paddingBottom: 'var(--space-xs)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        <FeedChassisBand kicker={kicker} time={time} tag={tag} archive={archive} />
      </div>

      {/* the neutral feed card, rendered in the content area */}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  )
}
