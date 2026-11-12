import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { SignInSheet } from './SignInOptions'
import { useSidebarPanels } from '../hooks/useSidebarPanels'
import PendingBadge from './layout/PendingBadge'

interface NavLinkSpec {
  readonly to: string
  readonly label: string
  readonly end?: boolean
  /** Unanswered obligations behind this link. Only `/updates` has any. */
  readonly pending?: number
  /**
   * Replaces the accessible name when a badge is carrying meaning visually.
   * Must still CONTAIN the visible label, or voice control loses the link.
   */
  readonly accessibleName?: string
}

export default function NavBar() {
  const { t } = useTranslation('common')
  // Publish the bar's real height as `--navbar-h` (#3296): it is 56px on one row
  // and ~70px when it wraps at 600-767px, and sticky/scroll-margin offsets read it.
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = navRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement.style
    const set = () => root.setProperty('--navbar-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.removeProperty('--navbar-h')
    }
  }, [])
  const { user } = useAuth()
  const { adminMode, toggleAdminMode } = useAdminMode()
  /**
   * The nav link carries the pending count too (#1457): 768-1023px has no rail
   * to badge, and it matches the phone's bell. Same fetch as the rail (#1344).
   * Two read-only pointers at one number is not ADR-0070's forbidden duplication.
   */
  const { pending_requests_count: pendingCount } = useSidebarPanels()
  const [signInOpen, setSignInOpen] = useState(false)

  const links: readonly NavLinkSpec[] = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/tasks', label: t('nav.tasks') },
    { to: '/praxis', label: t('nav.praxis') },
    { to: '/leaderboard', label: t('nav.players') },
    { to: '/factions', label: t('nav.factions') },
    {
      to: '/updates',
      label: t('nav.updates'),
      pending: pendingCount,
      accessibleName:
        pendingCount > 0 ? t('nav.updatesWithPending', { count: pendingCount }) : undefined,
    },
  ]

  return (
    <nav
      ref={navRef}
      className="sticky top-0"
      style={{
        zIndex: 10,
        background: 'var(--color-nav-bg)',
        backdropFilter: 'blur(var(--nav-blur))',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background 150ms',
      }}
    >
      {/* `min-h-14`: wraps at 600-767px (#3182). Shares `ShellContent`'s width cap (#1562). */}
      <div className="max-w-[var(--shell-max-width)] mx-auto px-4 sm:px-6 min-h-14 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 lg:gap-x-6">
        <NavLink to="/" className="shrink-0 leading-none" style={{ textDecoration: 'none' }}>
          <span
            className="font-display italic"
            style={{
              fontSize: 'var(--text-content)',
              color: 'var(--color-text-primary)',
              display: 'inline-block',
              borderBottom: '2px solid transparent',
              // A 2px background band is the rule, so the frost shows through (#3100);
              // the four-stop cut, as seven don't read at 2px (ADR-0066).
              backgroundImage: 'var(--faction-default-total-rainbow)',
              backgroundSize: '100% 2px',
              backgroundPosition: 'bottom',
              backgroundRepeat: 'no-repeat',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: lead between the wordmark and the rainbow rule drawn by the 2px backgroundSize band; a rung detaches the rule.
              paddingBottom: 2,
            }}
          >
            {t('brand')}
          </span>
        </NavLink>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:gap-x-5 flex-1 list-none">
          {links.map(({ to, label, end, pending, accessibleName }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                aria-label={accessibleName}
                // Flex only with a badge, so the baseline is untouched otherwise.
                className={pending ? 'nav-link inline-flex items-center gap-1' : 'nav-link'}
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  borderBottom: isActive ? '1.5px solid var(--color-text-primary)' : '1.5px solid transparent',
                })}
              >
                {label}
                <PendingBadge count={pending ?? 0} />
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

        {user?.is_admin && (
          <button
            onClick={toggleAdminMode}
            title={adminMode ? t('nav.adminMode.disableTitle') : t('nav.adminMode.enableTitle')}
            className="label-caption"
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

        {/* Desktop way in to Settings (#2154). Signed in only: it's a `ProtectedRoute`. */}
        {user && (
          <NavLink
            to="/settings"
            className="label-caption"
            /* The e2e suite's proof of a session (#2761); guarded by
               `e2eAnchors.test.ts` and `navSettingsSlot.test.tsx`. */
            data-testid="nav-settings"
            style={({ isActive }) => ({
              textDecoration: 'none',
              padding: 'var(--space-xs) var(--space-sm)',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              transition: 'color 150ms',
            })}
          >
            {t('settings.open')}
          </NavLink>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              {user.character ? (
                /* A name leads to the person (#2354). */
                <NavLink
                  to={`/characters/${user.character.id}`}
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
              {/* Sign out lives in Settings' Account card (#2155). */}
            </>
          ) : (
            /* One button opens the provider choice (#1773). */
            <>
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="btn-primary"
                aria-haspopup="dialog"
                aria-expanded={signInOpen}
              >
                {t('nav.login')}
              </button>
              <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
