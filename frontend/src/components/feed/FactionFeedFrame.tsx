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
 *
 * THERE IS NO `DefaultFeedFrame.tsx`, AND THAT IS NOT A GAP. `DefaultFeedFrame`
 * is defined below rather than registered as a skin, so a listing of the feed
 * frames shows only the factions that override it. It stays here on purpose: the
 * dispatcher special-cases it by IDENTITY (`Frame === DefaultFeedFrame`) to hand
 * it the slug the faction frames do not take, and that check is only readable
 * next to the thing it compares against.
 */
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { factionFill, factionSheet } from '../../utils/factions'
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
 * is the generic `card-bg` fill + the left-edge rule that the event cards used to
 * hand-roll, so a faction with a bespoke frame never double-skins. That rule is a
 * FILLED element rather than a border (#1148) — see the comment at its site.
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
        position: 'relative',
        ...factionSheet(slug),
      }}
    >
      {/* THE LEFT EDGE IS A FILLED ELEMENT, NOT A BORDER (#1148) — the same
          correction #983 made to the row's headline rule one level down. It was
          `borderLeft: 4px solid factionCssVar(slug, 'card-accent')`, and both
          halves of that were wrong for `na`: `border: Npx solid X` is a scalar,
          the one place a gradient cannot go, so the edge could only ever hold
          `card-accent` — the na card's accent INK, near-black #1a1209 in light and
          near-white #f0e6d0 in dark. Correct for the text it dresses elsewhere
          (~12 surfaces read it as `color:`, and a contrast test measures it), and
          the ink doing an ornament's job here. A 4px stretched edge is
          geometrically a fill, so ADR-0039 hands it the spectrum with no
          amendment. A themed faction takes its own solid spine hue here rather
          than its `card-accent` ink, which is the substitution `factionFill`
          makes at every other border-to-fill conversion — and is unreachable
          through dispatch anyway, since all eight registered frames claim
          `feedFrame` and never see this chassis. `rule`, not `bar`: the ramp
          runs DOWN a 4px column, and the 90deg cut spends seven stops across those
          4px, i.e. mud. Ornament geometry — the 4px IS the drawn rule, not layout
          spacing, and 4px was kept over the row rule's 3px deliberately (owner,
          2026-07-29): this one runs the whole height of a card, not one headline.

          IT IS CLIPPED ON ITS OWN LAYER, not on the card. A square-cornered column
          at the left edge overhangs `.sidebar-card`'s `--radius-xl` corner, so it
          needs the card's curve — but `overflow: hidden` on the wrapper would also
          clip the two companion bodies, whose drop-to-accept modals are
          `position: fixed` inside a card that already contains them (`.sidebar-card`
          sets `backdrop-filter`, which makes it their containing block). So the
          clip lives on an inert ornament layer, the shape `CovenFeedFrame`'s
          SparkField already uses. `inset: -1` puts that layer on the card's BORDER
          box, so the 4px reads from the outer edge exactly as the border it
          replaces did — and, being a layer above the band, the rule runs unbroken
          past the band's hairline instead of starting below it. */}
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
