// FactionFeedFrame preview — the DISPATCHER (surface #12). Given a slug it picks
// that faction's bespoke feed chrome (UA salon, SNIDE ransom slip, Singularity
// terminal, …); a null slug is a true passthrough. Same feed ROW children, three
// different faction skins, plus the neutral fallback — showing the dispatch.
import { FactionFeedFrame } from 'worldzero-frontend'

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
    <div style={{ padding: '10px 6px' }}>
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

/** slug="ua" → routes to the UA gilt-salon frame. */
export function UaBranch() {
  return (
    <div style={wrap}>
      <FactionFeedFrame slug="ua">
        <FeedRow
          accent="var(--faction-ua)"
          initial="A"
          actor="Ada Reed"
          action="submitted a study"
          badge="Friend"
          time="2 hours ago"
          headline="Render the old library facade in charcoal"
          meta="+30 points · Level 2"
        />
      </FactionFeedFrame>
    </div>
  )
}

/** slug="snide" → routes to the SNIDE ransom-slip frame. */
export function SnideBranch() {
  return (
    <div style={wrap}>
      <FactionFeedFrame slug="snide">
        <FeedRow
          accent="var(--faction-snide)"
          initial="R"
          actor="Rax Vandal"
          action="left evidence"
          badge="Friend"
          time="4 hours ago"
          headline="Wheatpaste an original poem on a condemned wall"
          meta="+30 points · Level 2"
        />
      </FactionFeedFrame>
    </div>
  )
}

/** slug="singularity" → routes to the always-dark terminal frame. */
export function SingularityBranch() {
  return (
    <div style={wrap}>
      <FactionFeedFrame slug="singularity">
        <FeedRow
          dark
          accent="var(--faction-singularity)"
          initial="N"
          actor="node_44"
          action="committed a dataset"
          badge="Friend"
          time="06:12 UTC"
          headline="Log one week of your resting heart rate"
          meta="+30 points · Level 2"
        />
      </FactionFeedFrame>
    </div>
  )
}

/** slug={null} → true passthrough (no faction chrome). The row supplies its own
 *  neutral card so the fallback reads as intentional, not broken. */
export function NeutralPassthrough() {
  return (
    <div style={wrap}>
      <FactionFeedFrame slug={null}>
        <div
          className="sidebar-card"
          style={{ padding: 4, border: '1px solid var(--color-border)', borderRadius: 8 }}
        >
          <FeedRow
            accent="var(--color-text-secondary)"
            initial="·"
            actor="A new era"
            action="has begun"
            badge="Global"
            badgeBg="var(--badge-global)"
            time="Era One"
            headline="The first era has begun"
          />
        </div>
      </FactionFeedFrame>
    </div>
  )
}
