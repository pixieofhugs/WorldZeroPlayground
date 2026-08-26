// SettingsSwitch preview cells — the Settings page's two-state switch (#2154).
// Presentational: no state, no context. The lit track carries the spectrum on
// its EDGE via two background layers (a border cannot hold a gradient,
// ADR-0039), so the on/off sweep is the axis that actually changes what it
// draws. Disabled is a RULED exception to the house "hide what can't be used"
// rule: when the OS asks for reduced motion the Animations switch renders off,
// unmovable, and says why — in the visible note and in the accessible name.
import { SettingsSwitch } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)',
  padding: 28,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 32,
  alignItems: 'flex-start',
}
const chip: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 10,
  fontSize: 12,
  color: 'var(--color-text-secondary, #6b7280)',
  maxWidth: 220,
}

/** Label a switch with the state that produced it. */
function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={chip}>
      {children}
      <span>{label}</span>
    </span>
  )
}

/** The two states side by side — lit track (spectrum edge, thumb right) against
 *  the flat off edge. This is the whole visual contract of the control. */
export function OnAndOff() {
  return (
    <div style={wrap}>
      <Chip label="on — spectrum edge">
        <SettingsSwitch checked label="Animations" onToggle={noop} />
      </Chip>
      <Chip label="off — flat edge">
        <SettingsSwitch checked={false} label="Animations" onToggle={noop} />
      </Chip>
    </div>
  )
}

/** The ruled exception: the OS asked for reduced motion, so the switch renders
 *  off and unmovable rather than vanishing. `aria-disabled`, never the
 *  `disabled` attribute — a disabled button leaves the tab order, and the
 *  reader who most needs the explanation is the one who could never reach it. */
export function NotYoursToChange() {
  return (
    <div style={wrap}>
      <Chip label="disabled — the OS holds the veto">
        <SettingsSwitch
          checked={false}
          label="Animations are off because your system asks for reduced motion"
          onToggle={noop}
          disabled
        />
      </Chip>
    </div>
  )
}

/** The switches a reader actually meets on the Settings page, stacked as a
 *  column so the track alignment reads. */
export function InUse() {
  return (
    <div style={{ ...wrap, flexDirection: 'column', gap: 20 }}>
      <Chip label="Animations — on">
        <SettingsSwitch checked label="Animations" onToggle={noop} />
      </Chip>
      <Chip label="Reduced motion — off">
        <SettingsSwitch checked={false} label="Reduced motion" onToggle={noop} />
      </Chip>
    </div>
  )
}
