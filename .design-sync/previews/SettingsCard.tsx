// SettingsCard preview cells — the Settings chassis' section card (#2154): a
// spectrum rule across the top, a heading, an optional lead, and rows.
//
// THIS IS THE DROP-IN CONTRACT. A sibling section (#1047, #2155, #2156, #2157,
// #2158) is a file that returns one of these, adds itself to SETTINGS_SECTIONS
// in pages/Settings.tsx, and touches nothing else. Both the anchor the rail
// scrolls to and the scroll offset that clears the sticky NavBar live in here,
// so no section can forget either.
import { SettingsCard, SettingsRow, SettingsSwitch } from 'worldzero-frontend'
import { noop } from './_fixtures'

const wrap: React.CSSProperties = {
  background: 'var(--color-bg-page)', padding: 24, maxWidth: 760 }

/** The plain card as every section wears it: spectrum rule, heading, lead, rows. */
export function Section() {
  return (
    <div style={wrap}>
      <SettingsCard
        sectionId="sec-appearance"
        title="Appearance"
        lead="How World Zero looks and moves on this device. These live in your browser, not your account."
      >
        <SettingsRow title="Animations" help="Ornament and motion across the site.">
          <SettingsSwitch checked label="Animations" onToggle={noop} />
        </SettingsRow>
        <SettingsRow title="Reduced motion" help="Keep transitions to a minimum." last>
          <SettingsSwitch checked={false} label="Reduced motion" onToggle={noop} />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

/** No lead — the heading sits straight on the rows. */
export function WithoutLead() {
  return (
    <div style={wrap}>
      <SettingsCard sectionId="sec-account" title="Account">
        <SettingsRow title="Email" help="cartographer@worldzero.example" last>
          <span style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary, #9ca3af)' }}>
            Verified
          </span>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

/** The danger dressing (#2161's delete-account card): a warning veil and edge,
 *  and NO spectrum rule — the edge is already carrying the warning, so drawing
 *  both would say it twice. */
export function DangerTone() {
  return (
    <div style={wrap}>
      <SettingsCard
        sectionId="sec-danger"
        title="Delete account"
        lead="This removes your account, your characters, and everything they posted. It cannot be undone."
        tone="danger"
      >
        <SettingsRow
          title="Delete this account"
          help="You will be asked to type your username to confirm."
          last
        >
          <button
            type="button"
            className="font-body"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-danger-edge, #dc2626)',
              background: 'transparent',
              color: 'var(--color-danger-edge, #dc2626)',
              fontSize: 'var(--text-content)',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

/** Two cards stacked, which is what the pane actually renders — the spectrum
 *  rule reads as the repeating mark down the page. */
export function StackedInPane() {
  return (
    <div style={{ ...wrap, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SettingsCard sectionId="sec-appearance-2" title="Appearance">
        <SettingsRow title="Animations" help="Ornament and motion across the site." last>
          <SettingsSwitch checked label="Animations" onToggle={noop} />
        </SettingsRow>
      </SettingsCard>
      <SettingsCard sectionId="sec-cookies-2" title="Cookies">
        <SettingsRow title="Analytics" help="Anonymous counts of which pages get read." last>
          <SettingsSwitch checked={false} label="Analytics" onToggle={noop} />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
