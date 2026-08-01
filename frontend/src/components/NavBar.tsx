import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { loginWithGoogle } from '../api/auth'
import { useTheme } from '../hooks/useTheme'

export default function NavBar() {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { adminMode, toggleAdminMode } = useAdminMode()
  const dark = theme === 'dark'

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/tasks', label: t('nav.tasks') },
    { to: '/praxis', label: t('nav.praxis') },
    { to: '/leaderboard', label: t('nav.players') },
    { to: '/factions', label: t('nav.factions') },
    { to: '/updates', label: t('nav.updates') },
  ]

  return (
    <nav
      className="sticky top-0"
      style={{
        zIndex: 10,
        background: 'var(--color-nav-bg)',
        backdropFilter: 'blur(var(--nav-blur))',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background 150ms',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
        {/* Wordmark — Lora italic with rainbow gradient underline */}
        <NavLink to="/" className="shrink-0 leading-none" style={{ textDecoration: 'none' }}>
          <span
            className="font-display italic"
            style={{
              fontSize: 'var(--text-content)',
              color: 'var(--color-text-primary)',
              display: 'inline-block',
              borderBottom: '2px solid transparent',
              // The page ground masks all but the bottom 2px, so the second
              // layer IS the wordmark's rule. It reads the spectrum's four-stop
              // cut (#1220, ADR-0066) rather than a ramp of its own: a 2px band
              // under a short word cannot spend seven stops legibly, which is
              // what --faction-default-total-rainbow exists for.
              backgroundImage: 'linear-gradient(var(--color-bg-page), var(--color-bg-page)), var(--faction-default-total-rainbow)',
              backgroundSize: '100% calc(100% - 2px), 100% 2px',
              backgroundPosition: 'top, bottom',
              backgroundRepeat: 'no-repeat',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the wordmark and the rainbow rule drawn by the 2px backgroundSize band; a rung detaches the rule.
              paddingBottom: 2,
            }}
          >
            {t('brand')}
          </span>
        </NavLink>

        {/* Nav links */}
        <ul className="flex gap-5 flex-1 list-none">
          {links.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className="nav-link"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderBottom: isActive ? '1.5px solid var(--color-text-primary)' : '1.5px solid transparent',
                })}
              >
                {label}
              </NavLink>
            </li>
          ))}
          {user?.is_admin && (
            <li>
              <NavLink
                to="/admin"
                className="nav-link"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderBottom: isActive ? '1.5px solid var(--color-text-primary)' : '1.5px solid transparent',
                })}
              >
                {t('nav.admin')}
              </NavLink>
            </li>
          )}
        </ul>

        {/* Admin mode toggle */}
        {user?.is_admin && (
          <button
            onClick={toggleAdminMode}
            title={adminMode ? t('nav.adminMode.disableTitle') : t('nav.adminMode.enableTitle')}
            className="eyebrow"
            style={{
              background: 'none',
              border: adminMode ? '1.5px solid var(--color-text-primary)' : '1.5px solid transparent',
              cursor: 'pointer',
              padding: 'var(--space-xs) var(--space-sm)',
              color: adminMode ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              transition: 'color 150ms, border-color 150ms',
              borderRadius: 2,
            }}
          >
            {t('nav.adminMode.badge')}
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="eyebrow"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--space-xs) var(--space-sm)',
            color: 'var(--color-text-tertiary)',
            transition: 'color 150ms',
          }}
        >
          {dark ? t('nav.themeToggle.toLight') : t('nav.themeToggle.toDark')}
        </button>

        {/* User area */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              {user.character ? (
                <NavLink
                  to="/"
                  end
                  title={t('nav.fieldDeskTitle')}
                  className="nav-link transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {user.character.display_name}
                </NavLink>
              ) : (
                <NavLink
                  to="/characters/create"
                  className="nav-link transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.createCharacter')}
                </NavLink>
              )}
              <button onClick={signOut} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <button onClick={loginWithGoogle} className="btn-primary">
              {t('nav.login')}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
