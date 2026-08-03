import { useContext } from 'react'
import { Link } from 'react-router-dom'
import i18n from '../../i18n'
import { factionFill, isKnownFaction } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import FeedBadge from './FeedBadge'
import FeedRowActions from './FeedRowActions'
import { FeedRowSkinContext, resolveFeedRowInk } from './feedRowSkin'
import type { FeedRow } from './normalizeFeedItem'

/**
 * The faction-owned activity row (#376 full adoption). One slot-driven body —
 * avatar · actor + action + badge · headline · points/level · actions — rendered
 * inside the faction's chassis (FactionFeedFrame). The faction's accent colors
 * the actor, avatar, and headline rule so the row reads in the faction's voice;
 * the chassis supplies the physical chrome. No per-event-type card.
 *
 * #1194 changed the slot bag twice. It LOST `time`: the chassis draws the
 * timestamp for every card now, so a row that also drew one printed it twice.
 * It GAINED `actions`, because the rewritten sheets put CTAs on ordinary rows
 * and not only on the three interactive companions (epic #1192 §2b).
 *
 * Two of those three accents are FILLS and one is ink, which is the whole of
 * ADR-0039 on this surface (#983). The monogram disc and the headline rule are
 * painted elements, so they ask `factionFill` and an unaffiliated actor gets the
 * spectrum. The actor's NAME is a single-ink `color:` — no stop of a seven-stop
 * ramp is legible as text (#649) — so `na` stays neutral grey there on purpose.
 *
 * #1252 changed it a third time, and this one is the chassis's rather than the
 * payload's: the slots are no longer all fed from `row`. A faction frame may now
 * publish a {@link FeedRowSkin} — a points renderer and an ink bag — and this
 * body reads it from above. Nothing here dispatches on the slug to find that
 * skin; the body stays faction-blind and paints whatever its chassis handed it.
 * See `feedRowSkin.ts` for why it is a context and not a prop.
 */
export default function FeedRowContent({
  row,
  avatarUrl,
}: {
  row: FeedRow
  avatarUrl: string | null
}) {
  // The chassis's dress, or an empty bag outside one. Every field falls back to
  // what this body painted before it existed — except the monogram glyph, whose
  // old default failed AA on twelve of fourteen faction fills (#1252).
  const skin = useContext(FeedRowSkinContext)
  // Scalar ink only — the actor's name. Never a fill: those go through
  // factionFill so `na` reaches the spectrum.
  const ink = resolveFeedRowInk(skin.ink, row.slug)
  const known = isKnownFaction(row.slug)
  const initial = row.actor?.[0]?.toUpperCase() ?? '·'

  const actorNode = row.actor ? (
    row.actorHref ? (
      <Link
        to={row.actorHref}
        className="font-body"
        style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: ink.actor, textDecoration: 'none' }}
      >
        {row.actor}
      </Link>
    ) : (
      <span className="font-body" style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: ink.actor }}>
        {row.actor}
      </span>
    )
  ) : null

  return (
    <div style={{ padding: 'var(--space-md) var(--space-lg)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
        {/* Avatar — real image if present, else a faction-tinted monogram. The
            glyph on that disc is inked with the faction's `-on-fill`, the pair
            #649 measured for text on a faction fill, NOT the global
            `--color-text-on-accent` it used to read: white is a statement about
            the app's accent buttons and fails 4.5:1 on twelve of the fourteen
            (faction × theme) disc fills, bottoming out at 1.21:1 on S.N.I.D.E.
            in dark (#1252). A chassis may still repoint it — the disc fades to
            53% of the hue over the CHASSIS ground, so its lower half is not the
            hue's question alone. */}
        {row.actor && (
          <MaybeLink href={row.actorHref}>
            {avatarUrl ? (
              <img
                src={mediaUrl(avatarUrl)}
                alt=""
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 'var(--space-xs)' }}
              />
            ) : known ? (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  ...factionFill(row.slug, 'disc'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ink.monogram,
                  fontFamily: "'Courier Prime', monospace",
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: monogram glyph sized to the 28px avatar disc
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 'var(--space-xs)',
                }}
              >
                {initial}
              </div>
            ) : (
              // Unaffiliated (na): no legible ink sits on the spectrum, so the
              // rainbow is the ring and the monogram rides a neutral interior
              // (ADR-0039 §4, the same idiom as CharacterSwitcher's miniRing).
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--faction-default-rainbow-conic)',
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: this inset *is* the drawn ring stroke, not spacing
                  padding: 2,
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  marginTop: 'var(--space-xs)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-bg-surface-alt)',
                    color: 'var(--color-text-primary)',
                    fontFamily: "'Courier Prime', monospace",
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: monogram glyph sized to the 28px avatar disc
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {initial}
                </span>
              </div>
            )}
          </MaybeLink>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {actorNode}
            <span className="font-body" style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-secondary)' }}>
              {row.action}
            </span>
            {row.badge && <FeedBadge type={row.badge.type} label={row.badge.label} />}
          </div>
        </div>
      </div>

      {row.headline && (
        <div
          style={{
            marginTop: 'var(--space-md)',
            // Aligns the headline rule with the text column: --space-3xl (40px) is
            // the 28px avatar plus the --space-md row gap.
            marginLeft: row.actor ? 'var(--space-3xl)' : 0,
            display: 'flex',
            gap: 'var(--space-md)',
          }}
        >
          {/* The headline rule is a FILLED BAR, not a border (#983). It was only
              ever a border by accident of how it was written, and `border: 3px
              solid X` is a scalar — the one place a gradient cannot go — so an
              unaffiliated row could never be anything but grey there. Drawn as an
              element it is a fill, and ADR-0039 hands it the spectrum with no
              amendment. `rule` rather than `bar`: the ramp has to run DOWN a 3px
              column. Ornament geometry — the 3px width is the drawn rule itself,
              not layout spacing. */}
          <span
            aria-hidden
            style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', ...factionFill(row.slug, 'rule') }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {row.headlineQuoted ? (
              <QuotedHeadline headline={row.headline} href={row.headlineHref} />
            ) : row.headlineHref ? (
              <Link
                to={row.headlineHref}
                className="font-body"
                style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none', display: 'block', lineHeight: 1.3 }}
              >
                {row.headline}
              </Link>
            ) : (
              <span className="font-body" style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3 }}>
                {row.headline}
              </span>
            )}
            {/* THE POINTS SLOT (#1252). The figure is the one part of the row
                two design sheets draw as an OBJECT rather than a line — WOW's
                crooked gold plaque, the Everymen's stamped circular seal — and
                a chassis had no way to reach it, nor any value to strike one
                with. A frame that publishes no `points` renderer gets the
                caption line below, unchanged; the gate is shared, so a skin
                never has to guard for an empty figure.

                That line is `.label-caption` (#1307) — a points/level figure is
                a small fact about the row, not a region name. Its inline
                tertiary is gone rather than restated: unset, `--label-ink`
                resolves to exactly that token, and pinning it here is the one
                thing that would stop a faction frame repointing the label
                ink. */}
            {(row.points || row.level != null) &&
              (skin.points ? (
                skin.points({ points: row.points, level: row.level })
              ) : (
                <span className="label-caption">
                  {row.points}
                  {row.points && row.level != null ? ' · ' : ''}
                  {row.level != null ? i18n.t('feed:row.level', { level: row.level }) : ''}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* The action slot. Indented to the text column exactly as the headline
          is, so a row with an avatar reads as one block rather than two. */}
      {row.actions.length > 0 && (
        <div style={{ marginLeft: row.actor ? 'var(--space-3xl)' : 0 }}>
          <FeedRowActions actions={row.actions} />
        </div>
      )}
    </div>
  )
}

/**
 * A quoted headline: somebody's actual words, not a title.
 *
 * Two row types use it. A taunt has nowhere to go — ADR-0031 means the catalog
 * owns the words and there is no taunt page, so `headlineHref` is null. A comment
 * mention's excerpt DOES have a home: the praxis or task the comment sits on
 * (#1196). So the quote becomes a link exactly when the row handed it one.
 *
 * It was unconditionally inert before, which was right while `foe_taunt` was the
 * only quoted row and wrong the moment a second one arrived carrying a target —
 * the href would have been silently dropped. The type, size and italic are
 * identical either way: the quote is speech, and dressing it as a bold title link
 * would undo the distinction the quoting exists to draw.
 */
function QuotedHeadline({ headline, href }: { headline: string; href: string | null }) {
  const quoted = i18n.t('feed:row.quotedHeadline', { headline })
  const style: React.CSSProperties = {
    margin: 0,
    fontSize: 'var(--text-content)',
    fontStyle: 'italic',
    color: 'var(--color-text-primary)',
    lineHeight: 1.4,
  }
  if (!href) {
    return (
      <p className="font-body" style={style}>
        {quoted}
      </p>
    )
  }
  return (
    <Link to={href} className="font-body" style={{ ...style, display: 'block', textDecoration: 'none' }}>
      {quoted}
    </Link>
  )
}

function MaybeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <>{children}</>
  return <Link to={href} style={{ flexShrink: 0 }}>{children}</Link>
}
