import { useContext } from 'react'
import { Link } from 'react-router-dom'
import i18n from '../../i18n'
import { factionFill, isKnownFaction } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import FeedBadge from './FeedBadge'
import FeedRowActions from './FeedRowActions'
import { FEED_BODY_LIFTED, FeedBodyOverlay } from './feedBodyTarget'
import { FeedRowSkinContext, resolveFeedRowInk } from './feedRowSkin'
import type { FeedRow } from './normalizeFeedItem'

/**
 * The faction-owned activity row (#376): one slot-driven body inside the
 * faction's chassis. No `time` slot (the chassis draws it); `actions` carries
 * CTAs on ordinary rows (epic #1192 §2b).
 *
 * ADR-0039 here (#983): the monogram disc and headline rule are FILLS
 * (`factionFill`, so `na` gets the spectrum); the actor's name is single ink
 * (no ramp stop is legible as text, #649), so `na` stays grey there.
 *
 * A frame may publish a {@link FeedRowSkin} (#1252) via context; this body
 * stays faction-blind. See `feedRowSkin.ts`.
 */
export default function FeedRowContent({
  row,
  avatarUrl,
}: {
  row: FeedRow
  avatarUrl: string | null
}) {
  // Empty bag outside a skinned chassis. The monogram default changed in #1252
  // (the old one failed AA on most fills).
  const skin = useContext(FeedRowSkinContext)
  // Scalar ink only, never a fill.
  const ink = resolveFeedRowInk(skin.ink, row.slug)
  const known = isKnownFaction(row.slug)
  const initial = row.actor?.[0]?.toUpperCase() ?? '·'

  // Which anchor owns the body (#1893): headline, else actor (taunt/defection
  // rows have no headline target but name an actor), else plain. Gated on
  // `row.headline` too: an href with no headline draws no anchor.
  const stretch: 'headline' | 'actor' | null = row.headline && row.headlineHref
    ? 'headline'
    : row.actorHref
      ? 'actor'
      : null
  // The overlay-carrying anchor must NOT be positioned, or the overlay shrinks
  // to its box. Everything else lifts.
  const liftUnless = (which: 'headline' | 'actor') =>
    stretch === which ? null : FEED_BODY_LIFTED

  const actorNode = row.actor ? (
    row.actorHref ? (
      <Link
        to={row.actorHref}
        className="font-body"
        style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: ink.actor, textDecoration: 'none', ...liftUnless('actor') }}
      >
        {row.actor}
        {stretch === 'actor' && <FeedBodyOverlay />}
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
        {/* Monogram glyph uses the faction `-on-fill` ink (#649 pair); white
            failed 4.5:1 on 12 of 14 disc fills (#1252). A chassis may repoint it.
            `.user-media` (#1942) marks the player's photo so Albescent can hold
            its drift off it; it goes on both anchor (a stacking context, see
            `MaybeLink`) and `<img>` (actorless case). Site furniture keeps the
            wash (#1646). */}
        {row.actor && (
          <MaybeLink href={row.actorHref} className={avatarUrl ? 'user-media' : undefined}>
            {avatarUrl ? (
              <img
                className="user-media"
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
                  fontFamily: "var(--font-body)",
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
              // Unaffiliated: rainbow ring around a neutral interior (ADR-0039 §4).
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
                    fontFamily: "var(--font-body)",
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
            // --space-3xl (40px) = 28px avatar + --space-md gap.
            marginLeft: row.actor ? 'var(--space-3xl)' : 0,
            display: 'flex',
            gap: 'var(--space-md)',
          }}
        >
          {/* A filled bar, not a border (#983): a border is scalar, so it
              couldn't carry the `na` spectrum. 3px is the rule itself. */}
          <span
            aria-hidden
            style={{ width: 3, flexShrink: 0, alignSelf: 'stretch', ...factionFill(row.slug, 'rule') }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {row.headlineQuoted ? (
              <QuotedHeadline
                headline={row.headline}
                href={row.headlineHref}
                stretched={stretch === 'headline'}
              />
            ) : row.headlineHref ? (
              <Link
                to={row.headlineHref}
                className="font-body"
                style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none', display: 'block', lineHeight: 1.3, ...liftUnless('headline') }}
              >
                {row.headline}
                {stretch === 'headline' && <FeedBodyOverlay />}
              </Link>
            ) : (
              <span className="font-body" style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3 }}>
                {row.headline}
              </span>
            )}
            {/* Points slot (#1252): a skin may render it as an object (WOW
                plaque, Everymen seal); otherwise `.label-caption` (#1307). No
                inline colour, so a frame can repoint `--label-ink`. */}
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

      {row.actions.length > 0 && (
        // Lifted as a block (#1893) so controls beat the body overlay.
        <div style={{ marginLeft: row.actor ? 'var(--space-3xl)' : 0, ...FEED_BODY_LIFTED }}>
          <FeedRowActions actions={row.actions} />
        </div>
      )}
    </div>
  )
}

/**
 * A quoted headline: somebody's words, not a title. Links only when the row
 * provides a target (comment excerpts do, #1196; taunts don't, ADR-0031).
 * Styled as speech either way.
 */
function QuotedHeadline({
  headline,
  href,
  stretched,
}: {
  headline: string
  href: string | null
  /** True when this quote is the anchor that owns the whole body (#1893). */
  stretched: boolean
}) {
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
    <Link
      to={href}
      className="font-body"
      style={{ ...style, display: 'block', textDecoration: 'none', ...(stretched ? null : FEED_BODY_LIFTED) }}
    >
      {quoted}
      {stretched && <FeedBodyOverlay />}
    </Link>
  )
}

/**
 * The avatar's link, always lifted (#1893). The lift is the
 * `.feed-avatar-link` class, not inline {@link FEED_BODY_LIFTED} (#1942): a
 * z-index makes a stacking context capping children at 1, level with
 * `.alb-feed-aurora`; only a class can be overridden, and
 * `.alb-feed .user-media` raises it to 3 there.
 */
function MaybeLink({ href, className, children }: { href: string | null; className?: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>
  return (
    <Link to={href} className={className ? `feed-avatar-link ${className}` : 'feed-avatar-link'}>
      {children}
    </Link>
  )
}
