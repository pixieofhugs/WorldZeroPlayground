import { factionFill, factionSheet } from '../../utils/factions'
import FeedChassisBand from './FeedChassisBand'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * The Unaffiliated chassis — and the default every unclaimed slug takes
 * (`default ≡ na ≡ Unaffiliated`, ADR-0039 / 0046 / 0048). A kicker band over a
 * faction-tinted body. A null slug gets the SAME chassis, not a passthrough: a
 * passthrough would be a card with no kicker, time or dismiss.
 */
export default function DefaultFeedFrame({ slug, kicker, time, tag, archive, children }: FeedFrameProps & { slug?: string | null }) {
  return (
    <div
      className="sidebar-card"
      style={{
        padding: 0,
        position: 'relative',
        ...factionSheet(slug),
      }}
    >
      {/* THE LEFT EDGE IS A FILLED ELEMENT, NOT A BORDER (#1148): a border can't
          hold a gradient, so it could only take the `card-accent` INK. A filled 4px
          column takes `factionFill(slug, 'rule')` (the spectrum for `na`, ADR-0039).
          4px, not 3px, is the owner's call (2026-07-29).

          Clipped on its own inert layer, not the card: `overflow: hidden` on the
          card would clip the companions' `position: fixed` modals (`.sidebar-card`'s
          `backdrop-filter` makes it their containing block). `inset: -1` puts the
          layer on the border box, so the rule runs past the band's hairline. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -1,
          zIndex: 0,
          overflow: 'hidden',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, ...factionFill(slug, 'rule') }}
        />
      </span>
      <div
        style={{
          padding: 'var(--space-xs) var(--space-md) var(--space-xs) var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <FeedChassisBand kicker={kicker} time={time} tag={tag} archive={archive} />
      </div>
      {children}
    </div>
  )
}
