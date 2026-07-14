import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { loginWithGoogle, logout } from '../api/auth'
import { useTheme } from '../hooks/useTheme'

export default function NavBar() {
  const { t } = useTranslation('common')
  const { user, refetch } = useAuth()
  const { theme, toggle } = useTheme()
  const { adminMode, toggleAdminMode } = useAdminMode()
  const dark = theme === 'dark'

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/tasks', label: t('nav.tasks') },
    { to: '/praxes', label: t('nav.praxis') },
    { to: '/leaderboard', label: t('nav.players') },
    { to: '/factions', label: t('nav.factions') },
    { to: '/updates', label: t('nav.updates') },
  ]

  const handleLogout = async () => {
    await logout()
    await refetch()
  }

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
              fontSize: 19,
              color: 'var(--color-text-primary)',
              display: 'inline-block',
              borderBottom: '2px solid transparent',
              backgroundImage: 'linear-gradient(var(--color-bg-page), var(--color-bg-page)), linear-gradient(90deg, var(--underline-3), var(--underline-2), var(--underline-6), var(--underline-5))',
              backgroundSize: '100% calc(100% - 2px), 100% 2px',
              backgroundPosition: 'top, bottom',
              backgroundRepeat: 'no-repeat',
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
              padding: '2px 6px',
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
            padding: '2px 6px',
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
              <button onClick={handleLogout} className="btn-outline" style={{ padding: '0.25rem 0.75rem' }}>
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
