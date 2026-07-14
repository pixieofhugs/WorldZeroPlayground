// SingularityFeedFrame preview — the always-dark "terminal dispatch/printout"
// chrome (black slab, signal-blue inset, scanlines, `>` boot strip). Pure
// wrapper; the feed ROW arrives as children. Rows use light text (dark=true)
// so they read on the terminal-black body, like the real printout.
import { SingularityFeedFrame } from 'worldzero-frontend'

const wrap: React.CSSProperties = { padding: 24, maxWidth: 400 }

function FeedRow({
  accent,
  initial,
  actor,
  action,
  badge,
  badgeBg,
  time,
  headline,
  meta,
  dark,
}: {
  accent: string
  initial: string
  actor: string
  action: string
  badge?: string
  badgeBg?: string
  time: string
  headline?: string
  meta?: string
  dark?: boolean
}) {
  const primary = dark ? 'rgba(255,255,255,0.92)' : 'var(--color-text-primary)'
  const secondary = dark ? 'rgba(255,255,255,0.62)' : 'var(--color-text-secondary)'
  const tertiary = dark ? 'rgba(255,255,255,0.45)' : 'var(--color-text-tertiary)'
  return (
    <div style={{ padding: '10px 4px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 55%, transparent))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-on-accent)',
            fontFamily: "'Courier Prime', monospace",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{actor}</span>
            <span style={{ fontSize: 11, color: secondary }}>{action}</span>
            {badge && (
              <span
                style={{
                  background: badgeBg ?? 'var(--badge-friend)',
                  color: 'var(--color-text-on-accent)',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  padding: '2px 8px',
                  borderRadius: 3,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <span
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 8,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: tertiary,
              display: 'block',
              marginTop: 3,
            }}
          >
            {time}
          </span>
        </div>
      </div>
      {headline && (
        <div style={{ marginTop: 10, marginLeft: 38, borderLeft: `3px solid ${accent}`, paddingLeft: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: primary, display: 'block', lineHeight: 1.35 }}>
            {headline}
          </span>
          {meta && (
            <span
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 8,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: tertiary,
                display: 'block',
                marginTop: 4,
              }}
            >
              {meta}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

const ACCENT = 'var(--faction-singularity)'

/** A node logging quantified-self data — a week of resting heart rate. */
export function FriendCompletion() {
  return (
    <div style={wrap}>
      <SingularityFeedFrame>
        <FeedRow
          dark
          accent={ACCENT}
          initial="N"
          actor="node_44"
          action="committed a dataset"
          badge="Friend"
          time="06:12 UTC"
          headline="Log one week of your resting heart rate"
          meta="+30 points · Level 2"
        />
      </SingularityFeedFrame>
    </div>
  )
}

/** A vote logged against your own submission — points earned. */
export function VoteOnMine() {
  return (
    <div style={wrap}>
      <SingularityFeedFrame>
        <FeedRow
          dark
          accent={ACCENT}
          initial="N"
          actor="node_09"
          action="validated your dataset"
          badge="Your stuff"
          badgeBg="var(--badge-your-stuff)"
          time="14:40 UTC"
          headline="Mean 58, variance tightening after day four"
          meta="+11 points earned"
        />
      </SingularityFeedFrame>
    </div>
  )
}
