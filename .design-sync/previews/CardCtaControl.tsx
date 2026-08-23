// CardCtaControl preview cells. The one place all nine task-card skins route
// their sign-up affordance through (#2359), so a dead-ended control can never
// come back: the element it renders IS the contract.
//
//   href present  → a <Link> (the slot GOES somewhere — "Work on this?" lands
//                   on the draft rather than posting a claim)
//   onPress present → a real <button> that signs up
//   denied        → the same slot in the same place, saying WHY, with
//                   aria-disabled and no handler attached at all
//
// It ships unstyled on purpose — the skin owns every pixel and passes style +
// children. These cells port UaTaskCard's own call site (the vellum leaf's
// chip: gilt ground, sienna frame, Cinzel display face) so the control is shown
// dressed the way a real card dresses it, not as a bare browser button.
import { CardCtaControl } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  padding: 24,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 20,
  alignItems: 'center',
}

/** UaTaskCard's own chip treatment, lifted from its call site verbatim. */
const CHIP: React.CSSProperties = {
  fontFamily: 'var(--faction-ua-card-font)',
  fontWeight: 600,
  fontSize: 'var(--text-content)',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  padding: 'var(--space-sm) var(--space-xl)',
  borderRadius: 5,
  color: 'var(--faction-ua-card-chip-ink)',
  background: 'var(--faction-ua-card-chip-bg)',
  border: '1.5px solid var(--faction-ua-card-frame)',
}

/** The claimable slot: a handler is attached, so this is a real button. */
export function Claimable() {
  return (
    <div style={wrap}>
      <CardCtaControl
        cta={{ label: 'Take up this practice', denied: false, onPress: noop }}
        style={{ ...CHIP, cursor: 'pointer' }}
      >
        Take up this practice
      </CardCtaControl>
    </div>
  )
}

/** Denied: the server has shut sign-up. Same slot, same place — it says why,
 *  carries aria-disabled, and has no handler to attach. */
export function Denied() {
  return (
    <div style={wrap}>
      <CardCtaControl
        cta={{ label: 'Sign-up has closed', denied: true }}
        style={{ ...CHIP, cursor: 'not-allowed', opacity: 0.72 }}
      >
        Sign-up has closed
      </CardCtaControl>
    </div>
  )
}

/** A door, not a claim (#2359): `href` makes it a <Link>, so the dead label
 *  becomes navigation onto the existing draft. */
export function DoorToDraft() {
  return (
    <div style={wrap}>
      <CardCtaControl
        cta={{ label: 'Work on this?', denied: false, href: '/praxis/9021/edit' }}
        style={{ ...CHIP, cursor: 'pointer' }}
      >
        Work on this?
      </CardCtaControl>
    </div>
  )
}
