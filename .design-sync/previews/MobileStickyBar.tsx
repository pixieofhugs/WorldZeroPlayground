// MobileStickyBar preview cells. The Field Kit (#495) gives every mobile page a
// bottom sticky action bar; #1929 made faction detail one responsive component
// per faction and this is the bar they all share.
//
// It is a real `position: sticky` bar, not a bare positioner: it pins just above
// the fixed MobileTabBar (bottom: var(--tab-bar-clearance)), bleeds to the full
// page width by cancelling the page gutter with negative margins, and carries
// the nav ground — blurred backdrop and a hairline top border — so content
// scrolling under it stays legible.
//
// Because `sticky` resolves against the nearest SCROLLING ancestor, these cells
// give it one: a phone-width column tall enough to scroll, with the bar as its
// last child. That is the only mount where its behaviour is true — a bar
// dropped into a static cell is just a styled div.
import { MobileStickyBar } from 'worldzero-frontend'
import { noop } from './_fixtures'

const PHONE: React.CSSProperties = {
  width: 390,
  height: 460,
  overflowY: 'auto',
  padding: 'var(--space-lg)',
  background: 'var(--color-bg-page)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
}

const FILLER = (
  <p style={{ lineHeight: 1.7, fontSize: 'var(--text-content)', margin: 0 }}>
    The Ephemerists keep the Valley’s tables. Every mark you leave is checked
    against the almanac before it is entered, and the almanac is checked against
    the sky. Scroll — the bar below stays put.
  </p>
)

const Primary = ({ children }: { children: React.ReactNode }) => (
  <button
    type="button"
    onClick={noop}
    style={{
      width: '100%',
      padding: 'var(--space-md) var(--space-lg)',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--text-content)',
      fontWeight: 600,
      background: 'var(--color-accent-primary)',
      color: 'var(--color-text-on-accent)',
    }}
  >
    {children}
  </button>
)

/** One primary action — the common case on a faction detail page. */
export function SingleAction() {
  return (
    <div style={{ padding: 24 }}>
      <div style={PHONE}>
        {FILLER}
        {FILLER}
        <MobileStickyBar>
          <Primary>Join the Ephemerists</Primary>
        </MobileStickyBar>
      </div>
    </div>
  )
}

/** Two stacked children — the bar is a flex column with its own gap, so a
 *  secondary line sits under the primary rather than beside it. */
export function ActionWithCaption() {
  return (
    <div style={{ padding: 24 }}>
      <div style={PHONE}>
        {FILLER}
        {FILLER}
        <MobileStickyBar>
          <Primary>Join the Ephemerists</Primary>
          <span
            style={{
              fontSize: 'var(--text-xl)',
              opacity: 0.75,
              textAlign: 'center',
            }}
          >
            You can leave a faction once per era.
          </span>
        </MobileStickyBar>
      </div>
    </div>
  )
}

/** A caller-supplied `style` merges over the bar's own ground — here a faction
 *  plate replaces the neutral nav fill, which is how a skinned page dresses it. */
export function FactionGround() {
  return (
    <div style={{ padding: 24 }}>
      <div style={PHONE}>
        {FILLER}
        {FILLER}
        <MobileStickyBar
          style={{
            background: 'var(--faction-coven-card-bg)',
            borderTop: '1px solid var(--faction-coven-card-border)',
          }}
        >
          <Primary>Join the Cozy Coven</Primary>
        </MobileStickyBar>
      </div>
    </div>
  )
}
