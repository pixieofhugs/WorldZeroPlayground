import { Link } from 'react-router-dom'
import i18n from '../../i18n'
import { factionColor, isKnownFaction } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import FeedBadge from './FeedBadge'
import type { FeedRow } from './normalizeFeedItem'

/**
 * The faction-owned activity row (#376 full adoption). One slot-driven body —
 * avatar · actor + action + badge · time · headline · points/level — rendered
 * inside the faction's frame (FactionFeedFrame). The faction's accent colors the
 * actor, avatar, and headline rule so the row reads in the faction's voice; the
 * frame supplies the physical chrome. No per-event-type card.
 */
export default function FeedRowContent({
  row,
  avatarUrl,
}: {
  row: FeedRow
  avatarUrl: string | null
}) {
  const accent = factionColor(row.slug)
  const known = isKnownFaction(row.slug)
  const initial = row.actor?.[0]?.toUpperCase() ?? '·'

  const actorNode = row.actor ? (
    row.actorHref ? (
      <Link
        to={row.actorHref}
        className="font-body"
        style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: accent, textDecoration: 'none' }}
      >
        {row.actor}
      </Link>
    ) : (
      <span className="font-body" style={{ fontSize: 'var(--text-content)', fontWeight: 700, color: accent }}>
        {row.actor}
      </span>
    )
  ) : null

  return (
    <div style={{ padding: 'var(--space-md) var(--space-lg)', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
        {/* Avatar — real image if present, else a faction-tinted monogram. */}
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
                  background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-on-accent)',
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
                  background: 'var(--faction-default-ring)',
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
          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', display: 'block', marginTop: 'var(--space-xs)' }}>
            {row.time}
          </span>
        </div>
      </div>

      {row.headline && (
        <div
          style={{
            marginTop: 'var(--space-md)',
            // Aligns the headline rule with the text column: --space-3xl (40px) is
            // the 28px avatar plus the --space-md row gap.
            marginLeft: row.actor ? 'var(--space-3xl)' : 0,
            borderLeft: `3px solid ${accent}`,
            paddingLeft: 'var(--space-md)',
          }}
        >
          {row.headlineQuoted ? (
            <p
              className="font-body"
              style={{ margin: 0, fontSize: 'var(--text-content)', fontStyle: 'italic', color: 'var(--color-text-primary)', lineHeight: 1.4 }}
            >
              {i18n.t('feed:row.quotedHeadline', { headline: row.headline })}
            </p>
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
          {(row.points || row.level != null) && (
            <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
              {row.points}
              {row.points && row.level != null ? ' · ' : ''}
              {row.level != null ? i18n.t('feed:row.level', { level: row.level }) : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function MaybeLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <>{children}</>
  return <Link to={href} style={{ flexShrink: 0 }}>{children}</Link>
}
