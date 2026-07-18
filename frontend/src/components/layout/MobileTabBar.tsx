import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Five thumb-reachable core-loop destinations. Labels reuse the existing nav
// keys; secondary links (Updates, Admin, profile, logout, theme) live behind a
// More affordance per the design issue (#495) — not here.
type TabKey = 'nav.home' | 'nav.tasks' | 'nav.praxis' | 'nav.players' | 'nav.factions'
const TABS: { to: string; key: TabKey; end?: boolean }[] = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/tasks', key: 'nav.tasks' },
  { to: '/praxes', key: 'nav.praxis' },
  { to: '/leaderboard', key: 'nav.players' },
  { to: '/factions', key: 'nav.factions' },
]

export default function MobileTabBar() {
  const { t } = useTranslation('common')
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex"
      style={{
        zIndex: 10,
        background: 'var(--color-nav-bg)',
        backdropFilter: 'blur(var(--nav-blur))',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ to, key, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 text-center font-body py-2"
          style={({ isActive }) => ({
            fontSize: 'var(--text-lg)',
            textDecoration: 'none',
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            borderTop: isActive ? '2px solid var(--color-text-primary)' : '2px solid transparent',
          })}
        >
          {t(key)}
        </NavLink>
      ))}
    </nav>
  )
}
