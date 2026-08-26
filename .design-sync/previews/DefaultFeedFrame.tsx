// DefaultFeedFrame preview cells — the Unaffiliated activity-feed chassis, and
// the default every unclaimed slug takes. `default ≡ na ≡ Unaffiliated` is ONE
// identity (ADR-0039 / 0046 / 0048): this is not a placeholder standing in for a
// design, it IS the Unaffiliated skin, and it is what every player sees until
// their faction's dress issue lands.
//
// A kicker band across the top — kind label, optional status tag, relative time,
// then the dismiss control — over a faction-tinted body. The tint is the generic
// `card-bg` fill plus the left-edge rule the event cards used to hand-roll, so a
// faction with a bespoke frame never double-skins.
//
// THE LEFT EDGE IS A FILLED ELEMENT, NOT A BORDER (#1148): `border: Npx solid`
// is a scalar, the one place a gradient cannot go, and for na the only thing it
// could hold was the card's accent INK. A 4px stretched edge is geometrically a
// fill, so ADR-0039 hands it the spectrum with no amendment.
//
// A null / unaffiliated slug gets the SAME chassis, not a passthrough — before
// #1194 a null slug passed straight through, which would now mean a card with no
// kicker, no time and no way to be dismissed.
import { DefaultFeedFrame, FeedArchiveButton } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)', padding: 24, maxWidth: 400 }

/** One feed row body, in the shape the real FeedRowContent slot fills:
 *  monogram · actor + action + badge · time, then the accented headline. */
function Row({
  initial,
  actor,
  action,
  badge,
  time,
  headline,
  meta,
}: {
  initial: string
  actor: string
  action: string
  badge?: string
  time: string
  headline?: string
  meta?: string
}) {
  return (
    <div style={{ padding: '10px 4px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--faction-default-rainbow-conic)',
            color: 'var(--color-text-on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {actor}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{action}</span>
            {badge && (
              <span
                style={{
                  background: 'var(--badge-friend)',
                  color: 'var(--color-text-on-accent)',
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
              fontSize: 8,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)',
              display: 'block',
              marginTop: 3,
            }}
          >
            {time}
          </span>
        </div>
      </div>
      {headline && (
        <div
          style={{
            marginTop: 10,
            marginLeft: 38,
            borderLeft: '3px solid var(--color-border-strong)',
            paddingLeft: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              display: 'block',
              lineHeight: 1.35,
            }}
          >
            {headline}
          </span>
          {meta && (
            <span
              style={{
                fontSize: 8,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-text-tertiary)',
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

/** An unaffiliated slug — the spectrum edge and the neutral sheet. */
export function Unaffiliated() {
  return (
    <div style={wrap}>
      <DefaultFeedFrame
        slug="na"
        kicker="Praxis"
        time="2h ago"
        tag={null}
        archive={<FeedArchiveButton onAct={noop} />}
      >
        <Row
          initial="S"
          actor="Sam Okafor"
          action="submitted a study"
          badge="Friend"
          time="2 hours ago"
          headline="Cleared the towpath between the two locks"
          meta="+30 points · Level 2"
        />
      </DefaultFeedFrame>
    </div>
  )
}

/** A null slug resolves to the same chassis rather than passing through — the
 *  card still gets its kicker, its time and its way to be dismissed. */
export function NullSlug() {
  return (
    <div style={wrap}>
      <DefaultFeedFrame
        slug={null}
        kicker="Vote"
        time="5h ago"
        tag={null}
        archive={<FeedArchiveButton onAct={noop} />}
      >
        <Row
          initial="N"
          actor="newcomer"
          action="admired your submission"
          time="yesterday"
          headline="Towpath, second lock"
          meta="+12 points earned"
        />
      </DefaultFeedFrame>
    </div>
  )
}

/** The status tag slot filled — the band carries kind, tag, time and dismiss. */
export function WithStatusTag() {
  return (
    <div style={wrap}>
      <DefaultFeedFrame
        slug="na"
        kicker="Duel"
        time="just now"
        tag="Awaiting seal"
        archive={<FeedArchiveButton onAct={noop} />}
      >
        <Row
          initial="R"
          actor="Rax Vandal"
          action="challenged you"
          time="just now"
          headline="Two entries, one task, seven days"
          meta="Stakes: 30 points"
        />
      </DefaultFeedFrame>
    </div>
  )
}
