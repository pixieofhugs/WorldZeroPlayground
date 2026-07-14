// FeedBadge preview — the small monospace chip that tags a feed row's origin
// (FRIEND, YOUR STUFF, GLOBAL, DUEL, COLLAB, ADMIN). It's a leaf: one `type`
// key selects the color, `label` overrides the text. We compose the full set
// per cell with labels so each variant reads.
import { FeedBadge } from 'worldzero-frontend'

const row: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: 20,
}

const stack: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  padding: '4px 20px',
}

const caption: React.CSSProperties = {
  fontFamily: "'Courier Prime', monospace",
  fontSize: 10,
  color: 'var(--color-text-tertiary)',
  width: 90,
}

/** Every badge type in a single row, default (underscore-stripped) labels. */
export function AllTypes() {
  return (
    <div style={row}>
      <FeedBadge type="friend" />
      <FeedBadge type="your_stuff" />
      <FeedBadge type="global" />
      <FeedBadge type="duel" />
      <FeedBadge type="collab" />
      <FeedBadge type="admin" />
    </div>
  )
}

/** The labels the live feed actually passes — human-cased overrides per type. */
export function LabeledVariants() {
  return (
    <div style={{ padding: 12 }}>
      <div style={stack}>
        <span style={caption}>friend</span>
        <FeedBadge type="friend" label="Friend" />
      </div>
      <div style={stack}>
        <span style={caption}>your_stuff</span>
        <FeedBadge type="your_stuff" label="Your stuff" />
      </div>
      <div style={stack}>
        <span style={caption}>duel</span>
        <FeedBadge type="duel" label="Duel" />
      </div>
      <div style={stack}>
        <span style={caption}>collab</span>
        <FeedBadge type="collab" label="Collab" />
      </div>
      <div style={stack}>
        <span style={caption}>admin</span>
        <FeedBadge type="admin" label="System" />
      </div>
    </div>
  )
}

/** Unknown type falls back to the neutral GLOBAL style — the resilience path. */
export function UnknownFallback() {
  return (
    <div style={row}>
      <FeedBadge type="mystery_event" />
    </div>
  )
}
