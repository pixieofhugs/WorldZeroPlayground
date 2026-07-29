/**
 * Per-faction feed-card CHASSIS dispatch (surface #12, SPEC-faction-ui-profile.md).
 *
 * The activity feed itself is neutral; each *card* is drawn on its faction's own
 * chassis. This is the single seam where a faction's bespoke feed skin plugs in:
 * claim `feedFrame` in the faction's manifest and every card whose
 * `context_faction_slug` is that faction adopts the skin with no other change.
 *
 * #1194 WIDENED THE SEAM. A frame used to own only `{ children }`, so it could
 * not draw the kicker band, the timestamp or the dismiss control — all three of
 * which every design sheet puts on the chassis. The contract is now
 * {@link FeedFrameProps}; read its docblock before writing a faction skin.
 * Nothing may be written against the old `{ children }` shape.
 */
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { factionCssVar } from '../../utils/factions'
import FeedChassisBand from './FeedChassisBand'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * The Unaffiliated chassis — and the default every unclaimed slug takes.
 *
 * `default ≡ na ≡ Unaffiliated` is ONE identity (ADR-0039 / 0046 / 0048), so
 * this is not a placeholder standing in for a design: it IS the Unaffiliated
 * skin, built to `Unaffiliated Comment + Update Cards`, and it is what every
 * player sees until their faction's dress issue lands.
 *
 * A kicker band across the top — neutral kind label, optional status tag, the
 * relative time, then the dismiss control — over a faction-tinted body. The tint
 * is the generic `card-bg` fill + accent rule that the event cards used to
 * hand-roll, so a faction with a bespoke frame never double-skins.
 *
 * A null / unaffiliated slug resolves to the `default` token family and gets the
 * SAME chassis, not a passthrough. Before #1194 a null slug passed straight
 * through, because the only card that carried one was `era_announcement`, which
 * brings its own chrome. That card no longer routes through here at all — it
 * keeps its neutral chrome deliberately (epic decision 6) — so a passthrough now
 * would mean a card with no kicker, no time and no way to be dismissed.
 */
function DefaultFeedFrame({ slug, kicker, time, tag, archive, children }: FeedFrameProps & { slug?: string | null }) {
  return (
    <div
      className="sidebar-card"
      style={{
        padding: 0,
        background: factionCssVar(slug, 'card-bg'),
        borderLeft: `4px solid ${factionCssVar(slug, 'card-accent')}`,
      }}
    >
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

interface Props extends FeedFrameProps {
  slug: string | null | undefined
}

export default function FactionFeedFrame({ slug, ...frame }: Props) {
  const Frame = pickVariant(surfaceMap('feedFrame'), slug, DefaultFeedFrame)
  // Only the default chassis needs the slug (to tint); bespoke skins are
  // slug-blind — they ARE the faction, so there is nothing to dispatch on.
  if (Frame === DefaultFeedFrame) return <DefaultFeedFrame slug={slug} {...frame} />
  return <Frame {...frame} />
}

export { DefaultFeedFrame }
