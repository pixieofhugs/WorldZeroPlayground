import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { useFormFactor } from '../hooks/useFormFactor'
import DefaultSettings from './settings/mobileArchetypes/DefaultSettings'

/**
 * Settings (#520) — a MOBILE-only surface. Desktop keeps its NavBar controls
 * (theme, logout) untouched, so on desktop this route simply redirects home;
 * there is no new desktop settings page. On a phone it renders the Default (na)
 * settings reflow with real controls only (ADR-0035): account header, character
 * management, the reused dark-mode toggle, and sign out.
 */
export default function Settings() {
  const formFactor = useFormFactor()
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  if (formFactor !== 'mobile') {
    return <Navigate to="/" replace />
  }

  return (
    <DefaultSettings
      character={user?.character ?? null}
      dark={theme === 'dark'}
      onToggleTheme={toggle}
      onSignOut={signOut}
    />
  )
}
