import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { SignInSheet } from './SignInOptions'
import { useSidebarPanels } from '../hooks/useSidebarPanels'
import { useTheme } from '../hooks/useTheme'
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
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { adminMode, toggleAdminMode } = useAdminMode()
  const dark = theme === 'dark'
  /**
   * WHY THE NAV LINK CARRIES THE PENDING COUNT TOO (#1457)
   * ------------------------------------------------------
   * Three reasons, and the second is the one that makes it necessary rather
   * than merely tidy.
   *
   * 1. After ADR-0070 the Requests queue on `/updates` is the ONLY surface an
   *    unanswered obligation can be answered on. This is the desktop's one
   *    permanent route to it, on every route; a plain word pointing at the
   *    place where someone is waiting on you undersells the place.
   * 2. It closes a band the sidebar handle cannot reach. `SidebarColumn` is
   *    `hidden lg:block` and `ShellContent` gates it on a signed-in user, so a
   *    signed-in player between 768px and 1023px gets this bar and NO rail —
   *    neither handle state exists to badge. That width had no pending-request
   *    signal at all, in either sidebar state.
   * 3. Parity with the phone, where the bell in `MobileHeader` — the same
   *    nav-level entry to the same page — has been badged since #572.
   *
   * It costs nothing: `SidebarProvider` sits above `Layout` (#1344), so this is
   * a fourth consumer of one existing fetch, not a fourth request. Guests read
   * 0 and see no badge.
   *
   * At >=1024px the count now appears twice — here and on the rail's handle.
   * That is NOT the duplication ADR-0070 forbids: those are two live accept
   * buttons for one obligation, able to disagree. These are two read-only
   * pointers at one number from one subscription, which cannot.
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
      className="sticky top-0"
      style={{
        zIndex: 10,
        background: 'var(--color-nav-bg)',
        backdropFilter: 'blur(var(--nav-blur))',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background 150ms',
      }}
    >
      {/* Shares `ShellContent`'s cap, not a number of its own (#1562). At
          `max-w-5xl` (1024px) this bar was up to ~576px narrower than the page
          region beneath it on every route; one token is what keeps them
          agreeing. The horizontal padding is still the bar's own — matching the
          page's 40px gutter is a separate call the ruling did not make. */}
      <div className="max-w-[var(--shell-max-width)] mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
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
          {links.map(({ to, label, end, pending, accessibleName }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                aria-label={accessibleName}
                // The badge sits INSIDE the link, so the link has to become a
                // flex line to hold it — but only when there is a badge, so the
                // other five keep their plain inline box and the row's baseline
                // is untouched while nothing is pending.
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

        {/* Admin mode toggle */}
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

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="label-caption"
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
                /* The name is the only always-visible answer to "which
                   character am I carrying", and a name leads to the person
                   (#2354). It used to lead to `/` — a second home link beside
                   the wordmark's, titled with a switcher promise that now lives
                   on the home page alone. Same destination as the rail's name
                   link, which had it right. */
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
              <button onClick={signOut} className="btn-outline" style={{ padding: 'var(--space-xs) var(--space-md)' }}>
                {t('nav.logout')}
              </button>
            </>
          ) : (
            /* One button, two ways in (#1773) — so it opens the choice rather
               than picking a provider on the player's behalf. */
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
