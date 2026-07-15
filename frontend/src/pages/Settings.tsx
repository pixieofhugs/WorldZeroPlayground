import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { logout } from '../api/auth'
import { useTheme } from '../hooks/useTheme'
import { useFormFactor } from '../hooks/useFormFactor'
import DefaultSettings from './settings/mobileArchetypes/DefaultSettings'

/**
 * Sign-out action, extracted so the wiring is unit-testable in a DOM-less env:
 * end the session via the existing auth client, then refetch so the app drops
 * back to the logged-out state. No new auth logic — `logout` is reused verbatim.
 */
export function runSignOut(logout: () => Promise<void>, refetch: () => Promise<void>): () => Promise<void> {
  return async () => {
    await logout()
    await refetch()
  }
}

/**
 * Settings (#520) — a MOBILE-only surface. Desktop keeps its NavBar controls
 * (theme, logout) untouched, so on desktop this route simply redirects home;
 * there is no new desktop settings page. On a phone it renders the Default (na)
 * settings reflow with real controls only (ADR-0035): account header, character
 * management, the reused dark-mode toggle, and sign out.
 */
export default function Settings() {
  const formFactor = useFormFactor()
  const { user, refetch } = useAuth()
  const { theme, toggle } = useTheme()

  if (formFactor !== 'mobile') {
    return <Navigate to="/" replace />
  }

  return (
    <DefaultSettings
      character={user?.character ?? null}
      dark={theme === 'dark'}
      onToggleTheme={toggle}
      onSignOut={runSignOut(logout, refetch)}
    />
  )
}
