// AppearanceSection preview cell — Appearance (#2154), two device-local rows
// with no backend behind either. Dark mode reuses the same one `useTheme()`
// cell the NavBar reads (#701); Animations is `useMotion()`, built to the same
// shape.
//
// ONE CELL ON PURPOSE. Both switches read live hooks (theme, motion, and the
// OS's reduced-motion query), so there is no prop to pin a second state with —
// a "dark" cell and a "light" cell would render identically and trip the
// variants-identical check. The two-state sweep lives on SettingsSwitch, which
// is presentational and can actually be posed.
import { AppearanceSection } from 'worldzero-frontend'

export function Appearance() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <AppearanceSection sectionId="sec-appearance" />
    </div>
  )
}
