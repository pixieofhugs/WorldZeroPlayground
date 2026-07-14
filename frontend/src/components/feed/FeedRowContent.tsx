import { Link } from 'react-router-dom'
import i18n from '../../i18n'
import { factionColor } from '../../utils/factions'
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
  const initial = row.actor?.[0]?.toUpperCase() ?? '·'

  const actorNode = row.actor ? (
    row.actorHref ? (
      <Link
        to={row.actorHref}
        className="font-body"
        style={{ fontSize: 11, fontWeight: 700, color: accent, textDecoration: 'none' }}
      >
        {row.actor}
      </Link>
    ) : (
      <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: accent }}>
        {row.actor}
      </span>
    )
  ) : null

  return (
    <div style={{ padding: '12px 16px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Avatar — real image if present, else a faction-tinted monogram. */}
        {row.actor && (
          <MaybeLink href={row.actorHref}>
            {avatarUrl ? (
              <img
                src={mediaUrl(avatarUrl)}
                alt=""
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }}
              />
            ) : (
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
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {initial}
              </div>
            )}
          </MaybeLink>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {actorNode}
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {row.action}
            </span>
            {row.badge && <FeedBadge type={row.badge.type} label={row.badge.label} />}
          </div>
          <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)', display: 'block', marginTop: 2 }}>
            {row.time}
          </span>
        </div>
      </div>

      {row.headline && (
        <div
          style={{
            marginTop: 10,
            marginLeft: row.actor ? 38 : 0,
            borderLeft: `3px solid ${accent}`,
            paddingLeft: 10,
          }}
        >
          {row.headlineQuoted ? (
            <p
              className="font-body"
              style={{ margin: 0, fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-primary)', lineHeight: 1.4 }}
            >
              {i18n.t('feed:row.quotedHeadline', { headline: row.headline })}
            </p>
          ) : row.headlineHref ? (
            <Link
              to={row.headlineHref}
              className="font-body"
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none', display: 'block', lineHeight: 1.3 }}
            >
              {row.headline}
            </Link>
          ) : (
            <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', lineHeight: 1.3 }}>
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
