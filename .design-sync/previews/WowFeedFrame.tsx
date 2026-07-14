// WowFeedFrame preview — the "whimsy.exe" desktop-window chrome (pink title bar
// + notepad body). The frame is pure wrapper; the feed ROW arrives as children.
// We compose realistic Warriors-of-Whimsy rows so the window reads as a feed.
import { WowFeedFrame } from 'worldzero-frontend'

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
    <div style={{ padding: '4px 2px' }}>
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

const ACCENT = 'var(--faction-wow)'

/** A friend threw a whimsical event — chalk festival for the block. */
export function FriendCompletion() {
  return (
    <div style={wrap}>
      <WowFeedFrame>
        <FeedRow
          accent={ACCENT}
          initial="P"
          actor="Pip Marigold"
          action="pulled off a happening"
          badge="Friend"
          time="just now"
          headline="Host a sidewalk chalk festival for the block"
          meta="+30 points · Level 2"
        />
      </WowFeedFrame>
    </div>
  )
}

/** A friend signed up for a task — the global/community register. */
export function FriendSignup() {
  return (
    <div style={wrap}>
      <WowFeedFrame>
        <FeedRow
          accent={ACCENT}
          initial="A"
          actor="Ada Reed"
          action="signed up for a task"
          badge="Global"
          badgeBg="var(--badge-global)"
          time="3 hours ago"
          headline="Organize a neighborhood tool library"
          meta="45 points · Level 3"
        />
      </WowFeedFrame>
    </div>
  )
}
