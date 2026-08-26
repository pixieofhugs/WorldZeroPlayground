// AccountSection preview cell — Account (#2155): the two per-ACCOUNT facts, the
// carried life, and the way out. This section is why the NavBar no longer has a
// sign-out button.
//
// It reads `useAuth()` for everything it draws, so in the preview harness it
// renders against the provider's mock authed UA user — the avatar's spectrum
// ring, the faction·level line, and the character link are that user's. The
// provider (#1400) supplies AuthContext directly rather than faking a request,
// so this is the section's real authed state, not a login gate.
//
// ONE CELL: every row is derived from the one auth user, so a second cell would
// be the same card again.
import { AccountSection } from 'worldzero-frontend'

export function Account() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <AccountSection sectionId="sec-account" />
    </div>
  )
}
