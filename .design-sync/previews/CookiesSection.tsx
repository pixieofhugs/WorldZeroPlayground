// CookiesSection preview cell — Cookies and local storage (#2156). The card IS
// the policy: one real cookie against ten storage entries, every key imported
// from its writer so a rename renames itself here.
//
// All three consent switches render and all three are INERT (owner ruling,
// 2026-08-17) — the SettingsSwitch disabled exception used for its second
// sanctioned reason: not a control the reader cannot use, but a readout of a
// decision already made. Each carries its reason in the accessible name.
//
// The storage inventory sits behind a disclosure held in the section's own
// useState, so the closed state is what a static capture can show; there is no
// prop to open it from out here.
import { CookiesSection } from 'worldzero-frontend'

export function Cookies() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <CookiesSection sectionId="sec-cookies" />
    </div>
  )
}
